import { describe, it, expect } from "vitest";
import { BaseSwap } from "../../../src/swaps/baseSwap.js";
import { Token } from "../../../src/types.js";
import Big from "bn.js";

class TestSwap extends BaseSwap {
  constructor(
    sender: string,
    recipient: string,
    amount0: bigint,
    amount1: bigint,
    sqrtPriceX96: bigint,
    liquidity: bigint,
    poolContract: string
  ) {
    super(
      sender,
      recipient,
      amount0,
      amount1,
      sqrtPriceX96,
      liquidity,
      poolContract
    );
  }
}

describe("BaseSwap", () => {

  it("should set and get input tokens correctly", () => {
    const swap = new TestSwap(
      "0xSender",
      "0xRecipient",
      -BigInt(1000),
      BigInt(2000),
      BigInt(123456789),
      BigInt(1000000),
      "0xPoolContract"
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
      BigInt(223456789),
      BigInt(2000000),
      "0xPoolContract"
    );
    expect(() => swap.getTokens()).toThrow("Input tokens not set");
  });

  it("should calculate price impact correctly", () => {
    const swap = new TestSwap(
      "0xSender",
      "0xRecipient",
      -BigInt(5000),
      BigInt(6000),
      BigInt(323456789),
      BigInt(3000000),
      "0xPoolContract"
    );
    const lastPoolSqrtPriceX96 = BigInt(1234560000000);
    const token0Decimals = 18;
    const token1Decimals = 18;

    const priceImpact = swap.calculatePriceImpact(
      lastPoolSqrtPriceX96,
      token0Decimals,
      token1Decimals
    )

    console.log(`priceImpact: ${priceImpact}`);
    expect(priceImpact).toBeGreaterThan(0);
  });

  it("should throw an error for division by zero", () => {
    const swap = new TestSwap(
      "0xSender",
      "0xRecipient",
      -BigInt(8000),
      BigInt(9000),
      BigInt(523456789),
      BigInt(5000000),
      "0xPoolContract"
    );
    const lastPoolSqrtPriceX96 = BigInt(0);
    const token0Decimals = 18;
    const token1Decimals = 18;

    expect(() =>
      swap.calculatePriceImpact(
        lastPoolSqrtPriceX96,
        token0Decimals,
        token1Decimals
      )
    ).toThrow("Division by zero error: priceBefore is zero");
  });

  // Additional tests
  it("should handle negative amounts correctly", () => {
    const swap = new TestSwap(
      "0xSender",
      "0xRecipient",
      -BigInt(500),
      BigInt(500),
      BigInt(123456789),
      BigInt(1000000),
      "0xPoolContract"
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
      BigInt(223456789),
      BigInt(2000000),
      "0xPoolContract"
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
      BigInt(323456789),
      BigInt(3000000),
      "0xPoolContract"
    );

    const lastPoolSqrtPriceX96 = BigInt(323456789);
    const token0Decimals = 18;
    const token1Decimals = 18;

    const priceImpact = swap.calculatePriceImpact(
      lastPoolSqrtPriceX96,
      token0Decimals,
      token1Decimals
    );
    expect(priceImpact).toBe(0);
  });

  it("should handle large sqrtPriceX96 values correctly", () => {
    const swap = new TestSwap(
      "0xSender",
      "0xRecipient",
      -BigInt(9000),
      BigInt(10000),
      BigInt("12345678912345678900"),
      BigInt(4000000),
      "0xPoolContract"
    );

    const lastPoolSqrtPriceX96 = BigInt("123456789123456000");
    const token0Decimals = 18;
    const token1Decimals = 18;

    const priceImpact = swap.calculatePriceImpact(
      lastPoolSqrtPriceX96,
      token0Decimals,
      token1Decimals
    );
    expect(priceImpact).toBeGreaterThan(0);
  });

  it("should correctly handle zero liquidity", () => {
    const otherSwap = new TestSwap(
      "0xSender",
      "0xRecipient",
      BigInt(13000),
      BigInt(14000),
      BigInt(523456789),
      BigInt(0),
      "0xPoolContract"
    );

    expect(otherSwap.liquidity).toBe(BigInt(0));
  });


  it("should calculate price impact correctly with different token decimals", () => {
    const swap = new TestSwap(
      "0xSender",
      "0xRecipient",
      -BigInt(17000),
      BigInt(18000),
      BigInt(723476789),
      BigInt(7000000),
      "0xPoolContract"
    );

    const lastPoolSqrtPriceX96 = BigInt(723456000);
    const token0Decimals = 6;
    const token1Decimals = 18;

    const priceImpact = swap.calculatePriceImpact(
      lastPoolSqrtPriceX96,
      token0Decimals,
      token1Decimals
    );
    expect(priceImpact).toBeGreaterThan(0);
  });

  it("should handle maximum bigint values without errors", () => {
    const maxBigInt = BigInt(
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    );
    const swap = new TestSwap(
      "0xSender",
      "0xRecipient",
      -maxBigInt,
      maxBigInt,
      maxBigInt,
      maxBigInt,
      "0xPoolContract"
    );

    expect(swap.amount0).toBe(-maxBigInt);
    expect(swap.amount1).toBe(maxBigInt);
    expect(swap.sqrtPriceX96).toBe(maxBigInt);
    expect(swap.liquidity).toBe(maxBigInt);
  });
});
