import { WebSocketManager } from "../ws.js";
import { Pool, Token } from "../types.js";
import { PoolContract } from "../contracts/poolContract.js";
import { BaseSwap } from "../swaps/baseSwap.js";
import { DexPoolSubgraph } from "../subgraphs/dexPoolSubgraph.js";
import { logger } from "../common.js";
/**
 * Abstract class representing a DEX.
 */
abstract class BaseDex {
  protected readonly contractsMap: Map<string, PoolContract>;
  protected inputTokenSymbolIndex: Map<string, Pool[]>;
  protected initialized: boolean;
  protected wsManager: WebSocketManager;
  protected pools: Pool[];
  protected subgraph: DexPoolSubgraph;

  /**
   * @param wsManager WebSocket Manager
   */
  constructor(wsManager: WebSocketManager, subgraph: DexPoolSubgraph) {
    this.subgraph = subgraph;
    this.inputTokenSymbolIndex = new Map<string, Pool[]>();
    this.initialized = false;
    this.wsManager = wsManager;
    this.contractsMap = new Map<string, PoolContract>();
    this.pools = [];
  }

  protected inferSwapDirection(
    amount0: number,
    amount1: number,
    token0: Token,
    token1: Token
  ): Token[] {
    if (amount0 > 0) {
      return [token0, token1];
    } else if (amount1 > 0) {
      return [token1, token0];
    } else {
      throw new Error("Invalid swap amounts");
    }
  }

  /**
   * Check if the DEX is initialized.
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get a list of pool contract addresses.
   */
  public getPoolAddresses(): string[] {
    return this.pools.map((pool) => pool.id);
  }

  /**
   * Get pools by input token symbol.
   * @param symbol The input token symbol
   * @returns A list of pools that have the input token symbol
   */
  public getPoolsByInputTokenSymbol(symbol: string): Pool[] {
    return this.inputTokenSymbolIndex.get(symbol) || [];
  }

  /**
   * Get a pool contract by address.
   * @param address The pool contract address
   * @returns The pool contract
   * @throws An error if the contract is not found
   */
  public getContract(address: string): PoolContract | undefined {
    if (!this.contractsMap.has(address)) {
      logger.warn(`Contract not found: ${address}`, this.constructor.name);
      throw new Error(`Contract not found: ${address}`);
    }
    return this.contractsMap.get(address);
  }

  /**
   * Process a swap event.
   *
   * @param swap The swap event
   */
  public abstract processSwap(swap: BaseSwap, lastPoolSqrtPriceX96: bigint): Promise<void>;

  /**
   * Initialize the DEX.
   */
  public abstract initialize(): Promise<void>;
}

export { BaseDex };
