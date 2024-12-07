import { DexPoolSubgraph } from "../../../src/subgraphs/dexPoolSubgraph.js";
import { getTGUrl } from "../../../src/common.js";
import dotenv from "dotenv";
import { test, expect, describe, beforeEach } from "vitest";

dotenv.config();

describe("UniswapV3Subgraph", {}, () => {
  let subgraph: DexPoolSubgraph;

  beforeEach(() => {
    const baseUrl = process.env.THE_GRAPH_BASE_URL ?? "";
    const subgraphName = process.env.THE_GRAPH_UNISWAP_V3_SUBGRAPH_ID ?? "";
    const apiKey = process.env.THE_GRAPH_API_KEY ?? "";

    if (!baseUrl) {
      throw new Error("THE_GRAPH_BASE_URL is not set");
    }

    if (!subgraphName) {
      throw new Error("THE_GRAPH_PANCAKESWAP_V3_SUBGRAPH_ID is not set");
    }

    if (!apiKey) {
      throw new Error("THE_GRAPH_API_KEY is not set");
    }

    console.log(getTGUrl(baseUrl, subgraphName, apiKey));
    subgraph = new DexPoolSubgraph(getTGUrl(baseUrl, subgraphName, apiKey));
    subgraph.initialize();
  });

  test("getPools() should return a list of 2 pools, in parallel", async () => {
    const pools = await subgraph.getPools(1, 2, 1);
    console.log(pools);
    expect(pools).toBeDefined();
    expect(pools).toBeTypeOf("object");
  }, 60000);

  test("getPools() should return a list of 4 pools, in parallel and paginating", async () => {
    const pools = await subgraph.getPools(4, 2, 1);
    console.log(pools);
    expect(pools).toBeDefined();
    expect(pools).toBeTypeOf("object");
  }, 60000);

  test("getPools() should return a default list of pools, in parallel and paginating", async () => {
    const pools = await subgraph.getPools();
    expect(pools).toBeDefined();
    expect(pools).toBeTypeOf("object");
    console.log(pools.length);
  }, 30000);
});
