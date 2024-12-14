import { beforeEach, describe, expect, it, vi } from "vitest";
import { PoolContract } from "../../../src/contracts/poolContract.js";
import { Alchemy, BigNumber } from "alchemy-sdk";
import { Decimal } from "decimal.js";
import { UniswapV3Swap } from "../../../src/swaps/uniswapV3Swap.js";
import { Pool } from "../../../src/types.js";

class MockAlchemy extends Alchemy {}

describe("PoolContract", () => {
    const address = "0x123";
    const abi: object[] = [];
    const network = 1;
    const pool: Pool = {
        name: "Mock Pool",
        symbol: "MP",
        fees: [
            { feePercentage: 1, feeType: "" },
            { feePercentage: 3, feeType: "" },
        ],
        inputTokens: [
            { id: "1", name: "Token1", symbol: "TK1", decimals: 18 },
            { id: "2", name: "Token2", symbol: "TK2", decimals: 18 },
        ],
        id: "mock-pool-id",
    };
    const alchemy = new MockAlchemy();
    const processSwap = vi.fn();
    const lastPrice = BigNumber.from(1);

    let poolContract: PoolContract;

    beforeEach(() => {
        poolContract = new PoolContract(address, alchemy, abi, pool, processSwap, network);
        poolContract["lastPoolSqrtPriceX96"] = lastPrice;
    });

    it("should return the pool", () => {
        expect(poolContract.getPool()).toBe(pool);
    });

    it("should throw an error if the pool is not defined", () => {
        poolContract = new PoolContract(address, alchemy, abi, null as any, processSwap, network);
        expect(() => poolContract.getPool()).toThrowError("Pool is not defined");
    });

    it("should return the last pool sqrt price X96", () => {
        expect(poolContract.getLastPoolSqrtPriceX96()).toEqual(lastPrice);
    });

    it("should return the input tokens of the pool", () => {
        expect(poolContract.getInputTokens()).toEqual(pool.inputTokens);
    });

    it("should throw an error if input tokens are not defined", () => {
        pool.inputTokens = undefined as any;
        expect(() => poolContract.getInputTokens()).toThrowError("Input tokens are not defined");
    });

    it("should return 2 Fee objects", () => {
        expect(poolContract.getPool().fees).toHaveLength(2);
    });

    it("should return the total pool fees as a Decimal", () => {
        const expectedFees = new Decimal(0.03);
        expect(poolContract.getTotalPoolFeesAsDecimal()).toEqual(expectedFees);
    });

    it("should return the pool ID", () => {
        expect(poolContract.getPoolId()).toBe("mock-pool-id");
    });

    it("should process a swap event correctly when swapEventCallback is called", async () => {
        const mockArgs: [string, string, bigint, bigint, bigint, bigint, number] = [
            "0xSender", // Sender
            "0xRecipient", // Recipient
            100n, // Amount0
            200n, // Amount1
            300n, // sqrtPriceX96
            400n, // Liquidity
            5, // Tick
        ];

        await poolContract["swapEventCallback"](...mockArgs);

        expect(poolContract.getLastPoolSqrtPriceX96()).toEqual(BigNumber.from(300));

        const swap = new UniswapV3Swap("0xSender", "0xRecipient", 100n, 200n, BigNumber.from(300), 400n, address);

        expect(processSwap).toHaveBeenCalledWith(swap, lastPrice);
    });
});
