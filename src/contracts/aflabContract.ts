// Import necessary modules and dependencies
import { BaseContract } from "./baseContract.js";
import { WebSocketManager } from "../ws.js";
import { Token, Opportunity, ContractType } from "../types.js";
import { logger } from "../common.js";

import { ethers, Wallet } from "ethers";
import { Decimal } from "decimal.js";

/**
 * A class to interact with the AFLAB (FlashLoanArbitrage) PancakeSwap V3 smart contract.
 */
class AflabContract extends BaseContract {
  private readonly httpProvider: ethers.JsonRpcProvider;
  private readonly wallet: ethers.Signer;

  /**
   * Constructor for AflabContract
   * @param address The address of the AFLAB smart contract
   * @param wsManager The WebSocketManager instance
   * @param abi The ABI of the AFLAB smart contract
   * @param httpProvider The HTTP provider for blockchain interaction
   * @param wallet The signer for transactions
   */
  constructor(
    address: string,
    abi: any,
    wsManager: WebSocketManager,
    httpProvider: ethers.JsonRpcProvider,
    wallet: Wallet
  ) {
    super(address, abi, ContractType.AFLAB, wsManager);
    this.httpProvider = httpProvider;
    this.wallet = wallet;
  }

  protected createContract(): void {
    try {
      this.contract = new ethers.Contract(this.address, this.abi, this.wallet);
    } catch (error) {
      logger.error(
        `Error creating AFLAB ethers.js contract: ${error}`,
        this.constructor.name
      );
    }
  }

  protected customInit(): void {
    // Initialization logic if needed
  }

  protected listenForEvents(contract: ethers.Contract): void {
    contract.on("ArbitrageConcluded", (...args: any[]) => {
      logger.info(`Arbitrage concluded: ${args}`);
    });
  }

  /**
   * Executes a flash loan arbitrage by calling the initiateFlashLoan function
   * on the AFLAB smart contract.
   *
   * @param opportunity The arbitrage opportunity to execute
   */
  public async executeOpportunity(opportunity: Opportunity): Promise<void> {
    if (!this.contract) {
      throw new Error("Contract is not initialized");
    }

    try {
      const data = {
        arbitInfo: {
          swap1: {
            tokenIn: opportunity.arbitInfo.swap1?.tokenIn.id,
            tokenOut: opportunity.arbitInfo.swap1?.tokenOut.id,
            poolFee: opportunity.arbitInfo.swap1?.poolFee.toNumber(),
            amountOutMinimum: opportunity.arbitInfo.swap1?.amountOutMinimum,
          },
          swap2: {
            tokenIn: opportunity.arbitInfo.swap2?.tokenIn.id,
            tokenOut: opportunity.arbitInfo.swap2?.tokenOut.id,
            poolFee: opportunity.arbitInfo.swap2?.poolFee.toNumber(),
            amountOutMinimum: opportunity.arbitInfo.swap2?.amountOutMinimum,
          },
          swap3: {
            tokenIn: opportunity.arbitInfo.swap3?.tokenIn.id,
            tokenOut: opportunity.arbitInfo.swap3?.tokenOut.id,
            poolFee: opportunity.arbitInfo.swap3?.poolFee.toNumber(),
            amountOutMinimum: opportunity.arbitInfo.swap3?.amountOutMinimum,
          },
          estimatedGasCost: opportunity.arbitInfo.estimatedGasCost.toNumber(),
        },
      };

      // Call the initiateFlashLoan function from the contract's ABI
      const tx = await this.contract.initiateFlashLoan(
        ["tuple", "uint256"],
        [data, opportunity.tokenAIn],
        opportunity.tokenAIn
      );

      logger.info(
        `Flash loan arbitrage transaction sent: ${tx.hash}`,
        this.constructor.name
      );

      // Wait for the transaction to be mined
      const receipt = await tx.wait();

      logger.info(
        `Transaction confirmed in block ${receipt.blockNumber}`,
        this.constructor.name
      );
    } catch (error) {
      logger.error(
        `Error executing arbitrage opportunity: ${error}`,
        this.constructor.name
      );
      throw error;
    }
  }

  /**
   * Gets the current balance of the contract.
   *
   * @returns The balance as a BigNumber
   */
  public async getBalance(): Promise<ethers.BigNumberish> {
    const balance = await this.httpProvider.getBalance(this.address);
    return balance;
  }

  /**
   * Withdraws funds from the contract to the owner's address.
   *
   * @param amount The amount to withdraw
   */
  public async withdraw(amount: ethers.BigNumberish): Promise<void> {
    if (!this.contract) {
      throw new Error("Contract is not initialized");
    }

    const tx = await this.contract.withdraw(amount);
    await tx.wait();
    console.log(`Withdraw transaction hash: ${tx.hash}`);
  }

  /**
   * Approves a token for spending by the contract.
   *
   * @param tokenAddress The address of the token
   * @param amount The amount to approve
   */
  public async approveToken(
    token: Token,
    abi: any,
    amount: Decimal
  ): Promise<void> {
    const tokenContract = new ethers.Contract(token.id, abi, this.wallet);
    const tx = await tokenContract.approve(this.address, amount);
    await tx.wait();
    logger.info(
      `${token.symbol} spend approval for ${amount.toString()} transaction hash: ${tx.hash}`,
      this.constructor.name
    );
  }
}

export { AflabContract };
