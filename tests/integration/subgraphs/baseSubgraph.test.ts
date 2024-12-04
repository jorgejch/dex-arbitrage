import { describe, test, expect, beforeEach } from "vitest";
import { BaseSubgraph } from "../../../src/subgraphs/baseSubgraph.js";
import { getTGUrl } from "../../../src/common.js";
import dotenv from "dotenv";

dotenv.config();

class TestSubgraph extends BaseSubgraph {
  protected customInit(): void {
    this.addQuery("liqPools", this.gql`{liquidityPools(first: 5) {id}}`);
  }
  constructor(url: string) {
    super(url);
    console.log(`Instantiating Subgraph with url ${url}`);
  }

  public async testQuery(): Promise<{ send: () => Promise<any> }> {
    const query = this.getQuery("liqPools");
    return await this.fetchData(query);
  }

  public async fetchData(query: { send: () => Promise<any> }): Promise<any> {
    try {
      return await super.fetchData(query);
    } catch (error) {
      console.error(`Error fetching data: ${error}`);
      throw error;
    }
  }
}

describe("Base Subgraph Integration Tests", () => {
  const baseUrl = process.env.THE_GRAPH_BASE_URL ?? "";
  const subgraphName = process.env.THE_GRAPH_UNISWAP_V3_SUBGRAPH_ID ?? "";
  const apiKey = process.env.THE_GRAPH_API_KEY ?? "";

  let testSubgraph: TestSubgraph;

  beforeEach(() => {
    if (!baseUrl) {
      throw new Error("THE_GRAPH_BASE_URL is not set");
    }

    if (!subgraphName) {
      throw new Error("THE_GRAPH_UNISWAP_V3_SUBGRAPH_ID is not set");
    }

    testSubgraph = new TestSubgraph(getTGUrl(baseUrl, subgraphName,apiKey));

    testSubgraph.initialize();
  });

  test("should fetch data from the subgraph", async () => {
    const data = await testSubgraph.testQuery();
    expect(data).toBeDefined();
    expect(data).toHaveProperty("liquidityPools");
  });
});
