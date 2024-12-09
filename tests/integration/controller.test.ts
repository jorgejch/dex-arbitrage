import { Controller } from "../../src/controller.js";
import { beforeEach, describe, expect, test } from "vitest";
import dotenv from "dotenv";

dotenv.config();

// Load environment variables
const WALLET_PRIVATE_KEY: string = process.env.WALLET_PRIVATE_KEY ?? "";
const AFLAB_CONTRACT_ADDRESS: string = process.env.CONTRACT_ADDRESS ?? "";
const THE_GRAPH_BASE_URL: string = process.env.THE_GRAPH_BASE_URL ?? "";
const PANCAKESWAP_V3_SUBGRAPH_NAME: string = process.env.THE_GRAPH_PANCAKESWAP_V3_SUBGRAPH_ID ?? "";
const THE_GRAPH_API_KEY: string = process.env.THE_GRAPH_API_KEY ?? "";
const ALCHEMY_API_KEY: string = process.env.ALCHEMY_API_KEY ?? "";
const AAVE_POOL_ADDRESS_PROVIDER_CONTRACT_ADDRESS: string =
    process.env.AAVE_POOL_ADDRESS_PROVIDER_CONTRACT_ADDRESS ?? "";

describe("Controller Tests", {}, () => {
    let controller: Controller;

    beforeEach(() => {
        controller = new Controller(
            WALLET_PRIVATE_KEY,
            AFLAB_CONTRACT_ADDRESS,
            THE_GRAPH_BASE_URL,
            THE_GRAPH_API_KEY,
            PANCAKESWAP_V3_SUBGRAPH_NAME,
            ALCHEMY_API_KEY,
            AAVE_POOL_ADDRESS_PROVIDER_CONTRACT_ADDRESS,
        );
    });
    test.skip("run", async () => {
        expect(controller).toBeDefined();
        try {
            await controller.start();
        } catch (error) {
            console.error(`Error initializing WebSocketManager: ${error}`);
        }
    }, 500000);
});
