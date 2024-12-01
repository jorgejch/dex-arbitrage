import { WebSocketManager } from "../ws.js";
import {
  Pool,
  Token,
  Opportunity,
  ExpectedProfitData,
  NetOutputData,
  TokenBPickData,
} from "../types.js";
import { PoolContract } from "../contracts/poolContract.js";
import { AflabContract } from "../contracts/aflabContract.js";
import { BaseSwap } from "../swaps/baseSwap.js";
import { DexPoolSubgraph } from "../subgraphs/dexPoolSubgraph.js";
import { constants, logger, sqrtPriceX96ToDecimal } from "../common.js";
import { Decimal } from "decimal.js";
import { ethers } from "ethers";

/**
 * Abstract class representing a Uniswap V3-based Decentralized Exchange (DEX).
 *
 * Provides a foundational structure for interacting with Uniswap V3-based dexes
 * for the purpose of orchestrating arbitrage opportunities.
 */
abstract class BaseDex {
  /**
   * Maps contract addresses to their corresponding PoolContract instances.
   */
  protected readonly contractsMap: Map<string, PoolContract>;

  /**
   * Indexes pools by their input token symbols for efficient retrieval.
   */
  protected inputTokenSymbolIndex: Map<string, Pool[]>;

  /**
   * Indicates whether the DEX has been initialized.
   *
   * @default false
   */
  protected initialized: boolean = false;

  /**
   * Manages WebSocket connections for real-time data streaming.
   */
  protected wsManager: WebSocketManager;

  /**
   * List of available liquidity pools within the DEX.
   */
  protected pools: Pool[] = [];

  /**
   * Signer instance used for signing transactions.
   */
  protected signer: ethers.Signer;

  /**
   * Subgraph interface for querying DEX data from The Graph.
   */
  protected subgraph: DexPoolSubgraph;

  /**
   * Interface for interacting with the AFLAB smart contract.
   */
  protected aflabContract: AflabContract;

  /**
   * @param wsManager - Manages WebSocket connections for real-time updates.
   * @param signer - Signer used to authorize and send transactions.
   * @param subgraph - Interface to The Graph subgraph for querying on-chain data.
   * @param aflabContract - Interface to the AFLAB smart contract for executing arbitrage.
   */
  constructor(
    wsManager: WebSocketManager,
    signer: ethers.Signer,
    subgraph: DexPoolSubgraph,
    aflabContract: AflabContract
  ) {
    this.wsManager = wsManager;
    this.signer = signer;
    this.subgraph = subgraph;
    this.aflabContract = aflabContract;
    this.contractsMap = new Map<string, PoolContract>();
    this.inputTokenSymbolIndex = new Map<string, Pool[]>();
  }

  /**
   * Get a pool contract by address.
   *
   * @param address - The pool contract address.
   * @returns The pool contract.
   * @throws An error if the contract is not found.
   */
  public getContract(address: string): PoolContract {
    const contract = this.contractsMap.get(address);
    if (contract === undefined) {
      logger.warn(`Contract not found: ${address}`, this.constructor.name);
      throw new Error(`Contract not found: ${address}`);
    }
    return contract;
  }

  /**
   * Retrieves pool contracts for pools common to the specified tokens.
   *
   * @param tokenX - The first token.
   * @param tokenZ - The second token.
   * @returns An array of PoolContract instances associated with both tokens.
   * @throws Will throw an error if no pools are found for either token.
   */
  protected getPoolContractsForTokens(
    tokenX: Token,
    tokenZ: Token
  ): PoolContract[] {
    const poolsA = this.inputTokenSymbolIndex.get(tokenX.symbol);
    const poolsB = this.inputTokenSymbolIndex.get(tokenZ.symbol);

    if (!poolsA || !poolsB) {
      return [];
    }

    const commonPools: Pool[] = poolsA.filter((pool: Pool) =>
      poolsB.includes(pool)
    );

    return commonPools
      .map((pool: Pool) => this.getContract(pool.id))
      .filter(
        (contract: PoolContract): contract is PoolContract =>
          contract !== undefined
      );
  }

