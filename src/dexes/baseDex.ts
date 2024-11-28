import { WebSocketManager } from "../ws.js";
import { Pool, Token } from "../types.js";
import { PoolContract } from "../contracts/poolContract.js";
import { BaseSwap } from "../swaps/baseSwap.js";
import { DexPoolSubgraph } from "../subgraphs/dexPoolSubgraph.js";
import { logger, convertSqrtPriceX96ToBigInt } from "../common.js";
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
   * Calculates the expected profit for a triangular arbitrage opportunity.
   *
   * @param tokenA The starting token (Token A in the arbitrage cycle).
   * @param tokenB The intermediate token (Token B in the arbitrage cycle).
   * @param tokenC The final token used to return to Token A.
   * @param inputAmount The amount of token A to swap.
   * @param swap1PoolContract The pool contract where the initial and final swap occurs.
   * @param swap2PoolContract The pool contract where the second swap occurs.
   * @returns The expected profit in terms of Token A.
   */
  private calculateExpectedProfit(
    tokenA: Token,
    tokenB: Token,
    tokenC: Token,
    inputAmount: bigint,
    swap1PoolContract: PoolContract,
    swap2PoolContract: PoolContract,
    swap3PoolContract: PoolContract
  ): bigint {
    if (!swap1PoolContract || !swap2PoolContract || !swap3PoolContract) {
      throw new Error("Swap pool contract not found");
    }

    // Step 1: Calculate the cost of swapping Token A for Token B and obtain the output amount
    const lastPoolSqrtPriceX96AtoB =
      swap1PoolContract.getLastPoolSqrtPriceX96();

    if (!lastPoolSqrtPriceX96AtoB) {
      logger.warn("Sqrt price of Token A to Token B swap contract, not initialized.")
      return BigInt(0);
    }

    const priceAtoB = convertSqrtPriceX96ToBigInt(lastPoolSqrtPriceX96AtoB);
    const feeAtoB = swap1PoolContract.getPoolFee(inputAmount);
    const outputAtoB =
      (inputAmount * BigInt(10 ** tokenB.decimals)) / priceAtoB - feeAtoB;

    // Step 2: Calculate the cost of swapping Token B for Token C and obtain the output amount
    const lastPoolSqrtPriceX96BtoC =
      swap2PoolContract.getLastPoolSqrtPriceX96();

    if (!lastPoolSqrtPriceX96BtoC) {
      logger.warn("Sqrt price of Token B to Token C swap contract, not initialized.")
      return BigInt(0);
    }

    const feeBtoC = swap2PoolContract.getPoolFee(outputAtoB);
    const priceBtoC = convertSqrtPriceX96ToBigInt(
      swap2PoolContract.getLastPoolSqrtPriceX96()
    );
    const outputBtoC =
      (outputAtoB * BigInt(10 ** tokenC.decimals)) / priceBtoC - feeBtoC;

    // Step 3: Calculate the cost of swapping Token C for Token A and obtain the output amount
    const lastPoolSqrtPriceX96CtoA =
      swap3PoolContract.getLastPoolSqrtPriceX96();

    if (!lastPoolSqrtPriceX96CtoA) {
      logger.warn("Sqrt price of Token B to Token C swap contract, not initialized.")
      return BigInt(0);
    }

    const priceCtoA = convertSqrtPriceX96ToBigInt(
      swap3PoolContract.getLastPoolSqrtPriceX96()
    );
    const feeCtoA = swap3PoolContract.getPoolFee(outputBtoC);
    const outputCtoA =
      (outputBtoC * BigInt(10 ** tokenA.decimals)) / priceCtoA - feeCtoA;

    // Step 4: Calculate profit
    const profit = outputCtoA - inputAmount;

    return profit;
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
  ): [Token | undefined, bigint | undefined] {
    const profitMap = new Map<bigint, Token>();

    if (!possibleBs) {
      return [undefined, undefined];
    }

    for (const tokenB of possibleBs) {
      const swap1PoolContract = this.getContracstsForTokens(tokenA, tokenB);
      const swap2PoolContract = this.getContracstsForTokens(tokenB, tokenC);
      const swap3PoolContract = swapPoolContract;

      if (!swap1PoolContract || !swap2PoolContract || !swap3PoolContract) {
        return [undefined, undefined];
      }

      const profit: bigint = this.calculateExpectedProfit(
        tokenA,
        tokenB,
        tokenC,
        inputAmount,
        swap1PoolContract,
        swap2PoolContract,
        swap3PoolContract
      );

      if (profit > BigInt(0)) {
        profitMap.set(profit, tokenB);
      }
    }

    const maxProfit: bigint = Array.from(profitMap.keys()).reduce(
      (a, b) => (a > b ? a : b),
      BigInt(0)
    );

    if (profitMap.size === 0) {
      return [undefined, undefined];
    }

    return [profitMap.get(maxProfit), maxProfit];
  }

  protected async triggerSmartContract(
    tokenA: Token,
    tokenB: Token,
    tokenC: Token,
    profit: bigint
  ) {
    // Logic to trigger smart contract execution
  }

  protected logOpportunities(
    tokenA: Token,
    tokenB: Token,
    tokenC: Token,
    profit: bigint
  ) {
    logger.info(
      `Arbitrage opportunity found: ${tokenA.symbol} -> ${tokenB.symbol} -> ${tokenC.symbol}`,
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
