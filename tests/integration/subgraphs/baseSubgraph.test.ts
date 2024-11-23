import { describe, test, expect, beforeEach } from "vitest";
import { BaseSubgraph } from "../../../src/subgraphs/baseSubgraph.js";
import { getTGPancakeSwapMessariUrl } from "../../../src/common.js";
import dotenv from "dotenv";

dotenv.config();

class TestSubgraph extends BaseSubgraph {
  constructor(url: string) {
    super(url);
  }

  public testQuery() {
    return this.gql`
      {
        tokens(first: 5) {
          name
        }
      }
    `;
  }

  public async fetchData(query: { send: () => Promise<any> }): Promise<any> {
    return super.fetchData(query);
  }
}

describe("Base Subgraph Integration Tests", () => {
  const apiKey = process.env.THE_GRAPH_API_KEY ?? "";
  let testSubgraph: TestSubgraph;

  beforeEach(() => {
    if (!apiKey) {
      throw new Error("THE_GRAPH_API_KEY is not set");
    }
    testSubgraph = new TestSubgraph(getTGPancakeSwapMessariUrl(apiKey));
  });

  test("should fetch data from the subgraph", async () => {
    testSubgraph.initialize();
    const query = testSubgraph.testQuery();
    const data = await testSubgraph.fetchData(query);
    expect(data).toBeDefined();
    expect(data).toHaveProperty("tokens");
  });
});
