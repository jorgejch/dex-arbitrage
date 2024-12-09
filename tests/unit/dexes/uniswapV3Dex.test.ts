import { describe, expect, it, vi } from "vitest";
import { UniswapV3Dex } from "../../../src/dexes/uniswapV3Dex.js"; // assuming the file path is correct
import { Alchemy, BigNumber, Wallet } from "alchemy-sdk";
import { DexPoolSubgraph } from "../../../src/subgraphs/dexPoolSubgraph.js";
import { AflabContract } from "../../../src/contracts/aflabContract.js";
import { LendingPoolAPContract } from "../../../src/contracts/lendingPoolAPContract.js";
import { Token } from "../../../src/types.js";

describe("UniswapV3Dex Class", () => {
    const alchemyMock = {} as Alchemy;
    const walletMock = {} as Wallet;
    const subgraphMock = {
        initialize: () => Promise.resolve(),
        getPools: () => Promise.resolve([]),
    } as unknown as DexPoolSubgraph;
    const aflabContractMock = {
        initialize: () => Promise.resolve(),
    } as AflabContract;
    const lendingPoolAPContractMock = {
        initialize: () => Promise.resolve(),
    } as LendingPoolAPContract;
    const networkIdMock = 1;

    it("should initialize correctly", async () => {
        const dex = new UniswapV3Dex(
            alchemyMock,
            walletMock,
            subgraphMock,
            aflabContractMock,
            lendingPoolAPContractMock,
            networkIdMock,
        );

        const spyAflabInitialize = vi
            .spyOn(aflabContractMock, "initialize")
            .mockImplementation(() => Promise.resolve());
        const spyLendingPoolInitialize = vi
            .spyOn(lendingPoolAPContractMock, "initialize")
            .mockImplementation(() => Promise.resolve());
        const spySubgraphInitialize = vi.spyOn(subgraphMock, "initialize").mockImplementation(() => Promise.resolve());
        const spySubgraphGetPools = vi.spyOn(subgraphMock, "getPools").mockImplementation(() => Promise.resolve([]));

        await dex.initialize();

        expect(spyAflabInitialize).toHaveBeenCalled();
        expect(spyLendingPoolInitialize).toHaveBeenCalled();
        expect(spySubgraphInitialize).toHaveBeenCalled();
        expect(spySubgraphGetPools).toHaveBeenCalled();
    });

    it("should process swap events", async () => {
        const dex = new UniswapV3Dex(
            alchemyMock,
            walletMock,
            subgraphMock,
            aflabContractMock,
            lendingPoolAPContractMock,
            networkIdMock,
        );

        const swapMock = {
            getContractAddress: () => "",
            setTokens: () => {},
            amount0: 100, // Mock some valid amount
            amount1: 200, // Mock some valid amount
            calculatePriceImpact: () => 100,
            handleSignificantPriceImpact: () => Promise.resolve(),
        };

        const tokenMock = { symbol: "TOKEN", decimals: 18 } as Token;
        const spyGetContract = vi.spyOn(dex, "getContract").mockImplementation(
            () =>
                ({
                    getInputTokens: () => [tokenMock, tokenMock],
                }) as any,
        );
        const spySetTokens = vi.spyOn(swapMock, "setTokens" as any);
        const spyCalculatePriceImpact = vi.spyOn(swapMock, "calculatePriceImpact" as any).mockReturnValue(100);
        const spyHandleSignificantPriceImpact = vi
            .spyOn(dex, "handleSignificantPriceImpact" as any)
            .mockImplementation(() => Promise.resolve());

        await dex.processSwap(swapMock as any, BigNumber.from(1));

        expect(spyGetContract).toHaveBeenCalled();
        expect(spySetTokens).toHaveBeenCalled();
        expect(spyCalculatePriceImpact).toHaveBeenCalled();
        expect(spyHandleSignificantPriceImpact).toHaveBeenCalled();
    });
});
