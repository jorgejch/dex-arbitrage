/**
 * @fileoverview Typescript types for used in AFLAB
 */

import { BaseSwap } from "./swaps/baseSwap.js";

import { Decimal } from "decimal.js";

/**
 * Opportunity object
 * @typedef {Object} Opportunity
 *
 */
type Opportunity = {
  tokenA: Token;
  tokenC: Token;
  tokenAIn: Decimal;
  lastPoolSqrtPriceX96: Decimal;
  originalSwap: BaseSwap;
  tokenB: Token | undefined;
  expectedProfit: Decimal | undefined;
  originalSwapPriceImpact: number | undefined;
};

/**
 * Contract type enum
 * @enum {string}
 */
enum ContractType {
  TEST,
  POOL,
}

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
 * @property {string} id The pool ID
 * @property {Object} pool The pool object
 * @property {string} pool.name The pool name
 * @property {string} pool.symbol The pool symbol
 * @property {Array<Fee>} pool.fees The pool fees
 * @property {Array<Token>} pool.inputTokens The pool input tokens
 */
type Pool = {
  id: string;
  name: string;
  symbol: string;
  inputTokens: Token[];
  fees: Fee[];
};

export { Pool, Token, Fee, ContractType, Opportunity };
