import {Token} from "../types.js";
import {sqrtPriceX96ToDecimal} from "../common.js";

import {BigNumber} from "alchemy-sdk";
import {Decimal} from "decimal.js";

/**
 * BaseSwap is an abstract class that represents a swap event.
 * It contains the common properties and methods for all swap events.
 *
 * @abstract
 *
 * @property {string} sender - The address of the sender initiating the swap.
 * @property {string} recipient - The address of the recipient receiving the swap.
 * @property {bigint} amount0 - The amount of token0 involved in the swap.
 * @property {bigint} amount1 - The amount of token1 involved in the swap.
 * @property {BigNumber} sqrtPriceX96 - The square root of the price after the swap times 2^96, used for precision in calculations.
 * @property {bigint} liquidity - The liquidity of the pool after the swap.
 * @property {string} poolContractAddress - The address of the pool contract where the swap occurred.
 * @property {Token[]} [inputTokens] - Optional array of input tokens for the swap.
 */
abstract class BaseSwap {
  sender: string;
  recipient: string;
  amount0: bigint;
  amount1: bigint;
  sqrtPriceX96: BigNumber;
  liquidity: bigint;
  poolContractAddress: string;
  inputTokens?: Token[];

  protected constructor(
    sender: string,
    recipient: string,
    amount0: bigint,
    amount1: bigint,
    sqrtPriceX96: BigNumber,
    liquidity: bigint,
    poolContractAddress: string
  ) {
    this.sender = sender;
    this.recipient = recipient;
    this.amount0 = amount0;
    this.amount1 = amount1;
    this.sqrtPriceX96 = sqrtPriceX96;
    this.liquidity = liquidity;
    this.poolContractAddress = poolContractAddress;
  }

  /**
   * Set the input tokens for the swap
   *
   * @param tokens The input tokens
   */
  public setTokens(tokens: Token[]) {
    this.inputTokens = tokens;
  }

  /**
   * Get the input tokens for the swap
   *
   * @returns The input tokens
   * @throws An error if the input tokens are not set
   */
  public getTokens(): Token[] {
    if (this.inputTokens === undefined) {
      throw new Error("Input tokens not set");
    }

    return this.inputTokens;
  }

  /**
   * Calculate the price impact of the swap
   *
   * @param lastPoolSqrtPriceX96 The square root of the price before the swap times 2^96
   * @param token0BigNumbers The number of BigNumbers for token0
   * @param token1BigNumbers The number of BigNumbers for token1
   * @returns The price impact of the swap in basis points
   * @throws An error if the price before the swap is zero
   */
  public calculatePriceImpact(
    lastPoolSqrtPriceX96: BigNumber,
    token0BigNumbers: number,
    token1BigNumbers: number
  ): number {
    if (lastPoolSqrtPriceX96.eq(0)) {
      throw new Error("Division by zero error: priceBefore is zero");
    }

    // Calculate the price before the swap
    const priceAfter: Decimal = sqrtPriceX96ToDecimal(
      this.sqrtPriceX96,
      token0BigNumbers,
      token1BigNumbers
    );

    const priceBefore: Decimal = sqrtPriceX96ToDecimal(
      lastPoolSqrtPriceX96,
      token0BigNumbers,
      token1BigNumbers
    );

    // Calculate the price impact in bps.
    const priceImpact: Decimal = priceAfter
      .sub(priceBefore)
      .div(priceBefore)
      .mul(10000); // Convert to basis points (bps)

    return priceImpact.abs().round().toNumber();
  }

  public getContractAddress(): string {
    return this.poolContractAddress;
  }
}

export { BaseSwap };