  /**
   * Calculates the expected profit from performing a three-step arbitrage cycle involving tokens A, B, and C.
   * The method simulates swapping an initial amount of token A to token B, then token B to token C,
   * and finally token C back to token A using the provided pool contracts.
   * If any swap results in a zero net output, it returns a profit of zero.
   *
   * @param tokenA - The initial token to start the arbitrage cycle.
   * @param tokenB - The intermediary token in the arbitrage cycle.
   * @param tokenC - The final token before swapping back to token A.
   * @param inputAmount - The amount of token A to initiate the cycle.
   * @param swap1PoolContract - The pool contract for swapping token A to token B.
   * @param swap2PoolContract - The pool contract for swapping token B to token C.
   * @param swap3PoolContract - The pool contract for swapping token C back to token A.
   * @returns {ExpectedProfitData} The expected profit as a `Decimal`, calculated as the net output from the final swap minus the initial input amount.
   */
  protected calculateExpectedProfit(
    tokenA: Token,
    tokenB: Token,
    tokenC: Token,
    inputAmount: Decimal,
    swap1PoolContract: PoolContract,
    swap2PoolContract: PoolContract,
    swap3PoolContract: PoolContract
  ): ExpectedProfitData {
    const returnPayload: ExpectedProfitData = {
      expectedProfit: new Decimal(0),
      swap1FeeDecimal: new Decimal(0),
      swap2FeeDecimal: new Decimal(0),
      swap3FeeDecimal: new Decimal(0),
    };

    // Swap 1: Token A to Token B
    let swap1Result: NetOutputData;

    try {
      swap1Result = this.calculateNetOutput(
        inputAmount,
        tokenA,
        tokenB,
        swap1PoolContract
      );
    } catch (error) {
      logger.warn(
        `Error calculating net output for swap 1: ${error}`,
        this.constructor.name
      );
      return returnPayload;
    }

    if (swap1Result.netOutput.lessThanOrEqualTo(0)) return returnPayload;
    returnPayload.swap1FeeDecimal = swap1Result.feeDecimal;

    // Swap 2: Token B to Token C
    let swap2Result: NetOutputData;
    try {
      swap2Result = this.calculateNetOutput(
        swap1Result.netOutput,
        tokenB,
        tokenC,
        swap2PoolContract
      );
    } catch (error) {
      logger.warn(
        `Error calculating net output for swap 2: ${error}`,
        this.constructor.name
      );
      return returnPayload;
    }

    if (swap2Result.netOutput.lessThanOrEqualTo(0)) return returnPayload;
    returnPayload.swap2FeeDecimal = swap2Result.feeDecimal;

    // Swap 3: Token C to Token A

    let swap3Result: NetOutputData;
    try {
      swap3Result = this.calculateNetOutput(
        swap2Result.netOutput,
        tokenC,
        tokenA,
        swap3PoolContract
      );
    } catch (error) {
      logger.warn(
        `Error calculating net output for swap 3: ${error}`,
        this.constructor.name
      );
      return returnPayload;
    }

    if (swap3Result.netOutput.lessThanOrEqualTo(0)) return returnPayload;
    returnPayload.swap3FeeDecimal = swap3Result.feeDecimal;

    const expectedProfit = swap3Result.netOutput.sub(inputAmount);
    returnPayload.expectedProfit = expectedProfit;

    logger.debug(
      `\n========== Expected Profit Calculation ==========\n` +
        `\tInput Amount: ${inputAmount}\n` +
        `\tSwap 1: ${tokenA.symbol} to ${tokenB.symbol}\n` +
        `\t\tPrice: ${swap1Result.price}\n` +
        `\t\tGross Output: ${swap1Result.grossOutput}\n` +
        `\t\tNet Output: ${swap1Result.netOutput}\n` +
        `\t\tFee Decimal: ${swap1Result.feeDecimal}\n` +
        `\t\tFee: ${swap1Result.fee}\n` +
        `\tSwap 2: ${tokenB.symbol} to ${tokenC.symbol}\n` +
        `\t\tPrice: ${swap2Result.price}\n` +
        `\t\tGross Output: ${swap2Result.grossOutput}\n` +
        `\t\tNet Output: ${swap2Result.netOutput}\n` +
        `\t\tFee Decimal: ${swap2Result.feeDecimal}\n` +
        `\t\tFee: ${swap2Result.fee}\n` +
        `\tSwap 3: ${tokenC.symbol} to ${tokenA.symbol}\n` +
        `\t\tPrice: ${swap3Result.price}\n` +
        `\t\tGross Output: ${swap3Result.grossOutput}\n` +
        `\t\tNet Output: ${swap3Result.netOutput}\n` +
        `\t\tFee Decimal: ${swap3Result.feeDecimal}\n` +
        `\t\tFee: ${swap3Result.fee}\n` +
        `\tExpected Profit: ${expectedProfit}\n` +
        `==================================================`,
      this.constructor.name
    );

    return returnPayload;
  }

