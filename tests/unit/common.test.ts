import { describe, it, expect, vi } from "vitest";
import {
  getLastFullHourUnixTime,
  getTGPancakeSwapUrl,
  exponentialBackoffDelay,
  isPriceImpactSignificant,
  convertSqrtPriceX96ToBigInt
} from "../../src/common.js";

describe("getLastFullHourUnixTime", () => {
  it("should return the correct number of hours since Unix epoch minus 1", () => {
    const mockDate = new Date("2023-10-01T12:00:00Z");
    const expectedHoursSinceEpoch =
      Math.floor(mockDate.getTime() / (3600 * 1000)) - 1;

    vi.setSystemTime(mockDate);

    const result = getLastFullHourUnixTime();
    expect(result).toBe(expectedHoursSinceEpoch);

    vi.useRealTimers();
  });

  it("should handle edge cases correctly", () => {
    const mockDate = new Date("1970-01-01T01:00:00Z");
    const expectedHoursSinceEpoch =
      Math.floor(mockDate.getTime() / (3600 * 1000)) - 1;

    vi.setSystemTime(mockDate);

    const result = getLastFullHourUnixTime();
    expect(result).toBe(expectedHoursSinceEpoch);

    vi.useRealTimers();
  });
});

describe("getTGPancakeSwapUrl", () => {
  it("should return the correct URL", () => {
    const baseUrl = "https://api.thegraph.com";
    const subgraphName = "pancakeswap";
    const expectedUrl = `${baseUrl}/subgraphs/name/${subgraphName}`;

    const result = getTGPancakeSwapUrl(baseUrl, subgraphName);
    expect(result).toBe(expectedUrl);
  });
});

describe("exponentialBackoffDelay", () => {
  it("should return a promise that resolves after a delay", async () => {
    const attempt = 3;
    const baseDelay = 100;
    const minDelay = Math.pow(2, attempt) * baseDelay;
    const maxDelay = minDelay + baseDelay;

    const start = Date.now();
    await exponentialBackoffDelay(attempt, baseDelay);
    const end = Date.now();

    const delay = end - start;
    expect(delay).toBeGreaterThanOrEqual(minDelay);
    expect(delay).toBeLessThanOrEqual(maxDelay);
  });
});

describe("convertSqrtPriceX96ToBigInt", () => {
  it("should convert Q64.96 fixed-point number to BigInt", () => {
    const sqrtPriceX96 = BigInt("79228162514264337593543950336"); // 2^96
    const expectedPrice = BigInt("79228162514264337593543950336"); // 2^96

    const result = convertSqrtPriceX96ToBigInt(sqrtPriceX96);
    expect(result).toBe(expectedPrice);
  });
});

describe("isPriceImpactSignificant", () => {
  it("should return true for significant price impact", () => {
    const priceImpact = BigInt(5); // 5 bps
    const result = isPriceImpactSignificant(priceImpact);
    expect(result).toBe(true);
  });

  it("should return false for insignificant price impact", () => {
    const priceImpact = BigInt(2); // 2 bps
    const result = isPriceImpactSignificant(priceImpact);
    expect(result).toBe(false);
  });
});