import { WebSocketManager } from "../ws.js";
import { Pool, Token, Opportunity } from "../types.js";
import { PoolContract } from "../contracts/poolContract.js";
import { AflabContract } from "../contracts/aflabContract.js";
import { BaseSwap } from "../swaps/baseSwap.js";
import { DexPoolSubgraph } from "../subgraphs/dexPoolSubgraph.js";
import { logger, sqrtPriceX96ToDecimal } from "../common.js";
import { Decimal } from "decimal.js";
import { ethers } from "ethers";

/**
 * Abstract class representing a DEX.
 */
abstract class BaseDex {
  protected readonly contractsMap: Map<string, PoolContract>;
  protected inputTokenSymbolIndex: Map<string, Pool[]>;
  protected initialized: boolean;
  protected wsManager: WebSocketManager;
  protected pools: Pool[];
  protected signer: ethers.Signer;
  protected subgraph: DexPoolSubgraph;
  protected aflabContract: AflabContract;

  /**
   * @param wsManager WebSocket Manager
   * @param signer The signer for transactions
   * @param subgraph The Graph Subgraph instance
   * @param aflabContract The AFLAB smart contract
   */
  constructor(
    wsManager: WebSocketManager,
    signer: ethers.Signer,
    subgraph: DexPoolSubgraph,
    aflabContract: AflabContract
  ) {
    this.subgraph = subgraph;
    this.inputTokenSymbolIndex = new Map<string, Pool[]>();
    this.initialized = false;
    this.wsManager = wsManager;
    this.contractsMap = new Map<string, PoolContract>();
    this.pools = [];
    this.signer = signer;
    this.aflabContract = aflabContract;
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
  ): {
    expectedProfit: Decimal;
    swap1FeePercentage: Decimal;
    swap2FeePercentage: Decimal;
    swap3FeePercentage: Decimal;
  } {
    const returnPayload = {
      expectedProfit: new Decimal(0),
      swap1FeePercentage: new Decimal(0),
      swap2FeePercentage: new Decimal(0),
      swap3FeePercentage: new Decimal(0),
    };

    // Swap 1: Token A to Token B
    const swap1Result = this.calculateNetOutput(
      inputAmount,
      tokenA,
      tokenB,
      swap1PoolContract
    );
    if (swap1Result.netOutput.equals(0)) return returnPayload;
    returnPayload.swap1FeePercentage = swap1Result.feePercentage;

    // Swap 2: Token B to Token C
    const swap2Result = this.calculateNetOutput(
      swap1Result.netOutput,
      tokenB,
      tokenC,
      swap2PoolContract
    );
    if (swap2Result.netOutput.equals(0)) return returnPayload;
    returnPayload.swap2FeePercentage = swap2Result.feePercentage;

    // Swap 3: Token C to Token A
    const swap3Result = this.calculateNetOutput(
      swap2Result.netOutput,
      tokenC,
      tokenA,
      swap3PoolContract
    );
    if (swap3Result.netOutput.equals(0)) return returnPayload;
    returnPayload.swap3FeePercentage = swap3Result.feePercentage;

    const expectedProfit = swap3Result.netOutput.sub(inputAmount);
    returnPayload.expectedProfit = expectedProfit;

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

    return returnPayload;
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
   * Finds possible intermediary tokens (B) that can be used in a swap from token A to token C.
   *
   * @param pools - An array of Pool objects to search through.
   * @param tokenASymbol - The symbol of the starting token (A).
   * @param tokenCSymbol - The symbol of the ending token (C).
   * @returns A set of token symbols that can act as intermediary tokens (B) in the swap.
   */
  private findPossibleBs(
    pools: Pool[],
    tokenASymbol: string,
    tokenCSymbol: string
  ): Set<string> {
    const possibleBs: Set<string> = new Set();
    for (const pool of pools) {
      for (const token of pool.inputTokens) {
        if (token.symbol !== tokenASymbol && token.symbol !== tokenCSymbol) {
          possibleBs.add(token.symbol);
        }
      }
    }
    return possibleBs;
  }

  /**
   * Finds common tokens (Bs) between token A and token C from a list of pools.
   *
   * @param pools - An array of Pool objects to search through.
   * @param tokenASymbol - The symbol of token A.
   * @param tokenCSymbol - The symbol of token C.
   * @param possibleBs - A set of possible token symbols that can be considered as common tokens.
   * @returns An array of Token objects that are common between token A and token C.
   */
  private findCommonBs(
    pools: Pool[],
    tokenASymbol: string,
    tokenCSymbol: string,
    possibleBs: Set<string>
  ): Token[] {
    const result: Token[] = [];
    for (const pool of pools) {
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
  ): {
    tokenB: Token;
    expectedProfit: Decimal;
    swap1FeePercentage: Decimal;
    swap2FeePercentage: Decimal;
    swap3FeePercentage: Decimal;
  } {
    const profitMap = new Map<Decimal, object>();

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

      const expectProfitData = this.calculateExpectedProfit(
        tokenA,
        tokenB,
        tokenC,
        inputAmount,
        swap1PoolContractList[0], // AFAIK, there is only one
        swap2PoolContractList[0],
        swap3PoolContract
      );

      if (expectProfitData.expectedProfit.gt(new Decimal(0))) {
        profitMap.set(expectProfitData.expectedProfit, {
          ...expectProfitData,
          tokenB,
        });
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

    const maxProfitData = profitMap.get(maxProfit) as {
      tokenB: Token;
      expectedProfit: Decimal;
      swap1FeePercentage: Decimal;
      swap2FeePercentage: Decimal;
      swap3FeePercentage: Decimal;
    };

    if (maxProfitData.tokenB === undefined) {
      throw new Error("Token B not found");
    }

    return maxProfitData;
  }

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
   * Retrieves a list of possible intermediary tokens B (that are not A or C).
   * Token B participates in pools with tokens A and token C.
   *
   * @param tokenASymbol - Symbol of token A.
   * @param tokenCSymbol - Symbol of token C.
   * @returns An array of tokens satisfying the criteria.
   */
  protected getPossibleIntermediaryTokens(
    tokenASymbol: string,
    tokenCSymbol: string
  ): Token[] {
    const poolsA = this.inputTokenSymbolIndex.get(tokenASymbol);
    const poolsC = this.inputTokenSymbolIndex.get(tokenCSymbol);

    if (poolsA === undefined || poolsC === undefined) {
      return [];
    }

    const possibleBs = this.findPossibleBs(poolsA, tokenASymbol, tokenCSymbol);
    return this.findCommonBs(poolsC, tokenASymbol, tokenCSymbol, possibleBs);
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