  /**
   * Calculates the net output of a token swap after accounting for fees.
   *
   * @param inputAmount - The amount of the input token to be swapped.
   * @param fromToken - The token being swapped from.
   * @param toToken - The token being swapped to.
   * @param poolContract - The pool contract providing pricing and fee details.
   * @returns {NetOutputData} The net output data after the swap.
   */
  protected calculateNetOutput(
    inputAmount: Decimal,
    fromToken: Token,
    toToken: Token,
    poolContract: PoolContract
  ): NetOutputData {
    const sqrtPriceX96: Decimal = poolContract.getLastPoolSqrtPriceX96();
    if (sqrtPriceX96 === undefined || sqrtPriceX96.lessThanOrEqualTo(0)) {
      logger.debug(
        `Last price value for ${fromToken.symbol} to ${toToken.symbol} swap has not been initialized or is zero.`,
        this.constructor.name
      );
      throw new Error("Last price value not initialized or is zero");
    }

    if (poolContract.getInputTokens() === undefined) {
      throw new Error("Pool contract input tokens are not defined");
    }

    const [token0, token1] = poolContract.getInputTokens();
    const isToken0ToToken1 = fromToken.id === token0.id;

    const price = sqrtPriceX96ToDecimal(
      sqrtPriceX96,
      token0.decimals,
      token1.decimals
    );

    const grossOutput = isToken0ToToken1
      ? inputAmount.mul(price)
      : inputAmount.div(price);

    const feeDecimal: Decimal = poolContract.getTotalPoolFeesDecimal();

    // Alarm if fee percentage is too high
    if (feeDecimal > constants.MAX_FEE_DECIMAL) {
      logger.warn(`Fee decimal is too high (${feeDecimal})`, this.constructor.name);
    }

    const fee = grossOutput.mul(feeDecimal);
    const netOutput = grossOutput.sub(fee);

    const returnPayload: NetOutputData = {
      price,
      netOutput,
      grossOutput,
      feeDecimal,
      fee,
    };

    return returnPayload;
  }

  /**
   * Retrieves a list of possible intermediary tokens B (that are not A or C).
   * Token B participates in 1 or more pools with tokens A and token C.
   *
   * @param tokenASymbol - Symbol of token A.
   * @param tokenCSymbol - Symbol of token C.
   * @returns {Token[]} An array of tokens satisfying the criteria.
   */
  protected findIntermediaryTokens(
    tokenASymbol: string,
    tokenCSymbol: string
  ): Token[] {
    const poolsA = this.inputTokenSymbolIndex.get(tokenASymbol);
    const poolsC = this.inputTokenSymbolIndex.get(tokenCSymbol);

    if (!poolsA || !poolsC) {
      return [];
    }

    const tokensWithA = new Set<string>();
    const tokensWithC = new Set<string>();
    const tokenMap = new Map<string, Token>();

    for (const pool of poolsA) {
      for (const token of pool.inputTokens) {
        if (token.symbol !== tokenASymbol) {
          tokensWithA.add(token.symbol);
          tokenMap.set(token.symbol, token);
        }
      }
    }

    for (const pool of poolsC) {
      for (const token of pool.inputTokens) {
        if (token.symbol !== tokenCSymbol) {
          tokensWithC.add(token.symbol);
          tokenMap.set(token.symbol, token);
        }
      }
    }

    const intermediaryTokenSymbols = new Set(
      [...tokensWithA].filter((x) => tokensWithC.has(x))
    );

    return Array.from(intermediaryTokenSymbols).map((symbol) => {
      const token = tokenMap.get(symbol);
      if (!token) {
        throw new Error("Token not found");
      }
      return token;
    });
  }

