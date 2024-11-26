import poolFactoryAbi from "./abis/pancakeSwapV3FactoryAbi.js";
import poolAbi from "./abis/pancakeSwapv3PoolAbi.js";
import aflabAbi from "./abis/flashLoanArbitrageAbi.js";

/**
 * Mostly static configuration values
 */
const config = {
  LOGGER_PREFIX: "FlashLoanArbitrage",
  POOL_FACTORY_ADDRESS: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
  POOL_FACTORY_ABI: poolFactoryAbi,
  POOL_ABI: poolAbi,
  AFLAB_ABI: aflabAbi,
  RECONNECT_INTERVAL_BASE: 1000, // Base interval for WSS reconnection attempts in milliseconds
  EXPECTED_PONG_BACK: 5000, // Time to wait for a pong response in milliseconds
  KEEP_ALIVE_CHECK_INTERVAL: 7500, // Interval for sending ping messages in milliseconds
  SIMULATE_DISCONNECT_INTERVAL: 15000, // Interval to simulate disconnections in milliseconds
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
 * Logger class.
 */
class Logger {
  private readonly prefix: string;

  /**
   * @param prefix The logger prefix
   */
  constructor(prefix: string) {
    this.prefix = prefix;
  }

  private formatMessage(message: string, extraPrefix?: string): string {
    const prefix = extraPrefix ? `[${this.prefix}][${extraPrefix}]` : `[${this.prefix}]`;
    return `${prefix}${message}`;
  }

  public debug(message: string, extraPrefix?: string): void {
    console.debug(this.formatMessage(`[DEBUG] ${message}`, extraPrefix));
  }

  public info(message: string, extraPrefix?: string): void {
    console.log(this.formatMessage(`[INFO] ${message}`, extraPrefix));
  }

  public warn(message: string, extraPrefix?: string): void {
    console.warn(this.formatMessage(`[WARN] ${message}`, extraPrefix));
  }

  public error(message: string, extraPrefix?: string): void {
    console.error(this.formatMessage(`[ERROR] ${message}`, extraPrefix));
  }
}

const logger = new Logger(config.LOGGER_PREFIX);

export { config, getTGPancakeSwapUrl as getTGPancakeSwapMessariUrl, exponentialBackoffDelay, logger };
