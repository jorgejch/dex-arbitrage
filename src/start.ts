import { logger } from "./common.js";
import { Controller } from "./controller.js";
import dotenv from "dotenv";

dotenv.config();

// Load environment variables
const WSS_PROVIDER_URL: string = process.env.FAST_RPC_WSS_ENDPOINT ?? "";
const HTTP_PROVIDER_URL: string = process.env.FAST_RPC_HTTP_ENDPOINT ?? "";
const WALLET_PRIVATE_KEY: string = process.env.WALLET_PRIVATE_KEY ?? "";
const AFLAB_CONTRACT_ADDRESS: string = process.env.CONTRACT_ADDRESS ?? "";
const SIMULATE_DISCONNECT: boolean =
  process.env.SIMULATE_WSS_DISCONNECT === "true";
const THE_GRAPH_BASE_URL: string = process.env.THE_GRAPH_BASE_URL ?? "";
const PANCAKESWAP_V3_SUBGRAPH_NAME: string =
  process.env.THE_GRAPH_PANCAKESWAP_V3_SUBGRAPH_ID ?? "";
const THE_GRAPH_API_KEY: string = process.env.THE_GRAPH_API_KEY ?? "";

let controller: Controller;

async function main() {
  if (!HTTP_PROVIDER_URL) {
    throw new Error("HTTP_PROVIDER_URL is not set");
  }
  if (!WALLET_PRIVATE_KEY) {
    throw new Error("WALLET_PRIVATE_KEY is not set");
  }
  if (!WSS_PROVIDER_URL) {
    throw new Error("WSS_PROVIDER_URL is not set");
  }
  if (!AFLAB_CONTRACT_ADDRESS) {
    throw new Error("AFLAB_CONTRACT_ADDRESS is not set");
  }
  if (!THE_GRAPH_BASE_URL) {
    throw new Error("THE_GRAPH_API_KEY is not set");
  }
  if (!PANCAKESWAP_V3_SUBGRAPH_NAME) {
    throw new Error("PANCAKESWAP_V3_SUBGRAPH_NAME is not set");
  }
  if (!THE_GRAPH_API_KEY) {
    throw new Error("THE_GRAPH_API_KEY is not set");
  }
  if (SIMULATE_DISCONNECT) {
    console.log("Simulating WebSocket disconnections");
  }

  controller = new Controller(
    HTTP_PROVIDER_URL,
    WSS_PROVIDER_URL,
    WALLET_PRIVATE_KEY,
    AFLAB_CONTRACT_ADDRESS,
    THE_GRAPH_BASE_URL,
    THE_GRAPH_API_KEY,
    PANCAKESWAP_V3_SUBGRAPH_NAME,
    SIMULATE_DISCONNECT
  );

  try {
    await controller.start();
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
