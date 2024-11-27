import { BaseDex } from "./baseDex.js";
import { DexPoolSubgraph } from "../subgraphs/dexPoolSubgraph.js";
import { PSv3Swap } from "../swaps/psv3Swap.js";
import { Token, Pool } from "../types.js";
import {
  logger,
  isPriceImpactSignificant,
  convertSqrtPriceX96ToBigInt,
} from "../common.js";
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
    let inputTokens: Token[] | undefined;

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
    const swapName = `${swap.getTokens()[0].symbol} -> ${swap.getTokens()[1].symbol}`;
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

      let tokenA, tokenB, tokenC: Token | null;

      [tokenA, tokenC] =
        swap.amount0 > 0
          ? [inputTokens[0], inputTokens[1]]
          : [inputTokens[1], inputTokens[0]];

      let candidatePools: Pool[];
      try {
        candidatePools = this.getPoolsByInputTokensSymbol(
          tokenA.symbol,
          tokenC.symbol
        );
      } catch (error) {
        logger.error(
          `Error identifying arbitrage opportunity: ${error}`,
          this.constructor.name
        );
        throw error;
      }

      if (candidatePools.length === 0) {
        logger.info(
          `No arbitrage opportunities found for swap: ${swapName}`,
          this.constructor.name
        );
        return;
      }

      tokenB = this.pickTokenB(tokenA, tokenC, contract, candidatePools);
    }
  }

  /**
   * Pick the token to use for the third leg of the arbitrage.
   *
   * @param aSymbol - The symbol of token A
   * @param pools - The candidate pools
   * @returns The token to use for the third leg of the arbitrage, or null if no arbitrage opportunity is identified
   */
  private async pickTokenB(
    tokenA: Token,
    tokenB: Token,
    swapPoolContract: PoolContract | undefined,
    candidatePoolsContracts: PoolContract[]
  ): Promise<Token | null> {
    const profitMap = new Map<Token, number>();

    for (const poolContract of candidatePoolsContracts) {
      const tokenC = poolContract.getInputTokens().find((token: Token) => {
        return token.symbol !== tokenA.symbol && token.symbol !== tokenB.symbol;
      });

      if (!tokenC) {
        continue;
      }

      const profit = await this.calculateExpectedProfit(
        tokenA,
        tokenB,
        tokenC,
        swapPoolContract,
        poolContract
      );

      if (profit > 0) {
        profitMap.set(tokenC, profit);
      }
    }

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

  /**
   * Calculates the expected profit for a triangular arbitrage opportunity.
   *
   * @param tokenA The starting token (Token A in the arbitrage cycle).
   * @param tokenB The intermediate token (Token B in the arbitrage cycle).
   * @param tokenC The final token used to return to Token A.
   * @param amount0 The amount of the first token being swapped.
   * @param amount1 The amount of the second token being swapped.
   * @param swapPoolContract The pool contract where the initial swap occurs.
   * @param poolContract The contract of the pool used for subsequent swaps.
   * @returns The expected profit in terms of Token A.
   */
  private async calculateExpectedProfit(
    tokenA: Token,
    tokenB: Token,
    tokenC: Token,
    amount0: bigint,
    amount1: bigint,
    swapPoolContract: PoolContract,
    poolContract: PoolContract
  ): Promise<number> {
    // Determine the input amount for the first swap
    const inputAmount = amount0 > 0 ? amount0 : amount1;

    // Step 1: Calculate the cost of swapping Token A to Token B
    const priceAtoB = convertSqrtPriceX96ToBigInt(
      swapPoolContract.getLastPoolSqrtPriceX96()
    );
    const feeAtoB = swapPoolContract.getPoolFee(inputAmount);
    const costAtoB =
      (inputAmount * priceAtoB) / BigInt(10 ** tokenB.decimals) + feeAtoB;

    // Step 2: Calculate the output of swapping Token B to Token C
    const priceBtoC = convertSqrtPriceX96ToBigInt(
      poolContract.getLastPoolSqrtPriceX96()
    );
    const feeBtoC = poolContract.getPoolFee(costAtoB);
    const outputBtoC =
      (costAtoB * BigInt(10 ** tokenC.decimals)) / priceBtoC - feeBtoC;

    // Step 3: Calculate the output of swapping Token C back to Token A
    const returnPool = this.getReturnPool(tokenC.symbol, tokenA.symbol);
    if (!returnPool) {
      return 0; // No pool available for the final swap
    }

    const priceCtoA = convertSqrtPriceX96ToBigInt(
      returnPool.getLastPoolSqrtPriceX96()
    );
    const feeCtoA = returnPool.getPoolFee(outputBtoC);
    const outputCtoA =
      (outputBtoC * BigInt(10 ** tokenA.decimals)) / priceCtoA - feeCtoA;

    // Step 4: Calculate profit
    const profit = Number(outputCtoA - inputAmount);
    return profit > 0 ? profit : 0; // Return profit if positive, otherwise 0
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
