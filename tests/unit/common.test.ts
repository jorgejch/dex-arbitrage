import { BigNumber } from "alchemy-sdk";
import {
    config,
    exponentialBackoffDelay,
    getHoursSinceUnixEpoch,
    getTGUrl,
    isPriceImpactSignificant,
    sqrtPriceX96ToDecimal,
} from "../../src/common.js";

import { describe, expect, it, vi } from "vitest";

describe("getLastFullHourUnixTime", () => {
    it("should return the correct number of hours since Unix epoch minus 1", () => {
        const mockDate = new Date("2023-10-01T12:00:00Z");
        const expectedHoursSinceEpoch = Math.floor(mockDate.getTime() / (3600 * 1000)) - 1;

        vi.setSystemTime(mockDate);

        const result = getHoursSinceUnixEpoch();
        expect(result).toBe(expectedHoursSinceEpoch);

        vi.useRealTimers();
    });

    it("should return the correct number of hours since Unix epoch minus 1 for now", () => {
        const date = new Date();
        const expectedHoursSinceEpoch = Math.floor(date.getTime() / (3600 * 1000) - 1);

        const result = getHoursSinceUnixEpoch();
        console.log(expectedHoursSinceEpoch);
        console.log(result);
        expect(result).toBe(expectedHoursSinceEpoch);

        vi.useRealTimers();
    });

    it("should handle edge cases correctly", () => {
        const mockDate = new Date("1970-01-01T01:00:00Z");
        const expectedHoursSinceEpoch = Math.floor(mockDate.getTime() / (3600 * 1000)) - 1;

        vi.setSystemTime(mockDate);

        const result = getHoursSinceUnixEpoch();
        expect(result).toBe(expectedHoursSinceEpoch);

        vi.useRealTimers();
    });
});

describe("getTGUrl", () => {
    it("should return the correct URL", () => {
        const baseUrl = "https://api.thegraph.com";
        const subgraphName = "pancakeswap";
        const apiKey = "api-key";
        const expectedUrl = `${baseUrl}/api/${apiKey}/subgraphs/id/${subgraphName}`;

        const result = getTGUrl(baseUrl, subgraphName, apiKey);
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

describe("sqrtPriceX96ToDecimal", () => {
    it("should correctly calculate the price when token decimals are equal", () => {
        const sqrtPriceX96 = BigNumber.from(79228162514264337593543950336n); // 2^96, corresponds to price 1
        const token0BigNumbers = 18;
        const token1BigNumbers = 18;
        const expectedPrice = 1;

        const result = sqrtPriceX96ToDecimal(sqrtPriceX96, token0BigNumbers, token1BigNumbers);
        console.log(`result: ${result.toString()}, expected: ${expectedPrice}`);
        expect(result.toNumber()).equal(expectedPrice);
    });

    it("should correctly calculate the price when token0 has more decimals than token1", () => {
        const sqrtPriceX96 = BigNumber.from(79228162514264337593543950336n);
        const token0BigNumbers = 20;
        const token1BigNumbers = 18;
        const expectedPrice = 100;

        const result = sqrtPriceX96ToDecimal(sqrtPriceX96, token0BigNumbers, token1BigNumbers);
        console.log(`result: ${result.toString()}, expected: ${expectedPrice}`);
        expect(result.toNumber()).equal(expectedPrice);
    });

    it("should correctly calculate the price when token1 has more decimals than token0", () => {
        const sqrtPriceX96 = BigNumber.from(25054144837598984238623601279n); // Example price < 1
        const token0BigNumbers = 18;
        const token1BigNumbers = 20;

        const result = sqrtPriceX96ToDecimal(sqrtPriceX96, token0BigNumbers, token1BigNumbers);
        console.log(`result: ${result.toString()}`);
        expect(result.toNumber()).greaterThan(0);
    });

    it("should return 0 when sqrtPriceX96 is 0", () => {
        const sqrtPriceX96 = BigNumber.from(0);
        const token0BigNumbers = 18;
        const token1BigNumbers = 18;
        const expectedPrice = 0;

        const result = sqrtPriceX96ToDecimal(sqrtPriceX96, token0BigNumbers, token1BigNumbers);
        expect(result.toNumber()).equal(expectedPrice);
    });

    it("should handle large sqrtPriceX96 values", () => {
        const sqrtPriceX96 = BigNumber.from(1461501637330902918203684832716283019655932542976n);
        const token0BigNumbers = 18;
        const token1BigNumbers = 18;

        const result = sqrtPriceX96ToDecimal(sqrtPriceX96, token0BigNumbers, token1BigNumbers);
        expect(result.toNumber()).greaterThan(0);
    });
});

describe("isPriceImpactSignificant", () => {
    it("should return true for significant price impact", () => {
        const priceImpact = config.PRICE_IMPACT_THRESHOLD;
        const result = isPriceImpactSignificant(priceImpact);
        expect(result).toBe(true);
    });

    it("should return false for insignificant price impact", () => {
        const priceImpact = config.PRICE_IMPACT_THRESHOLD - 1;
        const result = isPriceImpactSignificant(priceImpact);
        expect(result).toBe(false);
    });
});
