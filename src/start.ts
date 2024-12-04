import { logger, config } from "./common.js";
import { Controller } from "./controller.js";
import dotenv from "dotenv";

dotenv.config();

// Load environment variables
const LOG_LEVEL: string = process.env.LOG_LEVEL ?? config.LOG_LEVEL;
const ALCHEMY_API_KEY: string = process.env.ALCHEMY_API_KEY ?? "";
const WALLET_PRIVATE_KEY: string = process.env.WALLET_PRIVATE_KEY ?? "";
const UNISWAP_V3_AFLAB_CONTRACT_ADDRESS: string =
  process.env.UNISWPV3_CONTRACT_ADDRESS ?? "";
const THE_GRAPH_BASE_URL: string = process.env.THE_GRAPH_BASE_URL ?? "";
const UNISWAP_V3_SUBGRAPH_ID: string =
  process.env.THE_GRAPH_UNISWAP_V3_SUBGRAPH_ID ?? "";
const THE_GRAPH_API_KEY: string = process.env.THE_GRAPH_API_KEY ?? "";

let controller: Controller;

async function main() {
  if (!ALCHEMY_API_KEY) {
    throw new Error("ALCHEMY_API_KEY is not set");
  }
  if (!WALLET_PRIVATE_KEY) {
    throw new Error("WALLET_PRIVATE_KEY is not set");
  }
  if (!UNISWAP_V3_AFLAB_CONTRACT_ADDRESS) {
    throw new Error("UNISWAP_V3_AFLAB_CONTRACT_ADDRESS is not set");
  }
  if (!THE_GRAPH_BASE_URL) {
    throw new Error("THE_GRAPH_API_KEY is not set");
  }
  if (!UNISWAP_V3_SUBGRAPH_ID) {
    throw new Error("UNISWAP_V3_SUBGRAPH_ID is not set");
  }
  if (!THE_GRAPH_API_KEY) {
    throw new Error("THE_GRAPH_API_KEY is not set");
  }

  // Set the log level
  logger.setLogLevel(LOG_LEVEL);

  controller = new Controller(
    WALLET_PRIVATE_KEY,
    UNISWAP_V3_AFLAB_CONTRACT_ADDRESS,
    THE_GRAPH_BASE_URL,
    THE_GRAPH_API_KEY,
    UNISWAP_V3_SUBGRAPH_ID,
    ALCHEMY_API_KEY
  );

  try {
    await controller.start();
    logger.info(
      `\n############ Controller Started ############\n` +
        `- UNISWAP_V3_AFLAB_CONTRACT_ADDRESS: ${UNISWAP_V3_AFLAB_CONTRACT_ADDRESS}\n` +
        `- THE_GRAPH_BASE_URL: ${THE_GRAPH_BASE_URL}\n` +
        `- UNISWAP_V3_SUBGRAPH_ID: ${UNISWAP_V3_SUBGRAPH_ID}\n` +
        `- Log Level: ${LOG_LEVEL}\n` +
        `############################################`
    );
    logger.info("Controller scanning for arbitrage opportunities...");
  } catch (error) {
    logger.error(`Error running Controller: ${error}`);
    controller.stop();
  }
}

try {
  await main();
} catch (error) {
  logger.error(`Error starting Controller: ${error}`);
}
