import { BaseDex } from "./baseDex.js";
import { DexPoolSubgraph } from "../subgraphs/dexPoolSubgraph.js";
import { PSv3Swap } from "../swaps/psv3Swap.js";
import { Token } from "../types.js";
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
    let inputTokens: Token[] | undefined;

    if (lastPoolSqrtPriceX96 <= 0) {
      logger.warn(
        `Invalid lastPoolSqrtPriceX96: ${lastPoolSqrtPriceX96}`,
        this.constructor.name
      );
      return;
    }

    try {
      contract = this.getContract(swap.contractAddress);
      inputTokens = contract?.getInputTokens();
    } catch (error) {
      logger.error(
        `Error fetching input tokens: ${error}`,
        this.constructor.name
      );
      throw error;
    }

    if (!inputTokens) {
      throw new Error("Input tokens not found");
    }

    swap.setTokens(inputTokens);

    let tokenA, tokenC: Token | null;

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
    const priceImpact: number = swap.calculatePriceImpact(
      lastPoolSqrtPriceX96,
      tokenA.decimals,
      tokenC.decimals
    );
    logger.debug(
      `Calculated price impact of ${priceImpact} for swap: ${swapName}`,
      this.constructor.name
    );

    if (isPriceImpactSignificant(priceImpact)) {
      logger.info(
        `Significant price impact (${priceImpact}) detected for swap: ${swapName}`,
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

      // Get TokenA amount to swap.
      // Divide by 10 to avoid overflow.
      const inputAmount = swapInputAmount / 10n;

      if (!contract) {
        throw new Error("Contract not found");
      }

      let tokenB: Token | undefined;
      let profit: Decimal | undefined;

      [tokenB, profit] = this.pickTokenB(
        tokenA,
        tokenC,
        candidateTokenBs,
        inputAmount,
        contract
      );

      if (tokenB == undefined || profit == undefined) {
        logger.info(
          `No profitable arbitrage opportunities found for swap: ${swapName}`,
          this.constructor.name
        );
        return;
      }

      this.logOpportunities(tokenA, tokenB, tokenC, profit);

      try {
        // Trigger smart contract execution
        this.triggerSmartContract(tokenA, tokenB, tokenC, profit);
      } catch (error) {
        logger.error(
          `Error triggering smart contract: ${error}`,
          this.constructor.name
        );
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
