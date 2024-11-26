import { Controller } from "../../src/controller.js";
import { describe, test, beforeEach, expect } from "vitest";
import dotenv from "dotenv";

dotenv.config();

// Load environment variables
const WSS_PROVIDER_URL: string = process.env.FAST_RPC_WSS_ENDPOINT ?? "";
const HTTP_PROVIDER_URL: string = process.env.FAST_RPC_HTTP_ENDPOINT ?? "";
const WALLET_PRIVATE_KEY: string = process.env.WALLET_PRIVATE_KEY ?? "";
const AFLAB_CONTRACT_ADDRESS: string = process.env.CONTRACT_ADDRESS ?? "";
const THE_GRAPH_BASE_URL: string = process.env.THE_GRAPH_BASE_URL ?? "";
const PANCAKESWAP_V3_SUBGRAPH_NAME: string =
  process.env.THE_GRAPH_PANCAKESWAP_V3_SUBGRAPH_NAME ?? "";

describe("Controller Tests", {}, () => {
  let controller: Controller;

  beforeEach(() => {
    controller = new Controller(
      HTTP_PROVIDER_URL,
      WSS_PROVIDER_URL,
      WALLET_PRIVATE_KEY,
      AFLAB_CONTRACT_ADDRESS,
      THE_GRAPH_BASE_URL,
      PANCAKESWAP_V3_SUBGRAPH_NAME,
      true
    );
  });
  test("run", async () => {
    expect(controller).toBeDefined();
    try {
      await controller.start();
    } catch (error) {
      console.error(`Error initializing WebSocketManager: ${error}`);
    }
  }, 400000);
});
