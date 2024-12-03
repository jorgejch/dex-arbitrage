import { BaseContract } from "./baseContract.js";
import { Opportunity, ContractType } from "../types.js";
import { logger, exponentialBackoffDelay } from "../common.js";

import {
  Alchemy,
  Contract,
  Wallet,
  TransactionRequest,
  TransactionResponse
} from "alchemy-sdk";

const INITIATE_FLASHLOAN_SIG = "initiateFlashLoan";

/**
 * A class to interact with the AFLAB (FlashLoanArbitrage) PancakeSwap V3 smart contract.
 */
class AflabContract extends BaseContract {
  private readonly wallet: Wallet;

  /**
   * Creates an instance of the AFLAB contract.
   *
   * @param address The address of the AFLAB contract
   * @param abi The ABI of the AFLAB contract
   * @param alchemy The Alchemy SDK instance
   * @param wallet The provider instance
   * @param network The network ID
   */
  constructor(address: string, abi: any, alchemy: Alchemy, wallet: Wallet, network: number) {
    super(address, abi, ContractType.AFLAB, alchemy, network);
    this.wallet = wallet;
  }

  protected async createContract(): Promise<void> {
    this.contract = new Contract(
      this.address,
      this.abi,
      await this.alchemy.config.getProvider()
    );
  }

  protected async listenForEvents(contract: Contract): Promise<void> {
    contract.on("SwapExecuted", (...args: any[]) => {
      logger.info(
        `Swap executed: ${JSON.stringify(args)}`,
        this.constructor.name
      );
    });
    contract.on("FlashloanError", (...args: any[]) => {
      logger.info(
        `Flashloan error: ${JSON.stringify(args)}`,
        this.constructor.name
      );
    });
    contract.on("SwapError", (...args: any[]) => {
      logger.info(`Swap error: ${JSON.stringify(args)}`, this.constructor.name);
    });
    contract.on("ArbitrageConcluded", (...args: any[]) => {
      logger.info(
        `Arbitrage concluded: ${JSON.stringify(args)}`,
        this.constructor.name
      );
    });
  }

  protected getArbitInfo(opportunity: Opportunity): any {
    const { swap1, swap2, swap3, estimatedGasCost } = opportunity.arbitInfo;

    if (
      !swap1 ||
      !swap1.tokenIn ||
      !swap1.tokenOut ||
      !swap1.poolFee ||
      !swap1.amountOutMinimum
    ) {
      throw new Error("Missing value for component swap1");
    }

    if (
      !swap2 ||
      !swap2.tokenIn ||
      !swap2.tokenOut ||
      !swap2.poolFee ||
      !swap2.amountOutMinimum
    ) {
      throw new Error("Missing value for component swap2");
    }

    if (
      !swap3 ||
      !swap3.tokenIn ||
      !swap3.tokenOut ||
      !swap3.poolFee ||
      !swap3.amountOutMinimum
    ) {
      throw new Error("Missing value for component swap3");
    }

    if (!estimatedGasCost) {
      throw new Error("Missing value for estimatedGasCost");
    }

    return {
      swap1: {
        tokenIn: swap1.tokenIn.id, // Actual token address
        tokenOut: swap1.tokenOut.id, // Actual token address
        poolFee: Number(swap1.poolFee.toFixed(0)), // e.g., 3000 represents a 0.3%
        amountOutMinimum: "0x0", // uint256
      },
      swap2: {
        tokenIn: swap2.tokenIn.id,
        tokenOut: swap2.tokenOut.id,
        poolFee: Number(swap2.poolFee.toFixed(0)),
        amountOutMinimum: "0x0",
      },
      swap3: {
        tokenIn: swap3.tokenIn.id,
        tokenOut: swap3.tokenOut.id,
        poolFee: Number(swap3.poolFee.toFixed(0)),
        amountOutMinimum: "0x0",
      },
      extraCost: "0x0", // uint256
    };
  }