  /**
   * Picks the best intermediary token B for an arbitrage opportunity.
   *
   * @param tokenA - The initial token to start the arbitrage cycle.
    // Convert the Set of tokens to an array to facilitate further processing
    return Array.from(tokenSet);
   * @param possibleBs - An array of possible intermediary tokens B.
   * @param inputAmount - The amount of token A to initiate the cycle.
   * @param swapPoolContract - The pool contract where the initial and final swap occurs.
   * @returns The token to use for the third leg of the arbitrage, or undefined if no arbitrage opportunity is identified.
   */
  protected pickTokenB(
    tokenA: Token,
    tokenC: Token,
    possibleBs: Token[],
    inputAmount: Decimal,
    swapPoolContract: PoolContract
  ): TokenBPickData {
    const profitMap = new Map<Decimal, TokenBPickData>();

    if (!possibleBs) {
      throw new Error("No possible intermediary tokens found");
    }

    if (!swapPoolContract) {
      throw new Error("No swap pool contract found");
    }

    for (const tokenB of possibleBs) {
      const swap1PoolContractList: PoolContract[] =
        this.getPoolContractsForTokens(tokenA, tokenB);
      const swap2PoolContractList: PoolContract[] =
        this.getPoolContractsForTokens(tokenB, tokenC);
      const swap3PoolContract: PoolContract = swapPoolContract;

      if (
        swap1PoolContractList.length === 0 ||
        swap2PoolContractList.length === 0
      ) {
        continue;
      }

      for (const swap1PoolContract of swap1PoolContractList) {
        for (const swap2PoolContract of swap2PoolContractList) {
          const expectedProfitData: ExpectedProfitData =
            this.calculateExpectedProfit(
              tokenA,
              tokenB,
              tokenC,
              inputAmount,
              swap1PoolContract,
              swap2PoolContract,
              swap3PoolContract
            );

          if (expectedProfitData.expectedProfit.gt(0)) {
            profitMap.set(expectedProfitData.expectedProfit, {
              expectedProfitData,
              tokenB,
            });
          }
        }
      }
    }

    let maxProfit = new Decimal(0);
    for (const profit of profitMap.keys()) {
      if (profit.gt(maxProfit)) {
        maxProfit = profit;
      }
    }

    const maxProfitData = profitMap.get(maxProfit);

    if (!maxProfitData || maxProfitData.tokenB === undefined) {
      throw new Error("No profitable arbitrage opportunities found");
    }

    return maxProfitData;
  }

  /**
   * Logs an arbitrage opportunity.
   *
   * @param opportunity - The arbitrage opportunity to log.
   */
  protected logOpportunity(opportunity: Opportunity): void {
    // Check if all the opportuniy's parameters are defined
    if (
      opportunity.arbitInfo.swap1 === undefined ||
      opportunity.arbitInfo.swap2 === undefined ||
      opportunity.arbitInfo.swap3 === undefined ||
      opportunity.tokenAIn === undefined ||
      opportunity.lastPoolSqrtPriceX96 === undefined ||
      opportunity.originalSwap === undefined
    ) {
      throw new Error("Opportunity parameters are not defined");
    }

    // Log the opportunity details
    logger.info(
      `\n========== Arbitrage Opportunity ==========\n` +
        `\tToken A: ${opportunity.arbitInfo.swap1.tokenIn.symbol}\n` +
        `\tToken B: ${opportunity.arbitInfo.swap2.tokenIn.symbol}\n` +
        `\tToken C: ${opportunity.arbitInfo.swap3.tokenIn.symbol}\n` +
        `\tInput Amount: ${opportunity.tokenAIn}\n` +
        `\tExpected Profit: ${opportunity.expectedProfit}\n` +
        `\tOriginal Swap Price Impact: ${opportunity.originalSwapPriceImpact}\n` +
        `\tEstimated Gas Cost: ${opportunity.arbitInfo.estimatedGasCost}\n` +
        `===========================================`,
      this.constructor.name
    );
  }

  /**
   * Triggers the smart contract to execute an arbitrage opportunity.
   *
   * @param opportunity - The arbitrage opportunity to execute.
   */
  protected async triggerSmartContract(opportunity: Opportunity) {
    try {
      await this.aflabContract.executeOpportunity(opportunity);
    } catch (error) {
      logger.warn(
        `Error triggering smart contract: ${error}`,
        this.constructor.name
      );
    }
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
