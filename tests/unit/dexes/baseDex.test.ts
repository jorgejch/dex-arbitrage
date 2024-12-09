import { beforeEach, expect, it, vi } from "vitest";
import { BigNumber } from "alchemy-sdk";
import { Decimal } from "decimal.js";
import { BaseDex } from "../../../src/dexes/baseDex.js";
import { ExpectedProfitData, Pool, Token } from "../../../src/types.js";
import { PoolContract } from "../../../src/contracts/poolContract.js";

// Mocking dependencies
class MockPoolContract {
    getLastPoolSqrtPriceX96 = vi.fn();
}

const mockTokenA: Token = {
    id: "0xaaaaaa",
    symbol: "A",
    decimals: 18,
    name: "Token A",
};

const mockTokenB: Token = {
    id: "0xbbbbbb",
    symbol: "B",
    decimals: 18,
    name: "Token B",
};

const mockTokenC: Token = {
    id: "0xcccccc",
    symbol: "C",
    decimals: 18,
    name: "Token C",
};

const mockPoolA: Pool = {
    id: "poolA",
    inputTokens: [mockTokenA, mockTokenB],
    name: "",
    symbol: "",
    fees: [],
};

const mockPoolB: Pool = {
    id: "poolB",
    inputTokens: [mockTokenB, mockTokenC],
    name: "",
    symbol: "",
    fees: [],
};

const mockPoolC: Pool = {
    id: "poolC",
    inputTokens: [mockTokenA, mockTokenC],
    name: "",
    symbol: "",
    fees: [],
};

// Mock LendingPoolAPContract
const MockLendingPoolAPContract = {
    getFlashloanFee: vi.fn().mockResolvedValue(new Decimal("0.001")), // 0.1%
};

// Mock AflabContract
const MockAflabContract = {
    executeOpportunity: vi.fn().mockResolvedValue(true),
};

// Mock DexPoolSubgraph
const MockDexPoolSubgraph = {};

// Mock Wallet and Alchemy
const MockWallet = {};
const MockAlchemy = {};

// Concrete subclass for testing
class TestDex extends BaseDex {
    public async initialize(): Promise<void> {
        // Implementation not needed for these tests.
    }

    public async processSwap(): Promise<void> {
        // Implementation not needed for these tests.
    }

    // Expose protected methods for testing if necessary
    public testGetPoolContractsForTokens(tokenX: Token, tokenZ: Token) {
        return this.getPoolContractsForTokens(tokenX, tokenZ);
    }

    public testCalculateExpectedProfit(
        tokenA: Token,
        tokenB: Token,
        tokenC: Token,
        inputAmount: BigNumber,
        swapPoolContracts: PoolContract[],
        lendingPoolFeePercentage: Decimal,
    ): ExpectedProfitData {
        return this.calculateExpectedProfit(
            tokenA,
            tokenB,
            tokenC,
            inputAmount,
            swapPoolContracts,
            lendingPoolFeePercentage,
        );
    }
}

let mockPoolContract: MockPoolContract;
let dex: TestDex;

beforeEach(() => {
    mockPoolContract = new MockPoolContract();
    dex = new TestDex(
        MockAlchemy as any,
        MockWallet as any,
        MockDexPoolSubgraph as any,
        MockAflabContract as any,
        MockLendingPoolAPContract as any,
        1, // network ID
    );

    // Setup internal state maps
    // Add contracts to contract map
    dex["contractsMap"].set(mockPoolA.id, mockPoolContract as any);
    dex["contractsMap"].set(mockPoolB.id, mockPoolContract as any);
    dex["contractsMap"].set(mockPoolC.id, mockPoolContract as any);

    // Setup inputTokenSymbolIndex
    dex["inputTokenSymbolIndex"].set("A", [mockPoolA, mockPoolC]);
    dex["inputTokenSymbolIndex"].set("B", [mockPoolA, mockPoolB]);
    dex["inputTokenSymbolIndex"].set("C", [mockPoolB, mockPoolC]);
    dex["pools"] = [mockPoolA, mockPoolB, mockPoolC];
});

it("should retrieve a contract by address", () => {
    const contract = dex.getContract("poolA");
    expect(contract).toBe(mockPoolContract);
});

it("should throw an error if contract not found", () => {
    expect(() => dex.getContract("nonExistentPool")).toThrowError("Contract not found: nonExistentPool");
});

it("should return pool contracts common to two tokens", () => {
    const result = dex.testGetPoolContractsForTokens(mockTokenA, mockTokenC);
    // Pools containing both A and C: mockPoolC
    expect(result.length).toBe(1);
    expect(result[0]).toBe(mockPoolContract);
});

it("should return empty array if no pools found", () => {
    const tokenX: Token = {
        id: "X",
        symbol: "X",
        decimals: 18,
        name: "",
    };
    const tokenY: Token = {
        id: "Y",
        symbol: "Y",
        decimals: 18,
        name: "",
    };
    const result = dex.testGetPoolContractsForTokens(tokenX, tokenY);
    expect(result).toEqual([]);
});

it("should calculate expected profit for a three-step arbitrage if profitable", async () => {
    // Arrange
    const inputAmount = BigNumber.from("1000000000000000000"); // 1 * 10^18
    const lendingPoolFee = await MockLendingPoolAPContract.getFlashloanFee();

    // We mock the price and fee logic within mockPoolContract
    mockPoolContract.getLastPoolSqrtPriceX96.mockReturnValue(BigNumber.from("1000000000000000000000000"));

    // Act
    const result = dex.testCalculateExpectedProfit(
        mockTokenA,
        mockTokenB,
        mockTokenC,
        inputAmount,
        [mockPoolContract as any, mockPoolContract as any, mockPoolContract as any],
        lendingPoolFee,
    );

    // Assert
    // We are not sure what the exact profit would be since it's dependent on the mocked values.
    // We just want to ensure that it returns a structure consistent with ExpectedProfitData
    expect(result).toHaveProperty("expectedProfit");
    expect(result).toHaveProperty("swap1FeeBigNumber");
    expect(result).toHaveProperty("swap2FeeBigNumber");
    expect(result).toHaveProperty("swap3FeeBigNumber");
});

it("should handle case when net output is non-positive in intermediate swaps", async () => {
    // Mock a scenario where second swap leads to zero output
    mockPoolContract.getLastPoolSqrtPriceX96.mockReturnValue(BigNumber.from("1")); // Very small sqrt price
    const inputAmount = BigNumber.from("1000");
    const lendingPoolFee = await MockLendingPoolAPContract.getFlashloanFee();
    const result = dex.testCalculateExpectedProfit(
        mockTokenA,
        mockTokenB,
        mockTokenC,
        inputAmount,
        [mockPoolContract as any, mockPoolContract as any, mockPoolContract as any],
        lendingPoolFee,
    );
    expect(result.expectedProfit.toNumber()).toBe(0);
});