  private async getTransactionRequest(
    from: string,
    to: string,
    arbitInfo: any,
    inputAmount: string
  ): Promise<TransactionRequest> {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    const req: TransactionRequest = {
      from: from,
      to: to,
      data: this.contract!.interface.encodeFunctionData(INITIATE_FLASHLOAN_SIG, [
        arbitInfo,
        inputAmount,
      ]),
      value: "0x0",
      chainId: this.network,
      gasLimit: 10000000, // Standard gas limit,
      gasPrice: (await this.alchemy.core.getGasPrice()).add(1000000000), // 1 Gwei above the current gas price
    };

    return req;
  }

  public async executeOpportunity(opportunity: Opportunity): Promise<void> {
    if (!this.contract) {
      logger.error(
        `AFLAB contract not initialized. Cannot execute opportunity.`,
        this.constructor.name
      );
      return;
    }
    let arbitInfo;

    try {
      arbitInfo = this.getArbitInfo(opportunity);
    } catch (error) {
      logger.error(
        `Invalid arbitrage opportunity: ${error}`,
        this.constructor.name
      );
      return;
    }
    logger.debug(
      `Arbitrage opportunity: ${JSON.stringify(arbitInfo)}`,
      this.constructor.name
    );

    let req: TransactionRequest; // transaction request
    try {
      req = await this.getTransactionRequest(
        this.wallet.address,
        this.address,
        arbitInfo,
        opportunity.tokenAIn.toString()
      );
    } catch (error) {
      logger.error(
        `Error constructing transaction request: ${error}`,
        this.constructor.name
      );
      // Print stack trace
      if (error instanceof Error && error.stack) {
        logger.error(error.stack, this.constructor.name);
      }
      return;
    }

    logger.debug(
      `Transaction request: ${JSON.stringify(req)}`,
      this.constructor.name
    );

    let txResponse: TransactionResponse;
    try {
      txResponse = await this.sendTransactionWithRetry(req);
    } catch (error) {
      logger.error(`Transaction error: ${error}`, this.constructor.name);
      // Print stack trace
      if (error instanceof Error && error.stack) {
        logger.error(error.stack, this.constructor.name);
      }
      return;
    }
    logger.info(
      `Transaction Concluded. Response: ${JSON.stringify(txResponse)}`,
      this.constructor.name
    );
  }

  private async sendTransactionWithRetry(
    tx: TransactionRequest,
    retries: number = 20,
    delayMs: number = 1000
  ): Promise<any> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const signedTransaction = await this.wallet.signTransaction(tx);
        const txResponse = await this.alchemy.transact.sendTransaction(signedTransaction);
        logger.info(
          `Transaction sent. Hash: ${txResponse.hash}`,
          this.constructor.name
        );
        logger.debug(
          `Transaction nonce: ${txResponse.nonce}\n` +
            `\t gasPrice: ${txResponse.gasPrice?.toNumber()}\n` +
            `\t gasLimit: ${txResponse.gasLimit.toNumber()}\n` +
            `\t maxFeePerGas: ${txResponse.maxFeePerGas?.toNumber()}\n` +
            `\t maxPriorityFeePerGas: ${txResponse.maxPriorityFeePerGas?.toNumber()}`,
          this.constructor.name
        );

        const receipt = await txResponse.wait();
        logger.info(
          `Transaction confirmed in block ${receipt.blockNumber}`,
          this.constructor.name
        );
        return receipt;
      } catch (error) {
        // Check error variable type and existance
        if (error instanceof Error && error.stack && error.message) {
          logger.error(error.stack, this.constructor.name);
        }

        let latestNonce = tx.nonce;
        if (
          (error as Error).message.includes("already_exists: already known")
        ) {
          logger.warn(
            `Attempt ${attempt + 1}: Transaction already exists. Retrying...`,
            this.constructor.name
          );

          // Fetch the latest nonce
          latestNonce = await this.alchemy.core.getTransactionCount(
            this.wallet.address,
            "pending"
          );
          tx.nonce = latestNonce;
          logger.info(
            `Updated tx nonce to: ${latestNonce}`,
            this.constructor.name
          );
        } else {
          logger.warn(
            `Attempt ${attempt + 1} error: ${JSON.stringify(error)}`,
            this.constructor.name
          );
        }

        await exponentialBackoffDelay(delayMs, attempt);
        if (attempt === retries) throw error; // Re-throw after final attempt
      }
    }
    throw new Error("Transaction failed after multiple attempts");
  }
}

export { AflabContract };
