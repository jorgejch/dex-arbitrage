import poolAbi from "./abis/pancakeSwapv3PoolAbi.js";
import aflabAbi from "./abis/flashLoanArbitrageAbi.js";
import { Int } from "graffle/utilities-for-generated";

/**
 * Mostly static configuration values
 */
const config = {
  LOGGER_PREFIX: "FlashLoanArbitrage",
  POOL_ABI: poolAbi,
  AFLAB_ABI: aflabAbi,
  LOG_LEVEL: "INFO",
  RECONNECT_INTERVAL_BASE: 1000, // Base interval for WSS reconnection attempts in milliseconds
  EXPECTED_PONG_BACK: 5000, // Time to wait for a pong response in milliseconds
  KEEP_ALIVE_CHECK_INTERVAL: 7500, // Interval for sending ping messages in milliseconds
  SIMULATE_DISCONNECT_INTERVAL: 15000, // Interval to simulate disconnections in milliseconds
  PRICE_IMPACT_THRESHOLD: 3, // Price impact threshold for arbitrage opportunities in bps
};

/**
 * Get the The Graph PancakeSwap v3 subgraph URL.
 *
 * @param apiKey The API key
 * @returns The The Graph PancakeSwap v3 subgraph URL
 */
const getTGPancakeSwapUrl = (baseUrl: string, subgraphName: string) => {
  return `${baseUrl}/subgraphs/name/${subgraphName}`;
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
  baseDelay: number = 100
): Promise<void> {
  const delay = Math.pow(2, attempt) * baseDelay + Math.random() * baseDelay; // Add jitter to avoid collisions
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Converts a Q64.96 fixed-point number to a BigInt representing the price.
 *
 * @param sqrtPriceX96 The Q64.96 fixed-point number representing the square root of the price
 * @returns The price as a BigInt
 */
function convertSqrtPriceX96ToBigInt(sqrtPriceX96: bigint): bigint {
  const priceBigInt = sqrtPriceX96 ** BigInt(2) / BigInt(2) ** BigInt(96);
  return priceBigInt;
}

/**
 * Check if a price impact is significant.
 *
 * @param priceImpact The price impact in bps
 */
function isPriceImpactSignificant(priceImpact: bigint): boolean {
  const threshold = config.PRICE_IMPACT_THRESHOLD;
  return (priceImpact < BigInt(0) ? -priceImpact : priceImpact) >= threshold;
}

/**
 * Logger class.
 */
class Logger {
  private readonly prefix: string;
  private logLevel: string;

  /**
   * @param prefix The logger prefix
   */
  constructor(prefix: string, logLevel: string = "INFO") {
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
  getTGPancakeSwapUrl,
  exponentialBackoffDelay,
  isPriceImpactSignificant,
  convertSqrtPriceX96ToBigInt,
  getHoursSinceUnixEpoch as getLastFullHourUnixTime,
  logger,
  Logger,
};
