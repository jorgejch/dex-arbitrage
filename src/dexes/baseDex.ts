import { WebSocketManager } from "../ws.js";
import { Pool, Token } from "../types.js";
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
   * Calculates the expected profit for a series of swaps.
   *
   * @param tokenA The initial token
   * @param tokenB The intermediary token
   * @param tokenC The final token
   * @param inputAmount The input amount of tokenA
   * @param swap1PoolContract The pool contract where the first swap occurs
   * @param swap2PoolContract The pool contract where the second swap occurs
   * @param swap3PoolContract The pool contract where the third swap occurs
   * @returns The expected profit in terms of Token A
   */
  private calculateExpectedProfit(
    tokenA: Token,
    tokenB: Token,
    tokenC: Token,
    inputAmount: Decimal,
    swap1PoolContract: PoolContract,
    swap2PoolContract: PoolContract,
    swap3PoolContract: PoolContract
  ): Decimal {
    // Step 1: Token A to Token B
    const sqrtPriceX96AtoB = swap1PoolContract.getLastPoolSqrtPriceX96();
    if (!sqrtPriceX96AtoB) {
      logger.warn(
        "Last price value for Token A to Token B swap has not been initialized.",
        this.constructor.name
      );
      return new Decimal(0);
    }

    const priceAtoB: Decimal = sqrtPriceX96ToDecimal(
      sqrtPriceX96AtoB,
      tokenA.decimals,
      tokenB.decimals
    );
    const adjustedPriceAtoB: Decimal = priceAtoB.mul(
      new Decimal(10)).pow(tokenA.decimals - tokenB.decimals);
    const grossOutputB: Decimal = inputAmount.mul(adjustedPriceAtoB);
    const feeAtoB: Decimal = swap1PoolContract.getPoolFee(grossOutputB);
    const netOutputB = grossOutputB.sub(feeAtoB);
    if (netOutputB.lte(new Decimal(0))) {
      logger.info(
        `Net output for Token A to Token B swap is less than or equal to zero.\n\tNet output: ${netOutputB}\n\tGross output: ${grossOutputB}\n\tFee: ${feeAtoB}\n\tPrice: ${priceAtoB}`,
        this.constructor.name
      );
      return new Decimal(0);
    }

    // Step 2: Token B to Token C
    const sqrtPriceX96BtoC = swap2PoolContract.getLastPoolSqrtPriceX96();
    if (!sqrtPriceX96BtoC) {
      logger.warn(
        "Last price value for Token B to Token C swap has not been initialized.",
        this.constructor.name
      );
      return new Decimal(0);
    }

    const priceBtoC: Decimal = sqrtPriceX96ToDecimal(
      sqrtPriceX96BtoC,
      tokenB.decimals,
      tokenC.decimals
    );
    const adjustedPriceBtoC: Decimal = priceBtoC.mul(
      new Decimal(10).pow(tokenB.decimals - tokenC.decimals)
    );
    const grossOutputC: Decimal = netOutputB.mul(adjustedPriceBtoC);
    const feeBtoC: Decimal = swap2PoolContract.getPoolFee(grossOutputC);
    const netOutputC: Decimal = grossOutputC.sub(feeBtoC);
    if (netOutputC.lte(new Decimal(0))) {
      logger.info(
        `Net output for Token B to Token C swap is less than or equal to zero.\n\tNet output: ${netOutputC}\n\tGross output: ${grossOutputC}\n\tFee: ${feeBtoC}\n\tPrice: ${priceBtoC}`,
        this.constructor.name
      );
      return new Decimal(0);
    }

    // Step 3: Token C to Token A
    const sqrtPriceX96CtoA = swap3PoolContract.getLastPoolSqrtPriceX96();
    if (!sqrtPriceX96CtoA) {
      logger.warn(
        "Last price value for Token C to Token A swap has not been initialized.",
        this.constructor.name
      );
      return new Decimal(0);
    }

    const priceCtoA = sqrtPriceX96ToDecimal(
      sqrtPriceX96CtoA,
      tokenC.decimals,
      tokenA.decimals
    );
    const adjustedPriceCtoA: Decimal = priceCtoA.mul(
      new Decimal(10).pow(tokenA.decimals - tokenC.decimals)
    );
    const grossOutputA: Decimal = netOutputC.mul(adjustedPriceCtoA);
    const feeCtoA: Decimal = swap3PoolContract.getPoolFee(grossOutputA);
    const netOutputA: Decimal = grossOutputA.sub(feeCtoA);
    if (netOutputA.lte(new Decimal(0))) {
      logger.info(
        `Net output for Token C to Token A swap is less than or equal to zero.\n\tNet output: ${netOutputA}\n\tGross output: ${grossOutputA}\n\tFee: ${feeCtoA}\n\tPrice: ${priceCtoA}`,
        this.constructor.name
      );
      return new Decimal(0);
    }

    // Calculate the expected profit
    const expectedProfit: Decimal = netOutputA.sub(inputAmount);
    return expectedProfit;
  }

  private getContracstsForTokens(
    tokenA: Token,
    tokenB: Token
  ): PoolContract | undefined {
    const poolsA = this.inputTokenSymbolIndex.get(tokenA.symbol);
    const poolsB = this.inputTokenSymbolIndex.get(tokenB.symbol);

    if (poolsA === undefined || poolsB === undefined) {
      throw new Error("No pools found for tokens");
    }

    const commonPools = poolsA.filter((pool) => poolsB.includes(pool));

    if (commonPools.length === 0) {
      throw new Error("No common pools found for tokens");
    }

    return this.getContract(commonPools[0].id);
  }

  /**
   * Selects the intermediary token (Token B) for a triangular arbitrage opportunity.
   * Evaluates potential intermediary tokens by calculating the expected profit for each candidate token.
   * The arbitrage involves three swaps, each incurring fees. Profit is calculated as:
   * profit = outputCtoA - inputAmount
   *
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
    inputAmount: bigint,
    swapPoolContract: PoolContract
  ): [Token | undefined, Decimal | undefined] {
    const profitMap = new Map<Decimal, Token>();

    if (!possibleBs) {
      return [undefined, undefined];
    }

    const decimalInputAmount: Decimal = new Decimal(inputAmount.toString());

    for (const tokenB of possibleBs) {
      const swap1PoolContract = this.getContracstsForTokens(tokenA, tokenB);
      const swap2PoolContract = this.getContracstsForTokens(tokenB, tokenC);
      const swap3PoolContract = swapPoolContract;

      if (!swap1PoolContract || !swap2PoolContract || !swap3PoolContract) {
        return [undefined, undefined];
      }

      const profit: Decimal = this.calculateExpectedProfit(
        tokenA,
        tokenB,
        tokenC,
        decimalInputAmount,
        swap1PoolContract,
        swap2PoolContract,
        swap3PoolContract
      );

      if (profit > new Decimal(0)) {
        profitMap.set(profit, tokenB);
      }
    }

    if (profitMap.size === 0) {
      return [undefined, undefined];
    }

    let maxProfit = new Decimal(0);
    for (const profit of profitMap.keys()) {
      if (profit.gt(maxProfit)) {
        maxProfit = profit;
      }
    }
    return [profitMap.get(maxProfit), maxProfit];
  }

  protected async triggerSmartContract(
    tokenA: Token,
    tokenB: Token,
    tokenC: Token,
    profit: Decimal
  ) {
    // Logic to trigger smart contract execution
  }

  protected logOpportunities(
    tokenA: Token,
    tokenB: Token,
    tokenC: Token,
    profit: Decimal
  ) {
    logger.info(
      `Arbitrage opportunity found: ${tokenA.symbol} -> ${tokenB.symbol} -> ${tokenC.symbol} -> ${tokenA.symbol}`,
      this.constructor.name
    );
    logger.info(`Expected profit: ${profit}`, this.constructor.name);
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
