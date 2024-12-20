import { describe, expect, it } from "vitest";
import { BaseSwap } from "../../../src/swaps/baseSwap.js";
import { Token } from "../../../src/types.js";
import { BigNumber } from "alchemy-sdk";

class TestSwap extends BaseSwap {
    constructor(
        sender: string,
        recipient: string,
        amount0: bigint,
        amount1: bigint,
        sqrtPriceX96: BigNumber,
        liquidity: bigint,
        poolContract: string,
    ) {
        super(sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, poolContract);
    }
}

describe("BaseSwap", () => {
    it("should set and get input tokens correctly", () => {
        const swap = new TestSwap(
            "0xSender",
            "0xRecipient",
            -BigInt(1000),
            BigInt(2000),
            BigNumber.from(123456789),
            BigInt(1000000),
            "0xPoolContract",
        );
        const tokens: Token[] = [
            { symbol: "TOKEN1", id: "0xToken1", name: "Token One", decimals: 18 },
            { symbol: "TOKEN2", id: "0xToken2", name: "Token Two", decimals: 18 },
        ];

        swap.setTokens(tokens);
        expect(swap.getTokens()).toEqual(tokens);
    });

    it("should throw an error if input tokens are not set", () => {
        const swap = new TestSwap(
            "0xSender",
            "0xRecipient",
            -BigInt(3000),
            BigInt(4000),
            BigNumber.from(223456789),
            BigInt(2000000),
            "0xPoolContract",
        );
        expect(() => swap.getTokens()).toThrow("Input tokens not set");
    });

    it("should calculate price impact correctly", () => {
        const swap = new TestSwap(
            "0xSender",
            "0xRecipient",
            -BigInt(5000),
            BigInt(6000),
            BigNumber.from(323456789),
            BigInt(3000000),
            "0xPoolContract",
        );
        const lastPoolSqrtPriceX96 = BigNumber.from(1234560000000);
        const token0BigNumbers = 18;
        const token1BigNumbers = 18;

        const priceImpact = swap.calculatePriceImpact(lastPoolSqrtPriceX96, token0BigNumbers, token1BigNumbers);

        console.log(`priceImpact: ${priceImpact}`);
        expect(priceImpact).toBeGreaterThan(0);
    });

    it("should throw an error for division by zero", () => {
        const swap = new TestSwap(
            "0xSender",
            "0xRecipient",
            -BigInt(8000),
            BigInt(9000),
            BigNumber.from(523456789),
            BigInt(5000000),
            "0xPoolContract",
        );
        const lastPoolSqrtPriceX96 = BigNumber.from(0);
        const token0BigNumbers = 18;
        const token1BigNumbers = 18;

        expect(() => swap.calculatePriceImpact(lastPoolSqrtPriceX96, token0BigNumbers, token1BigNumbers)).toThrow(
            "Division by zero error: priceBefore is zero",
        );
    });

    // Additional tests
    it("should handle negative amounts correctly", () => {
        const swap = new TestSwap(
            "0xSender",
            "0xRecipient",
            -BigInt(500),
            BigInt(500),
            BigNumber.from(123456789),
            BigInt(1000000),
            "0xPoolContract",
        );

        expect(swap.amount0).toBe(BigInt(-500));
        expect(swap.amount1).toBe(BigInt(500));
    });

    it("should correctly set and get tokens with different decimals", () => {
        const swap = new TestSwap(
            "0xSender",
            "0xRecipient",
            -BigInt(6000),
            BigInt(7000),
            BigNumber.from(223456789),
            BigInt(2000000),
            "0xPoolContract",
        );
        const tokens: Token[] = [
            { symbol: "TOKEN3", id: "0xToken3", name: "Token Three", decimals: 6 },
            { symbol: "TOKEN4", id: "0xToken4", name: "Token Four", decimals: 8 },
        ];

        swap.setTokens(tokens);
        expect(swap.getTokens()).toEqual(tokens);
    });

    it("should calculate zero price impact when prices are equal", () => {
        const swap = new TestSwap(
            "0xSender",
            "0xRecipient",
            -BigInt(7000),
            BigInt(8000),
            BigNumber.from(323456789),
            BigInt(3000000),
            "0xPoolContract",
        );

        const lastPoolSqrtPriceX96 = BigNumber.from(323456789);
        const token0BigNumbers = 18;
        const token1BigNumbers = 18;

        const priceImpact = swap.calculatePriceImpact(lastPoolSqrtPriceX96, token0BigNumbers, token1BigNumbers);
        expect(priceImpact).toBe(0);
    });

    it("should handle large sqrtPriceX96 values correctly", () => {
        const swap = new TestSwap(
            "0xSender",
            "0xRecipient",
            -BigInt(9000),
            BigInt(10000),
            BigNumber.from("12345678912345678900"),
            BigInt(4000000),
            "0xPoolContract",
        );

        const lastPoolSqrtPriceX96 = BigNumber.from("123456789123456000");
        const token0BigNumbers = 18;
        const token1BigNumbers = 18;

        const priceImpact = swap.calculatePriceImpact(lastPoolSqrtPriceX96, token0BigNumbers, token1BigNumbers);
        expect(priceImpact).toBeGreaterThan(0);
    });

    it("should correctly handle zero liquidity", () => {
        const otherSwap = new TestSwap(
            "0xSender",
            "0xRecipient",
            BigInt(13000),
            BigInt(14000),
            BigNumber.from(523456789),
            BigInt(0),
            "0xPoolContract",
        );

        expect(otherSwap.liquidity).toBe(BigInt(0));
    });

    it("should calculate price impact correctly with different token decimals", () => {
        const swap = new TestSwap(
            "0xSender",
            "0xRecipient",
            -BigInt(17000),
            BigInt(18000),
            BigNumber.from(723476789),
            BigInt(7000000),
            "0xPoolContract",
        );

        const lastPoolSqrtPriceX96 = BigNumber.from(723456000);
        const token0BigNumbers = 6;
        const token1BigNumbers = 18;

        const priceImpact = swap.calculatePriceImpact(lastPoolSqrtPriceX96, token0BigNumbers, token1BigNumbers);
        expect(priceImpact).toBeGreaterThan(0);
    });

    it("should handle maximum bigint values without errors", () => {
        const maxBigInt = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
        const swap = new TestSwap(
            "0xSender",
            "0xRecipient",
            -maxBigInt,
            maxBigInt,
            BigNumber.from(maxBigInt.toString()),
            maxBigInt,
            "0xPoolContract",
        );

        expect(swap.amount0).toBe(-maxBigInt);
        expect(swap.amount1).toBe(maxBigInt);
        expect(swap.sqrtPriceX96).toEqual(BigNumber.from(maxBigInt));
        expect(swap.liquidity).toBe(maxBigInt);
    });
});
