import { BaseContract } from "./baseContract.js";
import { Opportunity, ContractType } from "../types.js";
import { logger, exponentialBackoffDelay } from "../common.js";

import {
  Alchemy,
  Contract,
  Wallet,
  TransactionRequest,
  TransactionResponse,
  BigNumber,
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
  constructor(
    address: string,
    abi: object[],
    alchemy: Alchemy,
    wallet: Wallet,
    network: number,
  ) {
    super(address, abi, ContractType.AFLAB, alchemy, network);
    this.wallet = wallet;
  }

  protected async createContract(): Promise<void> {
    this.contract = new Contract(
      this.address,
      this.abi,
      await this.alchemy.config.getWebSocketProvider()
    );
  }

  protected async listenForEvents(contract: Contract): Promise<void> {
    contract.on("SwapExecuted", (...args: unknown[]) => {
      logger.info(
        `Swap executed: ${JSON.stringify(args)}`,
        this.constructor.name
      );
    });
    contract.on("FlashloanError", (...args: unknown[]) => {
      logger.info(
        `Flashloan error: ${JSON.stringify(args)}`,
        this.constructor.name
      );
    });
    contract.on("FlashLoanSuccess", (...args: unknown[]) => {
      logger.info(
        `Flashloan executed: ${JSON.stringify(args)}`,
        this.constructor.name
      );
    });
    contract.on("ArbitrageConcluded", (...args: unknown[]) => {
      logger.info(
        `Arbitrage concluded: ${JSON.stringify(args)}`,
        this.constructor.name
      );
    });
  }

  protected getArbitInfo(opportunity: Opportunity): unknown {
    const { swap1, swap2, swap3, estimatedGasCost } = opportunity.arbitInfo;

    if (
      !(
        swap1?.tokenIn &&
        swap1.tokenOut &&
        swap1.poolFee &&
        swap1.amountOutMinimum
      )
    ) {
      throw new Error("Missing value for component swap1");
    }

    if (
      !swap2?.tokenIn ||
      !swap2.tokenOut ||
      !swap2.poolFee ||
      !swap2.amountOutMinimum
    ) {
      throw new Error("Missing value for component swap2");
    }

    if (
      !swap3?.tokenIn ||
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
        poolFee: swap1.poolFee.toNumber(), // e.g., 3000 represents a 0.3%
        amountOutMinimum: BigNumber.from(0), // uint256
      },
      swap2: {
        tokenIn: swap2.tokenIn.id,
        tokenOut: swap2.tokenOut.id,
        poolFee: swap2.poolFee.toNumber(),
        amountOutMinimum: BigNumber.from(0),
      },
      swap3: {
        tokenIn: swap3.tokenIn.id,
        tokenOut: swap3.tokenOut.id,
        poolFee: swap3.poolFee.toNumber(),
        amountOutMinimum: BigNumber.from(0),
      },
      extraCost: BigNumber.from(0), // uint256
    };
  }

  private async getTransactionRequest(
    from: string,
    to: string,
    arbitInfo: unknown,
    inputAmount: BigNumber
  ): Promise<TransactionRequest> {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    const req: TransactionRequest = {
      from: from,
      to: to,
      data: this.contract.interface.encodeFunctionData(
        INITIATE_FLASHLOAN_SIG,
        [arbitInfo, inputAmount]
      ),
      value: BigNumber.from(0),
      chainId: this.network,
      gasLimit: 500000, // default gas limit
      gasPrice: await this.alchemy.core.getGasPrice(),
      nonce: await this.alchemy.core.getTransactionCount(from, "pending"),
    };

    return req;
  }

  /**
   * Custom initialization logic.
   */
  protected async customInit(): Promise<void> {}

  /**
   * Executes an arbitrage opportunity.
   * @param opportunity The arbitrage opportunity to execute.
   * @returns A promise that resolves when the opportunity is executed.
   * @throws An error if the opportunity cannot be executed.
   */
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

    let req: TransactionRequest;
    try {
      req = await this.getTransactionRequest(
        this.wallet.address,
        this.address,
        arbitInfo,
        opportunity.tokenAIn
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
    retries: number = 3,
    delayMs: number = 1000
  ): Promise<any> {
    let txResponse: TransactionResponse | null = null;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const signedTransaction = await this.wallet.signTransaction(tx);
        txResponse =
          await this.alchemy.transact.sendTransaction(signedTransaction);
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
        break; // Exit retry loop on successful send
      } catch (error) {
        if (error instanceof Error && error.stack && error.message) {
          logger.error(error.stack, this.constructor.name);
        }
        logger.warn(
          `Attempt ${attempt} error sending transaction: ${JSON.stringify(error)}`,
          this.constructor.name
        );
        if (attempt === retries - 1) throw error; // Re-throw after final attempt
        tx.gasPrice = BigNumber.from(tx.gasPrice!).mul(1.1).toBigInt(); // Increase gas price by 10%
        await exponentialBackoffDelay(delayMs, attempt);
      }
    }

    if (!txResponse) {
      throw new Error("Failed to send transaction after multiple attempts");
    }

    try {
      const receipt = await txResponse.wait();
      logger.info(
        `Transaction confirmed in block ${receipt.blockNumber}`,
        this.constructor.name
      );
      logger.info(
        `Receipt: ${JSON.stringify(receipt.transactionHash)}`,
        this.constructor.name
      );
      return receipt;
    } catch (error) {
      // Transaction failed after being mined
      if (error instanceof Error && error.stack && error.message) {
        logger.error(error.stack, this.constructor.name);
      }
      logger.error(
        `Transaction failed after being mined: ${JSON.stringify(error)}`,
        this.constructor.name
      );
    }
  }
}

export { AflabContract };
