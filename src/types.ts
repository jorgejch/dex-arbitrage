/**
 * @fileoverview Typescript types for used in AFLAB
 */

import { Decimal } from "decimal.js";
import { BaseSwap } from "./swaps/baseSwap.js";

import { BigNumber } from "alchemy-sdk";

/**
 * Contract type enum
 * @enum {string}
 */
enum ContractType {
  TEST,
  POOL,
  AFLAB,
  POOL_ADDRESS_PROVIDER,
}

/**
 * Expected profit data.
 *
 * @typedef {Object} ExpectedProfitData
 * @property {BigNumber} expectedProfit The expected profit
 * @property {BigNumber} swap1FeeBigNumber The fee tier for swap 1
 * @property {BigNumber} swap2FeeBigNumber The fee tier for swap 2
 * @property {BigNumber} swap3FeeBigNumber The fee tier for swap 3
 */
type ExpectedProfitData = {
  expectedProfit: BigNumber;
  swap1FeeBigNumber: BigNumber;
  swap2FeeBigNumber: BigNumber;
  swap3FeeBigNumber: BigNumber;
};

/**
 * Token B pick data.
 * @typedef {Object} TokenBPickData
 * @property {ExpectedProfitData} expectedProfitData The expected profit data
 * @property {Token} tokenB The token B
 */
type TokenBPickData = {
  expectedProfitData: ExpectedProfitData;
  tokenB: Token;
};

/**
 * Net output data.
 *
 * @typedef {Object} NetOutputData
 * @property {Decimal} price The price
 * @property {BigNumber} netOutput The net output
 * @property {BigNumber} grossOutput The gross output
 * @property {Decimal} feeDecimal The fee decimal
 * @property {BigNumber} fee The fee
 */
type NetOutputData = {
  price: Decimal;
  netOutput: BigNumber;
  grossOutput: BigNumber;
  feeDecimal: Decimal;
  fee: BigNumber;
};

/**
 * Opportunity individual swap information.
 */
type SwapInfo = {
  tokenIn: Token;
  tokenOut: Token;
  poolFee: BigNumber;
  amountOutMinimum: BigNumber;
};

/**
 * Triangular arbitrage information.
 */
type ArbitrageInfo = {
  swap1: SwapInfo | undefined;
  swap2: SwapInfo | undefined;
  swap3: SwapInfo | undefined;
  estimatedGasCost: BigNumber;
};

/**
 * Represents an arbitrage opportunity.
 *
 * @typedef {Object} Opportunity
 * @property {ArbitrageInfo} arbitInfo - Information about the arbitrage.
 * @property {BigNumber} tokenAIn - The amount of token A involved in the arbitrage.
 * @property {BigNumber} lastPoolSqrtPriceX96 - The last square root price of the pool in X96 format.
 * @property {BaseSwap} originalSwap - The original swap details.
 * @property {BigNumber | undefined} expectedProfit - The expected profit from the arbitrage, if any.
 * @property {number | undefined} originalSwapPriceImpact - The price impact of the original swap, if any.
 */
type Opportunity = {
  arbitInfo: ArbitrageInfo;
  tokenAIn: BigNumber;
  lastPoolSqrtPriceX96: BigNumber;
  originalSwap: BaseSwap;
  expectedProfit: BigNumber | undefined;
  originalSwapPriceImpact: number | undefined;
};

/**
 * Token object
 * @typedef {Object} Token
 * @property {string} id The token ID
 * @property {string} name The token name
 * @property {string} symbol The token symbol
 * @property {number} decimals The token decimals
 */
type Token = {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
};

/**
 * Fee object
 * @typedef {Object} Fee
 * @property {number} feePercentage The fee percentage
 * @property {string} feeType The fee type
 */
type Fee = {
  feePercentage: number;
  feeType: string;
};

/**
 * Hourly snapshot object
 * @typedef {Object} HourlySnapshot
 * @property {number} hourlySwapCount The hourly swap count
 * @property {number} hourlyVolumeUSD The hourly volume in USD
 * @property {number} timestamp The timestamp of the hourly snapshot
 */
type HourlySnapshot = {
  hourlySwapCount: number;
  hourlyVolumeUSD: number;
  timestamp: number;
};

/**
 * Pool object
 * @typedef {Object} Pool
 * @property {string} id The pool address
 * @property {Object} pool The pool object
 * @property {string} pool.name The pool name
 * @property {string} pool.symbol The pool symbol
 * @property {Array<Fee>} pool.fees The fees related to this pool
 * @property {Array<Token>} pool.inputTokens The pool input tokens
 */
type Pool = {
  id: string;
  name: string;
  symbol: string;
  inputTokens: Token[];
  fees: Fee[];
};

export {
  Pool,
  Token,
  Fee,
  ContractType,
  Opportunity,
  SwapInfo,
  ArbitrageInfo,
  HourlySnapshot,
  ExpectedProfitData,
  NetOutputData,
  TokenBPickData,
};
