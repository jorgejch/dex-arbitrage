import { BaseDex } from "./baseDex.js";
import { DexPoolSubgraph } from "../subgraphs/dexPoolSubgraph.js";
import { PSv3Swap } from "../swaps/psv3Swap.js";
import { Token } from "../types.js";
import { logger, isPriceImpactSignificant } from "../common.js";
import { WebSocketManager } from "../ws.js";
import { PoolContract } from "../contracts/poolContract.js";
import abi from "../abis/pancakeSwapv3PoolAbi.js";

/**
 * Represents a PSv3 DEX.
 */
class PSv3Dex extends BaseDex {
  /**
   * @param subgraph The Graph Subgraph instance
   * @param wsManager WebSocket Manager
   */
  constructor(wsManager: WebSocketManager, subgraph: DexPoolSubgraph) {
    super(wsManager, subgraph);
  }

  async processSwap(swap: PSv3Swap, lastPoolSqrtPriceX96: bigint) {

    let contract: PoolContract | undefined;
    let inputTokens: Token[];

    try {
      contract = this.getContract(swap.contractAddress);

      if (contract === undefined) {
        throw new Error("Contract not found");
      }

      inputTokens = contract.getInputTokens();
    } catch (error) {
      logger.error(
        `Error fetching input tokens: ${error}`,
        this.constructor.name
      );
      throw error;
    }

    swap.setTokens(inputTokens);
    const swapName =  `${swap.getTokens()[0].symbol} -> ${swap.getTokens()[1].symbol}`;
    logger.info(
      `Processing swap: ${swapName}, amount0=${swap.amount0}, amount1=${swap.amount1}`,
      this.constructor.name
    );
    const priceImpact = swap.calculatePriceImpact(lastPoolSqrtPriceX96);
    logger.info(
      `Calculated price impact of ${priceImpact} for swap: ${swapName}`,
      this.constructor.name
    );

    if (isPriceImpactSignificant(priceImpact)) {
      logger.info(
        `Significant price impact detected for swap: ${swapName}`,
        this.constructor.name
      );

      let tokenC: Token | null;

      try {
        tokenC = await this.pickTokenC(swap.getTokens()[1]);
      } catch (error) {
        logger.error(
          `Error identifying arbitrage opportunity: ${error}`,
          this.constructor.name
        );
        throw error;
      }
    }
  }

  private async pickTokenC(tokenB: Token): Promise<Token | null> {
    // Logic to pick token C based on liquidity and price data
    return null;
  }

  private async triggerSmartContract(
    tokenA: Token,
    tokenB: Token,
    tokenC: Token,
    profit: number
  ) {
    // Logic to trigger smart contract execution
  }

  private async calculateExpectedProfit(
    tokenA: Token,
    tokenB: Token,
    tokenC: Token
  ): Promise<number> {
    // Logic to calculate expected profit from arbitrage opportunity
    return 0;
  }

  private logOpportunities(
    tokenA: Token,
    tokenB: Token,
    tokenC: Token,
    profit: number
  ) {
    // Logic to log identified arbitrage opportunities
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
      const poolContract = new PoolContract(
        pool.id,
        this.wsManager,
        abi,
        pool,
        this.processSwap.bind(this)
      );
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
}

export { PSv3Dex };
