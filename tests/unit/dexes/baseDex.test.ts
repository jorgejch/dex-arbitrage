import { describe, it, expect, beforeEach } from "vitest";
import { BaseDex } from "../../../src/dexes/baseDex.js";
import { WebSocketManager } from "../../../src/ws.js";
import { DexPoolSubgraph } from "../../../src/subgraphs/dexPoolSubgraph.js";
import { Pool, Token } from "../../../src/types.js";
import { vi } from "vitest";
import { Signer, Provider, TransactionLike, TransactionResponse } from "ethers";
import { AflabContract } from "../../../src/contracts/aflabContract.js";

class TestDex extends BaseDex {
  public async processSwap(): Promise<void> {
    // Implementation not needed for tests
  }

  public async initialize(): Promise<void> {
    // Implementation not needed for tests
  }

  public getInputTokenSymbolIndex(): Map<string, Pool[]> {
    return this.inputTokenSymbolIndex;
  }

  public getPossibleIntermediaryTokensPublic(
    tokenA: string,
    tokenC: string
  ): Token[] {
    return this.getPossibleIntermediaryTokens(tokenA, tokenC);
  }
}

// Create a mocked Signer class
class MockSigner implements Signer {
  populateTransaction = vi
    .fn()
    .mockResolvedValue({} as TransactionLike<string>);
  populateCall = vi.fn().mockResolvedValue({} as TransactionLike<string>);
  estimateGas = vi.fn().mockResolvedValue(BigInt(0));
  call = vi.fn().mockResolvedValue("0x");
  resolveName = vi.fn().mockResolvedValue(null);
  sendTransaction = vi.fn().mockResolvedValue({} as TransactionResponse);
  signTypedData = vi.fn().mockResolvedValue("");

  provider: Provider | null = null;

  getAddress = vi.fn().mockResolvedValue("0xMockAddress");
  signTransaction = vi.fn();
  signMessage = vi.fn();
  connect = vi.fn();
  getChainId = vi.fn().mockResolvedValue(1);
  getNonce = vi.fn().mockResolvedValue(0);
}

describe("BaseDex", () => {
  let dex: TestDex;
  let wsManager: WebSocketManager;
  let subgraph: DexPoolSubgraph;

  beforeEach(() => {
    // Mock WebSocketManager and DexPoolSubgraph
    vi.mock("../../../src/ws.js", () => {
      return {
        WebSocketManager: vi.fn().mockImplementation(() => {
          return {
            // Mock implementation if needed
          };
        }),
      };
    });

    vi.mock("../../../src/subgraphs/dexPoolSubgraph.js", () => {
      return {
        DexPoolSubgraph: vi.fn().mockImplementation(() => {
          return {
            // Mock implementation if needed
          };
        }),
      };
    });

    wsManager = new WebSocketManager("ws://localhost:8545");
    subgraph = new DexPoolSubgraph("http://localhost:8000");
    const mockSigner = new MockSigner();
    const mockAflabContract = {} as AflabContract;
    dex = new TestDex(wsManager, mockSigner, subgraph, mockAflabContract);
  });

  describe("getPossibleIntermediaryTokens", () => {
    it("should return an empty array if no pools are found for token A or token C", () => {
      const result = dex.getPossibleIntermediaryTokensPublic("A", "C");
      expect(result).toEqual([]);
    });

    it("should return an array of possible intermediary tokens", () => {
      const tokenA: Token = {
        symbol: "A",
        id: "0xA",
        name: "Token A",
        decimals: 18,
      };
      const tokenB: Token = {
        symbol: "B",
        id: "0xB",
        name: "Token B",
        decimals: 18,
      };
      const tokenC: Token = {
        symbol: "C",
        id: "0xC",
        name: "Token C",
        decimals: 18,
      };

      const pool1: Pool = {
        id: "1",
        inputTokens: [tokenA, tokenB],
        name: "",
        symbol: "",
        fees: [],
      };
      const pool2: Pool = {
        id: "2",
        inputTokens: [tokenB, tokenC],
        name: "",
        symbol: "",
        fees: [],
      };
      const pool3: Pool = {
        id: "3",
        inputTokens: [tokenC, tokenA],
        name: "",
        symbol: "",
        fees: [],
      };

      // Set the pools 1-3 in the map
      dex.getInputTokenSymbolIndex().set("A", [pool1, pool3]);
      dex.getInputTokenSymbolIndex().set("C", [pool2, pool3]);

      const result = dex.getPossibleIntermediaryTokensPublic("A", "C");
      expect(result).toEqual([tokenB]);
    });

    it("should return an empty array if no common intermediary tokens are found", () => {
      const tokenA: Token = {
        symbol: "A",
        id: "0xA",
        name: "Token A",
        decimals: 18,
      };
      const tokenB: Token = {
        symbol: "B",
        id: "0xB",
        name: "Token B",
        decimals: 18,
      };
      const tokenC: Token = {
        symbol: "C",
        id: "0xC",
        name: "Token C",
        decimals: 18,
      };
      const tokenD: Token = {
        symbol: "D",
        id: "0xD",
        name: "Token D",
        decimals: 18,
      };

      const pool1: Pool = {
        id: "1",
        inputTokens: [tokenA, tokenB],
        name: "",
        symbol: "",
        fees: [],
      };
      const pool2: Pool = {
        id: "2",
        inputTokens: [tokenC, tokenD],
        name: "",
        symbol: "",
        fees: [],
      };

      dex.getInputTokenSymbolIndex().set("A", [pool1]);
      dex.getInputTokenSymbolIndex().set("C", [pool2]);

      const result = dex.getPossibleIntermediaryTokensPublic("A", "C");
      expect(result).toEqual([]);
    });
  });
});
