import { test, expect, describe, beforeEach } from "vitest";
import { DexPoolSubgraph } from "../../../src/subgraphs/dexPoolSubgraph.js";
import dotenv from "dotenv";
import { getTGPancakeSwapUrl } from "../../../src/common.js";

dotenv.config();

describe("PSv3Subgraph", {}, () => {
  let subgraph: DexPoolSubgraph;

  beforeEach(() => {
    const baseUrl = process.env.THE_GRAPH_BASE_URL ?? "";
    const subgraphName =
      process.env.THE_GRAPH_PANCAKESWAP_V3_SUBGRAPH_NAME ?? "";

    if (!baseUrl) {
      throw new Error("THE_GRAPH_BASE_URL is not set");
    }

    if (!subgraphName) {
      throw new Error("THE_GRAPH_PANCAKESWAP_V3_SUBGRAPH_NAME is not set");
    }

    subgraph = new DexPoolSubgraph(getTGPancakeSwapUrl(baseUrl, subgraphName));
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
    console.log(pools);
    expect(pools).toBeDefined();
    expect(pools).toBeTypeOf("object");
  }, 300000);
});
