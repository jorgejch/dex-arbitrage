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
   * Retrieves a list of possible intermediary tokens B (that are not A or C).
   * Token B participates in pools with tokens A and token C.
   *
   * @param tokenASymbol - Symbol of token A.
   * @param tokenCSymbol - Symbol of token C.
   * @returns An array of tokens satisfying the criteria.
   */
  public getPossibleIntermediaryTokens(
    tokenASymbol: string,
    tokenCSymbol: string
  ): Token[] {
    const poolsA = this.inputTokenSymbolIndex.get(tokenASymbol);
    const poolsC = this.inputTokenSymbolIndex.get(tokenCSymbol);

    if (poolsA === undefined || poolsC === undefined) {
      return [];
    }

    const possibleBs: Set<string> = new Set();

    // Find all possible token Bs that are not A or C in the pools paired with A
    for (const pool of poolsA) {
      for (const token of pool.inputTokens) {
        if (token.symbol !== tokenASymbol && token.symbol !== tokenCSymbol) {
          possibleBs.add(token.symbol);
        }
      }
    }

    const result: Token[] = [];

    // Find all possible token Bs that are not A or C in the pools paired with C
    for (const pool of poolsC) {
      for (const token of pool.inputTokens) {
        if (token.symbol !== tokenASymbol && token.symbol !== tokenCSymbol && possibleBs.has(token.symbol)) {
          result.push(token);
        }
      }
    }

    return result;
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
  public abstract processSwap(
    swap: BaseSwap,
    lastPoolSqrtPriceX96: bigint
  ): Promise<void>;

  /**
   * Initialize the DEX.
   */
  public abstract initialize(): Promise<void>;
}

export { BaseDex };
