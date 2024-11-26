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

  public debug(message: string): void {
    console.debug(`[${this.prefix}] [DEBUG] ${message}`);
  }

  public info(message: string): void {
    console.log(`[${this.prefix}] [INFO] ${message}`);
  }

  public warn(message: string): void {
    console.warn(`[${this.prefix}] [WARN] ${message}`);
  }

  public error(message: string): void {
    console.error(`[${this.prefix}] [ERROR] ${message}`);
  }
}

const logger = new Logger(config.LOGGER_PREFIX);

export { config, getTGPancakeSwapUrl as getTGPancakeSwapMessariUrl, exponentialBackoffDelay, logger };
