import { WebSocketManager } from "./ws.js";
import { PSv3Subgraph } from "./subgraphs/psv3Subgraph.js";
import { Pool } from "./types.js";
import { PoolContract } from "./contracts/poolContract.js";
import abi from "./abis/pancakeSwapv3PoolAbi.js";
import { logger } from "./common.js";

/**
 * Represents a DEX.
 */
class Dex {
  private inputTokenSymbolIndex: Map<string, Pool[]>;
  private readonly contractsMap: Map<string, PoolContract>;
  private readonly subgraph: PSv3Subgraph;
  private initialized: boolean;
  private wsManager: WebSocketManager;
  private pools: Pool[];

  /**
   * @param subgraph The Graph Subgraph instance
   * @param wsManager WebSocket Manager
   */
  constructor(subgraph: PSv3Subgraph, wsManager: WebSocketManager) {
    this.inputTokenSymbolIndex = new Map<string, Pool[]>();
    this.subgraph = subgraph;
    this.initialized = false;
    this.wsManager = wsManager;
    this.contractsMap = new Map<string, PoolContract>();
    this.pools = [];
  }

  /**
   * Initialize the DEX.
   */
  public async initialize(): Promise<void> {
    try {
      this.subgraph.initialize();
    } catch (error) {
      logger.error(
        `Error initializing subgraph: ${error}`,
        this.constructor.name
      );
      throw error;
    }

    try {
      this.pools = await this.subgraph.getPools();
    } catch (error) {
      logger.error(`Error fetching pools: ${error}`, this.constructor.name);
      throw error;
    }

    logger.info(`Fetched ${this.pools.length} pools`, this.constructor.name);

    let poolCount = 0;

    for (const pool of this.pools) {
      logger.debug(`Creating pool # ${++poolCount}`, this.constructor.name);

      // Create and store a PoolContract instance for each pool
      const poolContract = new PoolContract(pool.id, this.wsManager, abi);
      this.contractsMap.set(pool.id, poolContract);

      // Initialize the contract instance
      try {
        poolContract.initialize();
      } catch (error) {
        logger.error(
          `Error initializing pool contract: ${error}`,
          this.constructor.name
        );
        throw error;
      }

      logger.info(
        `Initialized pool for contract: ${pool.id}`,
        this.constructor.name
      );

      // For each token in the pool, add the pool to the inputTokenSymbolIndex
      for (const token of pool.inputTokens) {
        if (!this.inputTokenSymbolIndex.has(token.symbol)) {
          this.inputTokenSymbolIndex.set(token.symbol, []);
        }
        this.inputTokenSymbolIndex.get(token.symbol)!.push(pool);
      }
    }

    this.initialized = true;
    logger.info("Initialized Dex", this.constructor.name);
  }

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
}

export { Dex };
