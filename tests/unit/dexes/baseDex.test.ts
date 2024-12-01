import { BaseDex } from "../../../src/dexes/baseDex.js";
import { WebSocketManager } from "../../../src/ws.js";
import { DexPoolSubgraph } from "../../../src/subgraphs/dexPoolSubgraph.js";
import { Pool, Token, Opportunity } from "../../../src/types.js";
import { AflabContract } from "../../../src/contracts/aflabContract.js";
import { PoolContract } from "../../../src/contracts/poolContract.js";
import { config, constants } from "../../../src/common.js";

import { Signer, Provider, TransactionLike, TransactionResponse } from "ethers";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Decimal } from "decimal.js";
import { fail } from "assert";

const value1SqrPriceX96 = new Decimal(
  79228162514264337593543950336n.toString()
); // sqrtPriceX96 for price 1

// Mock implementations for Signer and PoolContract
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

class MockPoolContract extends PoolContract {
  constructor(
    address: string,
    wsManager: WebSocketManager,
    abi: any,
    pool: Pool,
    signer: () => Promise<void>
  ) {
    super(address, wsManager, abi, pool, signer);
  }
  getLastPoolSqrtPriceX96 = vi.fn().mockReturnValue(new Decimal(1));
  getInputTokens = vi.fn(() => this.pool.inputTokens); // Return actual inputTokens
  getPoolId = vi.fn();
}

// TestDex class to expose protected methods for testing
class TestDex extends BaseDex {
  public async initialize(): Promise<void> {
    this.initialized = true;
  }

  public async processSwap(): Promise<void> {
    // Implementation not needed for tests
  }

  // Expose protected properties and methods for testing
  public getInputTokenSymbolIndex(): Map<string, Pool[]> {
    return this.inputTokenSymbolIndex;
  }

  public getContractsMap(): Map<string, PoolContract> {
    return this.contractsMap;
  }

  public findIntermediaryTokensPublic(tokenA: string, tokenC: string): Token[] {
    return this.findIntermediaryTokens(tokenA, tokenC);
  }

  public getPoolContractsForTokensPublic(
    tokenX: Token,
    tokenZ: Token
  ): PoolContract[] {
    return this.getPoolContractsForTokens(tokenX, tokenZ);
  }

  public calculateNetOutputPublic(
    inputAmount: Decimal,
    fromToken: Token,
    toToken: Token,
    poolContract: PoolContract
  ) {
    return this.calculateNetOutput(
      inputAmount,
      fromToken,
      toToken,
      poolContract
    );
  }

  public calculateExpectedProfitPublic(
    tokenA: Token,
    tokenB: Token,
    tokenC: Token,
    inputAmount: Decimal,
    swap1PoolContract: PoolContract,
    swap2PoolContract: PoolContract,
    swap3PoolContract: PoolContract
  ) {
    return this.calculateExpectedProfit(
      tokenA,
      tokenB,
      tokenC,
      inputAmount,
      swap1PoolContract,
      swap2PoolContract,
      swap3PoolContract
    );
  }

  public pickTokenBPublic(
    tokenA: Token,
    tokenC: Token,
    possibleBs: Token[],
    inputAmount: Decimal,
    swapPoolContract: PoolContract
  ) {
    return this.pickTokenB(
      tokenA,
      tokenC,
      possibleBs,
      inputAmount,
      swapPoolContract
    );
  }

  public logOpportunityPublic(opportunity: Opportunity): void {
    this.logOpportunity(opportunity);
  }

  public async triggerSmartContractPublic(opportunity: Opportunity) {
    await this.triggerSmartContract(opportunity);
  }

  public getInitialized(): boolean {
    return this.initialized;
  }
}

