import { ContractType, Pool, Token, Fee } from "../types.js";
import { Contract } from "ethers";
import { WebSocketManager } from "../ws.js";
import { BaseContract } from "./baseContract.js";
import { logger } from "../common.js";
import { PSv3Swap } from "../swaps/psv3Swap.js";

/**
 * Represents a pool contract.
 */
class PoolContract extends BaseContract {
  private readonly pool: Pool;
  private readonly processSwap: (
    psv3Swap: PSv3Swap,
    lastPoolSqrtPriceX96: bigint
  ) => Promise<void>;
  private lastPoolSqrtPriceX96: bigint;

  /**
   * @param address The pool contract address
   * @param wsManager WebSocket Manager
   * @param abi The contract ABI
   * @param processSwapFunction Function to process Swap events
   */
  constructor(
    address: string,
    wsManager: WebSocketManager,
    abi: any,
    pool: Pool,
    processSwapFunction: (
      psv3Swap: PSv3Swap,
      lastPoolSqrtPriceX96: bigint
    ) => Promise<void>
  ) {
    super(address, wsManager, abi, ContractType.POOL);
    this.processSwap = processSwapFunction;
    this.pool = pool;
    this.lastPoolSqrtPriceX96 = BigInt(0);
  }

  private swapEventCallback(
    ...args: [
      string,
      string,
      bigint,
      bigint,
      bigint,
      bigint,
      number,
      bigint,
      bigint,
    ]
  ) {
    try {
      const [
        sender,
        recipient,
        amount0,
        amount1,
        sqrtPriceX96,
        liquidity,
        tick,
        protocolFeesToken0,
        protocolFeesToken1,
      ] = args;
      const poolContractAddress = this.address;
      const swap = new PSv3Swap(
        sender,
        recipient,
        amount0,
        amount1,
        sqrtPriceX96,
        liquidity,
        tick,
        protocolFeesToken0,
        protocolFeesToken1,
        poolContractAddress
      );

      /*
       * The first Swap caught is a sacrifice
       * in order to initialize lastPoolSqrtPriceX96
       */
      if (this.getLastPoolSqrtPriceX96() !== BigInt(0)) {
        this.processSwap(swap, this.lastPoolSqrtPriceX96);
      }

      // Keep track of the last pool price
      this.lastPoolSqrtPriceX96 = sqrtPriceX96;
    } catch (error) {
      logger.error(
        `Error processing swap event: ${error}`,
        this.constructor.name
      );
    }
  }

  /**
   * Custom initialization logic.
   */
  protected customInit(): void {}

  /**
   * Listen for Swap events emitted by the contract.
   *
   * @param contract The ethers.js contract instance
   */
  listenForEvents(contract: Contract): void {
    // Listen for Swap events (https://tinyurl.com/4nh7pcpj)
    if (!this.processSwap) {
      throw new Error("processSwap function is not defined");
    }
    contract.on("Swap", this.swapEventCallback.bind(this));
    logger.info(
      `Listening for Swap events on contract ${this.address}`,
      this.constructor.name
    );
  }

  public getPool(): Pool {
    if (!this.pool) {
      throw new Error("Pool is not defined");
    }
    return this.pool;
  }

  public getLastPoolSqrtPriceX96(): bigint {
    return this.lastPoolSqrtPriceX96;
  }

  public getInputTokens(): Array<Token> {
    return [this.pool.inputTokens[0], this.pool.inputTokens[1]];
  }

  /**
   * Get the pool fees.
   * 
   * @param amount The amount to calculate the fees for
   * @returns The pool fees
   */
  public getPoolFee(amount: bigint): bigint {
    // Sum all the Pools fees
    return this.pool.fees.reduce((acc, fee) => {
      const scaledFeePercentage = BigInt(Math.round(fee.feePercentage * 1e6));
      return acc + (amount * scaledFeePercentage) / BigInt(1e6);
    }, BigInt(0));
  }
}

export { PoolContract };
