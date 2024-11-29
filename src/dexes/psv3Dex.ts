import { BaseDex } from "./baseDex.js";
import { DexPoolSubgraph } from "../subgraphs/dexPoolSubgraph.js";
import { PSv3Swap } from "../swaps/psv3Swap.js";
import { Token, Opportunity } from "../types.js";
import { logger, isPriceImpactSignificant } from "../common.js";
import { WebSocketManager } from "../ws.js";
import { PoolContract } from "../contracts/poolContract.js";
import abi from "../abis/pancakeSwapv3PoolAbi.js";

import { Decimal } from "decimal.js";

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

    if (lastPoolSqrtPriceX96 <= 0) {
      logger.warn(
        `Invalid lastPoolSqrtPriceX96: ${lastPoolSqrtPriceX96}`,
        this.constructor.name
      );
      return;
    }

    try {
      contract = this.getContract(swap.contractAddress);
    } catch (error) {
      logger.warn(
        `Error fetching contract: ${error}`,
        this.constructor.name
      );
      return;
    }
      
    const inputTokens: Token[] = contract.getInputTokens();

    swap.setTokens(inputTokens);

    let tokenA, tokenC: Token;

    [tokenA, tokenC] =
      swap.amount0 > 0
        ? [inputTokens[0], inputTokens[1]]
        : [inputTokens[1], inputTokens[0]];

    const swapName = `${tokenA.symbol} -> ${tokenC.symbol}`;
    const [swapInputAmount, swapOutAmount] =
      swap.amount0 > 0
        ? [swap.amount0, swap.amount1]
        : [swap.amount1, swap.amount0];
    logger.debug(
      `Processing swap: ${swapName}, amountA=${swapInputAmount}, amountC=${swapOutAmount}`,
      this.constructor.name
    );

    const opportunity: Opportunity = {
      tokenA,
      tokenC,
      tokenAIn: new Decimal((swapInputAmount / 10n).toString()), // Divide by 10 to avoid overflow
      lastPoolSqrtPriceX96: new Decimal(lastPoolSqrtPriceX96.toString()),
      originalSwap: swap,
      tokenB: undefined, // To be determined
      expectedProfit: undefined, // To be calculated
      originalSwapPriceImpact: undefined, // To be calculated
    };

    opportunity.originalSwapPriceImpact =
      opportunity.originalSwap.calculatePriceImpact(
        opportunity.lastPoolSqrtPriceX96,
        opportunity.tokenA.decimals,
        opportunity.tokenC.decimals
      );

    logger.debug(
      `Calculated price impact of ${opportunity.originalSwapPriceImpact} (bps) for swap: ${swapName}`,
      this.constructor.name
    );

    if (isPriceImpactSignificant(opportunity.originalSwapPriceImpact)) {
      logger.info(
        `Significant price impact (${opportunity.originalSwapPriceImpact}) detected for swap: ${swapName}`,
        this.constructor.name
      );

      const candidateTokenBs = this.getPossibleIntermediaryTokens(
        tokenA.symbol,
        tokenC.symbol
      );

      if (candidateTokenBs.length === 0) {
        logger.info(
          `No candidates for token B found for opportunity.`,
          this.constructor.name
        );
        return;
      }

      logger.info(
        `Found ${candidateTokenBs.length} candidate token Bs`,
        this.constructor.name
      );

      let tokenB: Token | undefined;
      let expectedProfit: Decimal | undefined;

      try {
        [tokenB, expectedProfit] = this.pickTokenB(
          tokenA,
          tokenC,
          candidateTokenBs,
          opportunity.tokenAIn,
          contract
        );
      } catch (error) {
        logger.debug(`Unable to pick token B: ${error}`, this.constructor.name);
        logger.info(
          `No profitable arbitrage opportunities found for swap: ${swapName}`,
          this.constructor.name
        );
        return;
      }

      opportunity.tokenB = tokenB;
      opportunity.expectedProfit = expectedProfit;

      try {
        this.logOpportunity(opportunity);
      } catch (error) {
        logger.warn(`Invalid opportunity: ${error}`, this.constructor.name);
        return;
      }

      try {
        // Trigger smart contract execution
        this.triggerSmartContract(opportunity);
      } catch (error) {
        logger.warn(
          `Error triggering smart contract: ${error}`,
          this.constructor.name
        );
        return;
      }
    }
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
