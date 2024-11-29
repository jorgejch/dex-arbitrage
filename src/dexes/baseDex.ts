import { WebSocketManager } from "../ws.js";
import { Pool, Token, Opportunity } from "../types.js";
import { PoolContract } from "../contracts/poolContract.js";
import { BaseSwap } from "../swaps/baseSwap.js";
import { DexPoolSubgraph } from "../subgraphs/dexPoolSubgraph.js";
import { logger, sqrtPriceX96ToDecimal } from "../common.js";
import { Decimal } from "decimal.js";

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
   * @param subgraph The Graph Subgraph instance
   */
  constructor(wsManager: WebSocketManager, subgraph: DexPoolSubgraph) {
    this.subgraph = subgraph;
    this.inputTokenSymbolIndex = new Map<string, Pool[]>();
    this.initialized = false;
    this.wsManager = wsManager;
    this.contractsMap = new Map<string, PoolContract>();
    this.pools = [];
  }

  /**
   * Calculates the net output amount of a token swap, considering the price and pool fees.
   *
   * @param inputAmount - The amount of the input token to swap.
   * @param fromToken - The token being swapped from.
   * @param toToken - The token being swapped to.
   * @param poolContract - The pool contract providing price and fee information.
   * @returns An object containing:
   * - `price`: The exchange rate between the tokens.
   * - `netOutput`: The amount of the output token received after fees.
   * - `grossOutput`: The amount of the output token before fees.
   * - `feePercentage`: The total fee percentage applied to the swap.
   * - `fee`: The fee amount deducted from the gross output.
   */
  private calculateNetOutput(
    inputAmount: Decimal,
    fromToken: Token,
    toToken: Token,
    poolContract: PoolContract
  ): {
    price: Decimal;
    netOutput: Decimal;
    grossOutput: Decimal;
    feePercentage: Decimal;
    fee: Decimal;
  } {
    const sqrtPriceX96 = poolContract.getLastPoolSqrtPriceX96();
    if (!sqrtPriceX96) {
      logger.warn(
        `Last price value for ${fromToken.symbol} to ${toToken.symbol} swap has not been initialized.`,
        this.constructor.name
      );
      return {
        price: new Decimal(0),
        netOutput: new Decimal(0),
        grossOutput: new Decimal(0),
        feePercentage: new Decimal(0),
        fee: new Decimal(0),
      };
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

    const feePercentage = poolContract.getTotalPoolFees();
    const fee = feePercentage.mul(grossOutput).div(100);
    const netOutput = grossOutput.sub(fee);

    return { price, netOutput, grossOutput, feePercentage, fee };
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
   * @returns The expected profit as a `Decimal`, calculated as the net output from the final swap minus the initial input amount.
   */
  protected calculateExpectedProfit(
    tokenA: Token,
    tokenB: Token,
    tokenC: Token,
    inputAmount: Decimal,
    swap1PoolContract: PoolContract,
    swap2PoolContract: PoolContract,
    swap3PoolContract: PoolContract
  ): Decimal {
    // Swap 1: Token A to Token B
    const swap1Result = this.calculateNetOutput(
      inputAmount,
      tokenA,
      tokenB,
      swap1PoolContract
    );
    if (swap1Result.netOutput.equals(0)) return new Decimal(0);

    // Swap 2: Token B to Token C
    const swap2Result = this.calculateNetOutput(
      swap1Result.netOutput,
      tokenB,
      tokenC,
      swap2PoolContract
    );
    if (swap2Result.netOutput.equals(0)) return new Decimal(0);

    // Swap 3: Token C to Token A
    const swap3Result = this.calculateNetOutput(
      swap2Result.netOutput,
      tokenC,
      tokenA,
      swap3PoolContract
    );
    if (swap3Result.netOutput.equals(0)) return new Decimal(0);

    const expectedProfit = swap3Result.netOutput.sub(inputAmount);

    logger.debug(
      `\n========== Expected Profit Calculation ==========\n` +
        `\tInput Amount: ${inputAmount}\n` +
        `\tSwap 1: ${tokenA.symbol} to ${tokenB.symbol}\n` +
        `\t\tPrice: ${swap1Result.price}\n` +
        `\t\tGross Output: ${swap1Result.grossOutput}\n` +
        `\t\tNet Output: ${swap1Result.netOutput}\n` +
        `\t\tFee Percentage: ${swap1Result.feePercentage}\n` +
        `\t\tFee: ${swap1Result.fee}\n` +
        `\tSwap 2: ${tokenB.symbol} to ${tokenC.symbol}\n` +
        `\t\tPrice: ${swap2Result.price}\n` +
        `\t\tGross Output: ${swap2Result.grossOutput}\n` +
        `\t\tNet Output: ${swap2Result.netOutput}\n` +
        `\t\tFee Percentage: ${swap2Result.feePercentage}\n` +
        `\t\tFee: ${swap2Result.fee}\n` +
        `\tSwap 3: ${tokenC.symbol} to ${tokenA.symbol}\n` +
        `\t\tPrice: ${swap3Result.price}\n` +
        `\t\tGross Output: ${swap3Result.grossOutput}\n` +
        `\t\tNet Output: ${swap3Result.netOutput}\n` +
        `\t\tFee Percentage: ${swap3Result.feePercentage}\n` +
        `\t\tFee: ${swap3Result.fee}\n` +
        `\tExpected Profit: ${expectedProfit}\n` +
        `==================================================`,
      this.constructor.name
    );

    return expectedProfit;
  }

  /**
   * Get the pool contracts for a pair of tokens.
   *
   * @param tokenX
   * @param tokenZ
   * @returns
   */
  private getContracstsForTokens(tokenX: Token, tokenZ: Token): PoolContract[] {
    const poolsA = this.inputTokenSymbolIndex.get(tokenX.symbol);
    const poolsB = this.inputTokenSymbolIndex.get(tokenZ.symbol);

    if (poolsA === undefined || poolsB === undefined) {
      throw new Error("No pools found for tokens");
    }

    const commonPools = poolsA.filter((pool) => poolsB.includes(pool));

    return commonPools
      .map((pool) => this.getContract(pool.id))
      .filter((contract): contract is PoolContract => contract !== undefined);
  }

  /**
   * Selects the intermediary token (Token B) for a triangular arbitrage opportunity.
   * Evaluates potential intermediary tokens by calculating the expected profit for each candidate token.
   * The arbitrage involves three swaps, each incurring fees. Profit is calculated as:
   * profit = outputCtoA - inputAmount
   *
   * @param tokenA - The initial token to swap.
   * @param tokenC - The final token used to return to Token A.
   * @param possibleBs - The candidate tokens for the intermediary step.
   * @param inputAmount - The amount of token A to swap.
   * @param swapPoolContract - The pool contract where the initial and final swap occurs.
   * @returns The token to use for the third leg of the arbitrage, or undefined if no arbitrage opportunity is identified.
   */
  protected pickTokenB(
    tokenA: Token,
    tokenC: Token,
    possibleBs: Token[],
    inputAmount: Decimal,
    swapPoolContract: PoolContract
  ): [Token, Decimal] {
    const profitMap = new Map<Decimal, Token>();

    if (!possibleBs) {
      throw new Error("No possible intermediary tokens found");
    }

    if (!swapPoolContract) {
      throw new Error("No swap pool contract found");
    }

    for (const tokenB of possibleBs) {
      const swap1PoolContractList: PoolContract[] = this.getContracstsForTokens(
        tokenA,
        tokenB
      );
      const swap2PoolContractList: PoolContract[] = this.getContracstsForTokens(
        tokenB,
        tokenC
      );
      const swap3PoolContract: PoolContract = swapPoolContract;

      if (
        swap1PoolContractList.length === 0 ||
        swap2PoolContractList.length === 0
      ) {
        throw new Error("No pool contracts found for swaps 1 and 2");
      }

      const profit: Decimal = this.calculateExpectedProfit(
        tokenA,
        tokenB,
        tokenC,
        inputAmount,
        swap1PoolContractList[0], // AFAIK, there is only one
        swap2PoolContractList[0],
        swap3PoolContract
      );

      if (profit > new Decimal(0)) {
        profitMap.set(profit, tokenB);
      }
    }

    if (profitMap.size === 0) {
      throw new Error("No profitable arbitrage opportunities found");
    }

    let maxProfit = new Decimal(0);
    for (const profit of profitMap.keys()) {
      if (profit.gt(maxProfit)) {
        maxProfit = profit;
      }
    }

    if (maxProfit.lte(0)) {
      throw new Error("No profitable arbitrage opportunities found");
    }

    const tokenB = profitMap.get(maxProfit);

    if (!tokenB) {
      logger.error("Token B not found", this.constructor.name);
      throw new Error("Token B not found");
    }

    return [tokenB, maxProfit];
  }

  protected async triggerSmartContract(opportunity: Opportunity) {
    // Logic to trigger smart contract execution
  }

  protected logOpportunity(opportunity: Opportunity): void {
    if (!opportunity.tokenA) {
      logger.warn(
        "Token A is undefined for opportunity",
        this.constructor.name
      );
      throw new Error("Token A is undefined for opportunity");
    }

    if (!opportunity.tokenB) {
      logger.warn(
        "Token B is undefined for opportunity",
        this.constructor.name
      );
      throw new Error("Token B is undefined for opportunity");
    }

    if (!opportunity.tokenC) {
      logger.warn(
        "Token C is undefined for opportunity",
        this.constructor.name
      );
      throw new Error("Token C is undefined for opportunity");
    }

    if (!opportunity.expectedProfit) {
      logger.warn(
        "Expected profit is undefined for opportunity",
        this.constructor.name
      );
      throw new Error("Expected profit is undefined for opportunity");
    }

    if (opportunity.tokenAIn === undefined) {
      logger.warn(
        "Token A in is undefined for opportunity",
        this.constructor.name
      );
      throw new Error("Token A amount in is undefined for opportunity");
    }

    if (opportunity.originalSwapPriceImpact === undefined) {
      logger.warn(
        "Original swap price impact is undefined for opportunity",
        this.constructor.name
      );
      throw new Error(
        "Original swap price impact is undefined for opportunity"
      );
    }

    logger.info(
      `\n========== Arbitrage Opportunity ==========\n` +
        `\tToken A: ${opportunity.tokenA.symbol}\n` +
        `\tToken B: ${opportunity.tokenB.symbol}\n` +
        `\tToken C: ${opportunity.tokenC.symbol}\n` +
        `\tOriginal Swap Price Impact: ${opportunity.originalSwapPriceImpact}\n` +
        `\tToken A In: ${opportunity.tokenAIn.toString()}\n` +
        `\tExpected Profit: ${opportunity.expectedProfit.toString()}\n` +
        `==========================================`,
      this.constructor.name
    );
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
        if (
          token.symbol !== tokenASymbol &&
          token.symbol !== tokenCSymbol &&
          possibleBs.has(token.symbol)
        ) {
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
  public getContract(address: string): PoolContract {
    const contract = this.contractsMap.get(address);
    if (contract === undefined) {
      logger.warn(`Contract not found: ${address}`, this.constructor.name);
      throw new Error(`Contract not found: ${address}`);
    }
    return contract;
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
