import { BaseDex } from "./baseDex.js";
import { DexPoolSubgraph } from "../subgraphs/dexPoolSubgraph.js";
import { UniswapV3Swap } from "../swaps/uniswapV3Swap.js";
import { Token, Opportunity, ExpectedProfitData } from "../types.js";
import { logger, isPriceImpactSignificant } from "../common.js";
import { PoolContract } from "../contracts/poolContract.js";
import { AflabContract } from "../contracts/aflabContract.js";
import { LendingPoolAPContract } from "../contracts/lendingPoolAPContract.js";
import abi from "../abis/uniswapV3PoolAbi.js";

import { Wallet, Alchemy, BigNumber } from "alchemy-sdk";

/**
 * Represents the Uniswap V3 DEX.
 */
class UniswapV3Dex extends BaseDex {
  /**
   * @param alchemy The Alchemy SDK instance
   * @param wallet The wallet instance
   * @param subgraph The DEX pool subgraph instance
   * @param aflabContract The AFLAB contract instance
   * @param lendingPoolAPContract The LendingPoolAP contract instance
   * @param networkId The network ID
   */
  constructor(
    alchemy: Alchemy,
    wallet: Wallet,
    subgraph: DexPoolSubgraph,
    aflabContract: AflabContract,
    lendingPoolAPContract: LendingPoolAPContract,
    networkId: number
  ) {
    super(
      alchemy,
      wallet,
      subgraph,
      aflabContract,
      lendingPoolAPContract,
      networkId
    );
  }

  async processSwap(swap: UniswapV3Swap, lastPoolSqrtPriceX96: BigNumber) {
    let contract: PoolContract | undefined;

    if (lastPoolSqrtPriceX96 <= BigNumber.from(0)) {
      logger.warn(
        `Invalid lastPoolSqrtPriceX96: ${lastPoolSqrtPriceX96}`,
        this.constructor.name
      );
      return;
    }

    try {
      contract = this.getContract(swap.getContractAddress());
    } catch (error) {
      logger.warn(`Error fetching contract: ${error}`, this.constructor.name);
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
      tokenAIn: BigNumber.from(swapInputAmount).div(100), // Start dividing by 100 and adapt
      lastPoolSqrtPriceX96: lastPoolSqrtPriceX96,
      originalSwap: swap,
      expectedProfit: undefined, // To be calculated
      originalSwapPriceImpact: undefined,
      arbitInfo: {
        swap1: undefined,
        swap2: undefined,
        swap3: undefined,
        estimatedGasCost: BigNumber.from(0),
      },
    };

    try {
      opportunity.originalSwapPriceImpact = swap.calculatePriceImpact(
        opportunity.lastPoolSqrtPriceX96,
        tokenA.decimals,
        tokenC.decimals
      );
    } catch (error) {
      logger.warn(
        `Error calculating price impact: ${error}`,
        this.constructor.name
      );
      return;
    }

    logger.debug(
      `Calculated price impact of ${opportunity.originalSwapPriceImpact} (bps) for swap: ${swapName}`,
      this.constructor.name
    );

    if (isPriceImpactSignificant(opportunity.originalSwapPriceImpact)) {
      logger.info(
        `Significant price impact (${opportunity.originalSwapPriceImpact}) detected for swap: ${swapName}`,
        this.constructor.name
      );

      const candidateTokenBs: Token[] = this.findIntermediaryTokens(
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

      let tokenBData;
      try {
        tokenBData = await this.pickTokenB(
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

      const expectedProfit: ExpectedProfitData = tokenBData.expectedProfitData;

      if (expectedProfit.expectedProfit.lte(0)) {
        logger.error(
          `Negative expected profit: ${expectedProfit.expectedProfit}`,
          this.constructor.name
        );
        return;
      }

      opportunity.expectedProfit = expectedProfit.expectedProfit;
      opportunity.arbitInfo.swap1 = {
        tokenIn: tokenA,
        tokenOut: tokenBData.tokenB,
        poolFee: expectedProfit.swap1FeeBigNumber,
        amountOutMinimum: BigNumber.from(0),
      };
      opportunity.arbitInfo.swap2 = {
        tokenIn: tokenBData.tokenB,
        tokenOut: tokenC,
        poolFee: expectedProfit.swap2FeeBigNumber,
        amountOutMinimum: BigNumber.from(0),
      };
      opportunity.arbitInfo.swap3 = {
        tokenIn: tokenC,
        tokenOut: tokenA,
        poolFee: expectedProfit.swap3FeeBigNumber,
        amountOutMinimum: BigNumber.from(0),
      };

      try {
        this.logOpportunity(opportunity);
      } catch (error) {
        logger.warn(`Invalid opportunity: ${error}`, this.constructor.name);
      }

      try {
        await this.triggerSmartContract(opportunity);
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
    if (this.initialized) {
      logger.warn("Already initialized", this.constructor.name);
      return;
    }

    try {
      await this.aflabContract.initialize();
    } catch (error) {
      logger.error(
        `Error initializing AFLAB contract: ${error}`,
        this.constructor.name
      );
      throw error;
    }

    try {
      await this.lendingPoolAPContract.initialize();
    } catch (error) {
      logger.error(
        `Error initializing LendingPoolAP contract: ${error}`,
        this.constructor.name
      );
      throw error;
    }

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
        this.alchemy,
        abi,
        pool,
        this.processSwap.bind(this),
        this.network
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

export { UniswapV3Dex };
