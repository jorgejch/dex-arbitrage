import poolAbi from "./abis/uniswapV3PoolAbi.js";
import aflabAbi from "./abis/aflabUniswapV3Abi.js";
import lendingPoolAPAbi from "./abis/lendingPoolAPAbi.js";
import lendingPoolAbi from "./abis/lendingPoolAbi.js";
import {BigNumber} from "alchemy-sdk";
import {Decimal} from "decimal.js";

// Constants
const constants = {
  QI92: new Decimal(
    6277101735386680763835789423207666416102355444464034512896n.toString()
  ),
  MAX_FEE_DECIMAL: new Decimal(0.01),
};

/**
 * Mostly static configuration values
 */
const config = {
  LOGGER_PREFIX: "FlashLoanArbitrage",
  POOL_ABI: poolAbi,
  AFLAB_ABI: aflabAbi,
  LENDING_POOL_AP_ABI: lendingPoolAPAbi,
  LENDING_POOL_ABI: lendingPoolAbi,
  LOG_LEVEL: "INFO",
  RECONNECT_INTERVAL_BASE: 1000, // Base interval for WSS reconnection attempts in milliseconds
  EXPECTED_PONG_BACK: 5000, // Time to wait for a pong response in milliseconds
  KEEP_ALIVE_CHECK_INTERVAL: 7500, // Interval for sending ping messages in milliseconds
  SIMULATE_DISCONNECT_INTERVAL: 15000, // Interval to simulate disconnections in milliseconds
  PRICE_IMPACT_THRESHOLD: 20, // Price impact threshold for arbitrage opportunities in bps
};

/**
 * Get the The Graph PancakeSwap v3 subgraph URL.
 *
 * @param baseUrl The base URL for The Graph Node
 * @param subgraphName The subgraph name
 * @param apiKey The API key
 * @returns The The Graph PancakeSwap v3 subgraph URL
 */
const getTGUrl = (baseUrl: string, subgraphName: string, apiKey: string) => {
  return `${baseUrl}/api/${apiKey}/subgraphs/id/${subgraphName}`;
};

/**
 * Get the number of hours since Unix epoch time minus 1h.
 *
 * @returns The number of hours since Unix epoch time minus 1
 */
function getHoursSinceUnixEpoch(): number {
  const now = new Date();
  const hoursSinceEpoch = Math.floor(now.getTime() / (3600 * 1000));
  return hoursSinceEpoch - 1;
}

/**
 * Exponential backoff delay function.
 *
 * @param attempt The number of the current attempt
 * @param baseDelay Base delay in milliseconds
 * @returns A promise that resolves after a delay
 */
function exponentialBackoffDelay(
  attempt: number,
  baseDelay = 100
): Promise<void> {
  const delay = Math.pow(2, attempt) * baseDelay + Math.random() * baseDelay; // Add jitter to avoid collisions
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Converts a Q64.96 fixed-point number to a float representing the price.
 *
 * @param sqrtPriceX96 The Q64.96 fixed-point number representing the square root of the price
 * @param token0BigNumbers The number of BigNumbers for token0
 * @param token1BigNumbers The number of BigNumbers for token1
 * @returns The price as a Decimal float
 */
function sqrtPriceX96ToDecimal(
  sqrtPriceX96: BigNumber,
  token0BigNumbers: number,
  token1BigNumbers: number
): Decimal {
  const num = sqrtPriceX96.mul(sqrtPriceX96);
  return new Decimal(num.toString())
    .div(constants.QI92)
    .mul(10 ** (token0BigNumbers - token1BigNumbers));
}

/**
 * Check if a price impact is significant.
 *
 * @param priceImpact The price impact in bps
 */
function isPriceImpactSignificant(priceImpact: number): boolean {
  const threshold = config.PRICE_IMPACT_THRESHOLD;
  return (priceImpact < 0 ? -priceImpact : priceImpact) >= threshold;
}

/**
 * Logger class.
 */
class Logger {
  private readonly prefix: string;
  private logLevel: string;

  /**
   * @param prefix The logger prefix
   * @param logLevel The log level
   */
  constructor(prefix: string, logLevel = "INFO") {
    this.prefix = prefix;
    this.logLevel = logLevel.toUpperCase();
  }

  private formatMessage(message: string, extraPrefix?: string): string {
    const prefix = extraPrefix
      ? `[${this.prefix}][${extraPrefix}]`
      : `[${this.prefix}]`;
    return `${prefix}${message}`;
  }

  public setLogLevel(logLevel: string): void {
    this.logLevel = logLevel.toUpperCase();
  }

  public getLogLevel(): string {
    return this.logLevel;
  }

  public debug(message: string, extraPrefix?: string): void {
    if (!["INFO", "WARN", "ERROR"].includes(this.logLevel)) {
      console.debug(this.formatMessage(`[DEBUG] ${message}`, extraPrefix));
    }
  }

  public info(message: string, extraPrefix?: string): void {
    if (!["WARN", "ERROR"].includes(this.logLevel)) {
      console.log(this.formatMessage(`[INFO] ${message}`, extraPrefix));
    }
  }

  public warn(message: string, extraPrefix?: string): void {
    if (this.logLevel === "ERROR") return;
    console.warn(this.formatMessage(`[WARN] ${message}`, extraPrefix));
  }

  public error(message: string, extraPrefix?: string): void {
    console.error(this.formatMessage(`[ERROR] ${message}`, extraPrefix));
  }
}

const logger = new Logger(config.LOGGER_PREFIX, config.LOG_LEVEL);

export {
  config,
  constants,
  logger,
  getTGUrl,
  exponentialBackoffDelay,
  isPriceImpactSignificant,
  sqrtPriceX96ToDecimal,
  getHoursSinceUnixEpoch,
  Logger,
};