describe("BaseDex", () => {
  let dex: TestDex;
  let wsManager: WebSocketManager;
  let subgraph: DexPoolSubgraph;
  let mockSigner: Signer;
  let mockAflabContract: AflabContract;

  beforeEach(async () => {
    // Setup mocks and create TestDex instance
    wsManager = new WebSocketManager("ws://localhost:8545");
    subgraph = new DexPoolSubgraph("http://localhost:8000");
    mockSigner = new MockSigner();
    mockAflabContract = {
      executeOpportunity: vi.fn().mockResolvedValue(undefined),
    } as unknown as AflabContract;
    dex = new TestDex(wsManager, mockSigner, subgraph, mockAflabContract);
    await dex.initialize();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should initialize the DEX", () => {
    expect(dex.getInitialized()).toBe(true);
  });

  it("should return the pool contract if it exists in the contracts map", () => {
    const mockPoolContract = new MockPoolContract(
      "0xPoolAddress",
      wsManager,
      config.POOL_ABI,
      {} as Pool,
      () => Promise.resolve()
    );

    dex.getContractsMap().set("0xPoolAddress", mockPoolContract);

    const result = dex.getContract("0xPoolAddress");
    expect(result).toBe(mockPoolContract);
  });

  it("should throw an error if the contract is not found", () => {
    expect(() => dex.getContract("0xNonExistent")).toThrow(
      "Contract not found: 0xNonExistent"
    );
  });

  it("should return an array of pool contracts that include both tokens", () => {
    const tokenX: Token = {
      symbol: "X",
      id: "0xX",
      name: "Token X",
      decimals: 18,
    };
    const tokenZ: Token = {
      symbol: "Z",
      id: "0xZ",
      name: "Token Z",
      decimals: 18,
    };
    const tokenY: Token = {
      symbol: "Y",
      id: "0xY",
      name: "Token Y",
      decimals: 18,
    };

    const pool1: Pool = {
      id: "0xPoolAddress",
      inputTokens: [tokenX, tokenZ],
      name: "",
      symbol: "",
      fees: [],
    };
    const pool2: Pool = {
      id: "0xPoolAddress2",
      inputTokens: [tokenX, tokenY],
      name: "",
      symbol: "",
      fees: [],
    };

    dex.getInputTokenSymbolIndex().set("X", [pool1, pool2]);
    dex.getInputTokenSymbolIndex().set("Z", [pool1]);

    const mockPoolContract1 = new MockPoolContract(
      "0xPoolAddress",
      wsManager,
      config.POOL_ABI,
      pool1,
      () => Promise.resolve()
    );
    const mockPoolContract2 = new MockPoolContract(
      "0xPoolAddress2",
      wsManager,
      config.POOL_ABI,
      pool2,
      () => Promise.resolve()
    );
    dex.getContractsMap().set("0xPoolAddress", mockPoolContract1);
    dex.getContractsMap().set("0xPoolAddress2", mockPoolContract2);

    const result = dex.getPoolContractsForTokensPublic(tokenX, tokenZ);
    expect(result).toEqual([mockPoolContract1]);
  });

  it("should return an empty array if no pools are found for the tokens", () => {
    const tokenX: Token = {
      symbol: "X",
      id: "0xX",
      name: "Token X",
      decimals: 18,
    };
    const tokenZ: Token = {
      symbol: "Z",
      id: "0xZ",
      name: "Token Z",
      decimals: 18,
    };

    const result = dex.getPoolContractsForTokensPublic(tokenX, tokenZ);
    expect(result).toEqual([]);
  });

  it("should calculate net output correctly", () => {
    const inputAmount = new Decimal(100);
    const fromToken: Token = {
      symbol: "A",
      id: "0xA",
      name: "Token A",
      decimals: 18,
    };
    const toToken: Token = {
      symbol: "B",
      id: "0xB",
      name: "Token B",
      decimals: 18,
    };

    const pool1: Pool = {
      id: "0xPoolAddress",
      inputTokens: [fromToken, toToken],
      name: "",
      symbol: "",
      fees: [
        {
          feePercentage: 0.03,
          feeType: "Token",
        },
        {
          feePercentage: 0.03,
          feeType: "Protocol",
        },
        {
          feePercentage: 0.03,
          feeType: "Liquidity",
        },
      ],
    };

    const mockPoolContract = new MockPoolContract(
      "0xPoolAddress",
      wsManager,
      config.POOL_ABI,
      pool1,
      () => Promise.resolve()
    );
    mockPoolContract.getInputTokens = vi
      .fn()
      .mockReturnValue([fromToken, toToken]);
    mockPoolContract.getLastPoolSqrtPriceX96 = vi
      .fn()
      .mockReturnValue(value1SqrPriceX96); // sqrtPriceX96 for price 1

    let result;
    try {
      result = dex.calculateNetOutputPublic(
        inputAmount,
        fromToken,
        toToken,
        mockPoolContract
      );
    } catch (e) {
      console.log(e);
      fail("Error occurred");
    }

    expect(result.price.toNumber()).toBeCloseTo(1, 2);
    expect(result.grossOutput.toNumber()).toBeCloseTo(100, 2);
    expect(result.netOutput.toNumber()).toBeCloseTo(99.91, 2); // Due to fee
    expect(result.feeDecimal.toNumber()).toBeCloseTo(0.0009, 4);
  });

  it("should throw an error if the pool price is uninitialized", () => {
    const inputAmount = new Decimal(100);
    const fromToken: Token = {
      symbol: "A",
      id: "0xA",
      name: "Token A",
      decimals: 18,
    };
    const toToken: Token = {
      symbol: "B",
      id: "0xB",
      name: "Token B",
      decimals: 18,
    };

    const mockPoolContract = new MockPoolContract(
      "0xPoolAddress",
      wsManager,
      config.POOL_ABI,
      {} as Pool,
      () => Promise.resolve()
    );
    mockPoolContract.getLastPoolSqrtPriceX96 = vi
      .fn()
      .mockReturnValue(new Decimal(0));

    try {
      expect(
        dex.calculateNetOutputPublic(
          inputAmount,
          fromToken,
          toToken,
          mockPoolContract
        )
      );
    } catch (e) {
      console.log(e);
      if (e instanceof Error) {
        expect(e.message).toBe("Last price value not initialized or is zero");
      } else {
        fail("Error occurred");
      }
    }
  });

  it("should calculate expected profit correctly", () => {
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
      id: "0xPool1",
      inputTokens: [tokenA, tokenB],
      name: "",
      symbol: "",
      fees: [
        {
          feePercentage: 0.03,
          feeType: "Token",
        },
        {
          feePercentage: 0.03,
          feeType: "Protocol",
        },
        {
          feePercentage: 0.03,
          feeType: "Liquidity",
        },
      ],
    };

    const pool2: Pool = {
      id: "0xPool2",
      inputTokens: [tokenB, tokenC],
      name: "",
      symbol: "",
      fees: [
        {
          feePercentage: 0.03,
          feeType: "Token",
        },
        {
          feePercentage: 0.03,
          feeType: "Protocol",
        },
        {
          feePercentage: 0.03,
          feeType: "Liquidity",
        },
      ],
    };

    const pool3: Pool = {
      id: "0xPool3",
      inputTokens: [tokenC, tokenA],
      name: "",
      symbol: "",
      fees: [
        {
          feePercentage: 0.03,
          feeType: "Token",
        },
        {
          feePercentage: 0.03,
          feeType: "Protocol",
        },
        {
          feePercentage: 0.03,
          feeType: "Liquidity",
        },
      ],
    };

    const inputAmount = new Decimal(100);

    const mockPoolContract = new MockPoolContract(
      "0xSwap1",
      wsManager,
      config.POOL_ABI,
      pool1,
      () => Promise.resolve()
    );
    mockPoolContract.getInputTokens = vi.fn().mockReturnValue([tokenA, tokenB]);
    mockPoolContract.getLastPoolSqrtPriceX96 = vi
      .fn()
      .mockReturnValue(value1SqrPriceX96); // sqrtPriceX96 for price 1

    const mockPoolContract2 = new MockPoolContract(
      "0xSwap2",
      wsManager,
      config.POOL_ABI,
      pool2,
      () => Promise.resolve()
    );
    mockPoolContract2.getInputTokens = vi
      .fn()
      .mockReturnValue([tokenB, tokenC]);
    mockPoolContract2.getLastPoolSqrtPriceX96 = vi
      .fn()
      .mockReturnValue(value1SqrPriceX96);

    const mockPoolContract3 = new MockPoolContract(
      "0xSwap3",
      wsManager,
      config.POOL_ABI,
      pool3,
      () => Promise.resolve()
    );
    mockPoolContract3.getInputTokens = vi
      .fn()
      .mockReturnValue([tokenC, tokenA]);
    mockPoolContract3.getLastPoolSqrtPriceX96 = vi
      .fn()
      .mockReturnValue(value1SqrPriceX96); // sqrtPriceX96 for price 1

    let result;

    try {
      result = dex.calculateExpectedProfitPublic(
        tokenA,
        tokenB,
        tokenC,
        inputAmount,
        mockPoolContract,
        mockPoolContract2,
        mockPoolContract3
      );
    } catch (e) {
      console.log(e);
      fail(e as Error);
    }

    const expectedProfit = new Decimal(-0.27); // Expected loss due to fees

    expect(result.expectedProfit.toNumber()).toBeCloseTo(
      expectedProfit.toNumber(),
      2
    );
  });

  it("should pick the best intermediary token B", () => {
    // Set up tokens
    const tokenA: Token = {
      symbol: "A",
      id: "0xA",
      name: "Token A",
      decimals: 18,
    };
    const tokenB1: Token = {
      symbol: "B1",
      id: "0xB1",
      name: "Token B1",
      decimals: 18,
    };
    const tokenB2: Token = {
      symbol: "B2",
      id: "0xB2",
      name: "Token B2",
      decimals: 18,
    };
    const tokenC: Token = {
      symbol: "C",
      id: "0xC",
      name: "Token C",
      decimals: 18,
    };

    const pool1: Pool = {
      id: "0xPoolA_B1",
      inputTokens: [tokenA, tokenB1],
      name: "",
      symbol: "",
      fees: [
        {
          feePercentage: 0.03,
          feeType: "Token",
        },
        {
          feePercentage: 0.03,
          feeType: "Protocol",
        },
        {
          feePercentage: 0.03,
          feeType: "Liquidity",
        },
      ],
    };

    const pool2: Pool = {
      id: "0xPoolB1_C",
      inputTokens: [tokenB1, tokenC],
      name: "",
      symbol: "",
      fees: [
        {
          feePercentage: 0.03,
          feeType: "Token",
        },
        {
          feePercentage: 0.03,
          feeType: "Protocol",
        },
        {
          feePercentage: 0.03,
          feeType: "Liquidity",
        },
      ],
    };

    const pool3: Pool = {
      id: "0xPoolA_B2",
      inputTokens: [tokenA, tokenB2],
      name: "",
      symbol: "",
      fees: [
        {
          feePercentage: 0.03,
          feeType: "Token",
        },
        {
          feePercentage: 0.03,
          feeType: "Protocol",
        },
        {
          feePercentage: 0.03,
          feeType: "Liquidity",
        },
      ],
    };

    const pool4: Pool = {
      id: "0xPoolB2_C",
      inputTokens: [tokenB2, tokenC],
      name: "",
      symbol: "",
      fees: [
        {
          feePercentage: 0.03,
          feeType: "Token",
        },
        {
          feePercentage: 0.03,
          feeType: "Protocol",
        },
        {
          feePercentage: 0.03,
          feeType: "Liquidity",
        },
      ],
    };

    const pool5: Pool = {
      id: "0xPoolA_C",
      inputTokens: [tokenA, tokenC],
      name: "",
      symbol: "",
      fees: [
        {
          feePercentage: 0.02, // Reduced fee for direct pool to make it less profitable
          feeType: "Token",
        },
        {
          feePercentage: 0.02,
          feeType: "Protocol",
        },
        {
          feePercentage: 0.02,
          feeType: "Liquidity",
        },
      ],
    };

    // Mock Pool Contracts for Swaps
    const mockSwapPoolContractA_B1 = new MockPoolContract(
      "0xPoolA_B1",
      wsManager,
      config.POOL_ABI,
      pool1,
      () => Promise.resolve()
    );
    mockSwapPoolContractA_B1.getLastPoolSqrtPriceX96 = vi.fn().mockReturnValue(
      value1SqrPriceX96.mul(new Decimal(1.02)) // Slightly favorable price
    );

    const mockSwapPoolContractB1_C = new MockPoolContract(
      "0xPoolB1_C",
      wsManager,
      config.POOL_ABI,
      pool2,
      () => Promise.resolve()
    );
    mockSwapPoolContractB1_C.getLastPoolSqrtPriceX96 = vi.fn().mockReturnValue(
      value1SqrPriceX96.mul(new Decimal(1.02)) // Slightly favorable price
    );

    const mockSwapPoolContractA_B2 = new MockPoolContract(
      "0xPoolA_B2",
      wsManager,
      config.POOL_ABI,
      pool3,
      () => Promise.resolve()
    );
    mockSwapPoolContractA_B2.getLastPoolSqrtPriceX96 = vi.fn().mockReturnValue(
      value1SqrPriceX96.mul(new Decimal(0.98)) // Less favorable price
    );

    const mockSwapPoolContractB2_C = new MockPoolContract(
      "0xPoolB2_C",
      wsManager,
      config.POOL_ABI,
      pool4,
      () => Promise.resolve()
    );
    mockSwapPoolContractB2_C.getLastPoolSqrtPriceX96 = vi.fn().mockReturnValue(
      value1SqrPriceX96.mul(new Decimal(0.98)) // Less favorable price
    );

    const mockSwapPoolContractA_C = new MockPoolContract(
      "0xPoolA_C",
      wsManager,
      config.POOL_ABI,
      pool5,
      () => Promise.resolve()
    );
    mockSwapPoolContractA_C.getLastPoolSqrtPriceX96 = vi.fn().mockReturnValue(
      value1SqrPriceX96.mul(new Decimal(1.01)) // Slightly favorable but less than B1 path
    );

    dex.getContractsMap().set("0xPoolA_B1", mockSwapPoolContractA_B1);
    dex.getContractsMap().set("0xPoolB1_C", mockSwapPoolContractB1_C);
    dex.getContractsMap().set("0xPoolA_B2", mockSwapPoolContractA_B2);
    dex.getContractsMap().set("0xPoolB2_C", mockSwapPoolContractB2_C);
    dex.getContractsMap().set("0xPoolA_C", mockSwapPoolContractA_C);

    dex.getInputTokenSymbolIndex().set("A", [pool1, pool3, pool5]);
    dex.getInputTokenSymbolIndex().set("B1", [pool2, pool1]);
    dex.getInputTokenSymbolIndex().set("B2", [pool4, pool3]);
    dex.getInputTokenSymbolIndex().set("C", [pool2, pool4, pool5]);

    const possibleBs = [tokenB1, tokenB2];
    const inputAmount = new Decimal(100);

    let result;
    try {
      result = dex.pickTokenBPublic(
        tokenA,
        tokenC,
        possibleBs,
        inputAmount,
        mockSwapPoolContractA_C
      );
    } catch (e) {
      console.log(e);
      fail(e as Error);
    }

    console.log(result);
    expect(result.tokenB).toBe(tokenB1);
    expect(result.expectedProfitData).toBeDefined();
    expect(result.expectedProfitData?.expectedProfit.toNumber()).toBeCloseTo(
      5.86,
      2
    );
  });

  it("should throw error if no profitable arbitrage opportunities found", () => {
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

    const possibleBs = [tokenB];
    const inputAmount = new Decimal(100);

    dex.calculateExpectedProfitPublic = vi
      .fn()
      .mockReturnValue({ expectedProfit: new Decimal(-10) });

    expect(() =>
      dex.pickTokenBPublic(
        tokenA,
        tokenC,
        possibleBs,
        inputAmount,
        new MockPoolContract(
          "0xPoolA_C",
          wsManager,
          config.POOL_ABI,
          {} as Pool,
          () => Promise.resolve()
        )
      )
    ).toThrow("No profitable arbitrage opportunities found");
  });

  it("should log the arbitrage opportunity details", () => {
    const opportunity: Opportunity = {
      arbitInfo: {
        swap1: {
          tokenIn: { symbol: "A" } as Token,
          tokenOut: { symbol: "B" } as Token,
          poolFee: new Decimal(0.003),
          amountOutMinimum: new Decimal(0),
        },
        swap2: {
          tokenIn: { symbol: "B" } as Token,
          tokenOut: { symbol: "C" } as Token,
          poolFee: new Decimal(0.003),
          amountOutMinimum: new Decimal(0),
        },
        swap3: {
          tokenIn: { symbol: "C" } as Token,
          tokenOut: { symbol: "A" } as Token,
          poolFee: new Decimal(0.003),
          amountOutMinimum: new Decimal(0),
        },
        estimatedGasCost: new Decimal(0.01),
      },
      tokenAIn: new Decimal(100),
      expectedProfit: new Decimal(5),
      originalSwapPriceImpact: 0.5,
      lastPoolSqrtPriceX96: new Decimal(1),
      originalSwap: {} as any,
    };

    const loggerSpy = vi.spyOn(console, "log");
    dex.logOpportunityPublic(opportunity);
    expect(loggerSpy).toHaveBeenCalled();
    loggerSpy.mockRestore();
  });

  it("should call executeOpportunity on the AflabContract", async () => {
    const opportunity = {} as Opportunity;
    await dex.triggerSmartContractPublic(opportunity);
    expect(mockAflabContract.executeOpportunity).toHaveBeenCalledWith(
      opportunity
    );
  });

  it("should log a warning if an error occurs during smart contract execution", async () => {
    const opportunity = {} as Opportunity;
    mockAflabContract.executeOpportunity = vi
      .fn()
      .mockRejectedValue(new Error("Execution failed"));

    const loggerSpy = vi.spyOn(console, "warn");
    await dex.triggerSmartContractPublic(opportunity);
    expect(loggerSpy).toHaveBeenCalledWith(
      "[FlashLoanArbitrage][TestDex][WARN] Error triggering smart contract: Error: Execution failed"
    );
    loggerSpy.mockRestore();
  });
});
