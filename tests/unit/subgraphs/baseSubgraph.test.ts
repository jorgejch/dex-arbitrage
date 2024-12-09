import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { BaseSubgraph } from "../../../src/subgraphs/baseSubgraph.js";
import { logger } from "../../../src/common.js";
import { Client } from "@urql/core";

class TestSubgraph extends BaseSubgraph {
    protected customInit(): void {
        // Minimal no-op custom init for testing
    }
}

describe("BaseSubgraph", () => {
    let subgraph: TestSubgraph;
    let mockClient: Client;

    beforeEach(() => {
        // Mock logger
        vi.spyOn(logger, "info").mockImplementation(() => {});
        vi.spyOn(logger, "warn").mockImplementation(() => {});
        vi.spyOn(logger, "error").mockImplementation(() => {});

        // Mock client
        mockClient = {
            query: vi.fn().mockResolvedValue({ data: { mock: "result" } }),
        } as any;

        // Override the protected client for testing
        // @ts-expect-error accessing protected property for test
        subgraph = new TestSubgraph("http://mock-subgraph");
        // @ts-expect-error accessing protected property for test
        subgraph.client = mockClient;
    });

    it("should initialize and log without errors", () => {
        subgraph.initialize();
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("Initialized subgraph"), "TestSubgraph");
    });

    it("should allow adding and retrieving queries", () => {
        subgraph.addQuery("testQuery", "{ pools { id } }");
        const query = subgraph.getQuery("testQuery");
        expect(query).toBe("{ pools { id } }");
    });

    it("should throw an error when getting a non-existent query", () => {
        expect(() => subgraph.getQuery("nonExistent")).toThrow("Query nonExistent not found");
    });

    it("should fetch data successfully", async () => {
        // @ts-expect-error protected method access for test
        const data = await subgraph.fetchData("{ pools { id } }");
        expect(mockClient.query as Mock).toHaveBeenCalledWith("{ pools { id } }", undefined);
        expect(data).toEqual({ mock: "result" });
    });

    it("should retry fetchData up to 3 times on failure", async () => {
        (mockClient.query as Mock).mockRejectedValueOnce(new Error("Network Error"));
        (mockClient.query as Mock).mockRejectedValueOnce(new Error("Network Error"));
        (mockClient.query as Mock).mockResolvedValueOnce({ data: { retry: "success" } });

        // @ts-expect-error protected method access for test
        const data = await subgraph.fetchData("{ pools { id } }");
        expect(mockClient.query as Mock).toHaveBeenCalledTimes(3);
        expect(data).toEqual({ retry: "success" });
    });

    it("should throw an error after 3 failed fetchData attempts", async () => {
        (mockClient.query as Mock).mockRejectedValue(new Error("Network Error"));

        // @ts-expect-error protected method access for test
        await expect(subgraph.fetchData("{ pools { id } }")).rejects.toThrow(
            "Failed to fetch data, max retries exceeded",
        );
        expect(mockClient.query).toHaveBeenCalledTimes(3);
    });
});
