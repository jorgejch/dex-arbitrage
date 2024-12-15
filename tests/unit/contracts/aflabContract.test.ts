import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AflabContract } from "../../../src/contracts/aflabContract.js";
import { Alchemy, BigNumber, Contract, TransactionResponse, Wallet } from "alchemy-sdk";
import { Opportunity } from "../../../src/types.js";
import { logger } from "../../../src/common.js";

describe("AflabContract Unit Tests", () => {
    let aflabContract: AflabContract;
    let address: string;
    let abi: object[];
    let wallet: Wallet;
    let alchemy: Alchemy;
    let network: number;
    let mockTxHandler: any;

    beforeEach(() => {
        address = "0xContractAddress";
        abi = []; // Replace with actual ABI

        wallet = {
            sendTransaction: vi.fn().mockResolvedValue({
                hash: "0xMockTransactionHash",
                to: "0xRecipientAddress",
                from: "0xSenderAddress",
                nonce: 0,
                gasLimit: BigNumber.from("21000"),
                gasPrice: BigNumber.from("1000000000"),
                data: "0xMockData",
                value: BigNumber.from("0"),
                chainId: 1,
                confirmations: 0
            } as TransactionResponse),
        } as unknown as Wallet;

        alchemy = vi.mocked({
            config: {
                getWebSocketProvider: vi.fn().mockResolvedValue({}),
            },
            core: {
                getGasPrice: vi.fn().mockResolvedValue(BigNumber.from("1000000000")),
                getTransactionCount: vi.fn().mockResolvedValue(1),
            },
            transact: {
                sendTransaction: vi.fn().mockResolvedValue({
                    hash: "0xTransactionHash",
                    wait: vi.fn().mockResolvedValue({
                        blockNumber: 123,
                        transactionHash: "0xTransactionHash",
                    }),
                    nonce: 1,
                    gasPrice: BigNumber.from("1000000000"),
                    gasLimit: BigNumber.from("21000"),
                }),
            },
        }) as unknown as Alchemy;

        network = 137;

        mockTxHandler = {
            push: vi.fn(),
        } as any;
        aflabContract = new AflabContract(address, abi, alchemy, wallet, network, mockTxHandler);
    });

    afterEach(() => {
        // Reset all mocks after each test
        vi.resetAllMocks();
    });

    it("should create an instance of AflabContract", () => {
        expect(aflabContract).toBeInstanceOf(AflabContract);
    });

    it("should throw an error if getArbitrageInfo is called with missing swap1 data", () => {
        const opportunity = {
            arbitrageInfo: {
                swap1: {},
                swap2: {},
                swap3: {},
            },
        } as Opportunity;

        expect(() => aflabContract["getArbitrageInfo"](opportunity)).toThrow("Missing value for component swap1");
    });

    it("should return valid arbitrageInfo from getArbitrageInfo", () => {
        const opportunity: Opportunity = {
            arbitrageInfo: {
                swap1: {
                    tokenIn: { id: "0xTokenIn1" },
                    tokenOut: { id: "0xTokenOut1" },
                    poolFee: BigNumber.from(3000),
                    amountOutMinimum: BigNumber.from(0),
                },
                swap2: {
                    tokenIn: { id: "0xTokenIn2" },
                    tokenOut: { id: "0xTokenOut2" },
                    poolFee: BigNumber.from(3000),
                    amountOutMinimum: BigNumber.from(0),
                },
                swap3: {
                    tokenIn: { id: "0xTokenIn3" },
                    tokenOut: { id: "0xTokenOut3" },
                    poolFee: BigNumber.from(3000),
                    amountOutMinimum: BigNumber.from(0),
                },
                estimatedGasCost: BigNumber.from(0),
            },
        } as Opportunity;

        const arbitrageInfo = aflabContract["getArbitrageInfo"](opportunity);

        expect(arbitrageInfo).toEqual({
            swap1: {
                tokenIn: "0xTokenIn1",
                tokenOut: "0xTokenOut1",
                poolFee: 3000,
                amountOutMinimum: BigNumber.from(0),
            },
            swap2: {
                tokenIn: "0xTokenIn2",
                tokenOut: "0xTokenOut2",
                poolFee: 3000,
                amountOutMinimum: BigNumber.from(0),
            },
            swap3: {
                tokenIn: "0xTokenIn3",
                tokenOut: "0xTokenOut3",
                poolFee: 3000,
                amountOutMinimum: BigNumber.from(0),
            },
            extraCost: BigNumber.from(0),
        });
    });

    it("should execute opportunity successfully", async () => {
        const mockContract = {
            interface: {
                encodeFunctionData: vi.fn().mockReturnValue("0xEncodedData"),
            },
        };
        aflabContract["contract"] = mockContract as unknown as Contract;

        const opportunity: Opportunity = {
            arbitrageInfo: {
                swap1: {
                    tokenIn: { id: "0xTokenIn1" },
                    tokenOut: { id: "0xTokenOut1" },
                    poolFee: BigNumber.from(3000),
                    amountOutMinimum: BigNumber.from(0),
                },
                swap2: {
                    tokenIn: { id: "0xTokenIn2" },
                    tokenOut: { id: "0xTokenOut2" },
                    poolFee: BigNumber.from(3000),
                    amountOutMinimum: BigNumber.from(0),
                },
                swap3: {
                    tokenIn: { id: "0xTokenIn3" },
                    tokenOut: { id: "0xTokenOut3" },
                    poolFee: BigNumber.from(3000),
                    amountOutMinimum: BigNumber.from(0),
                },
                estimatedGasCost: BigNumber.from(200000),
            },
            tokenAIn: BigNumber.from(1000000000000000000n), // 1 token
        } as Opportunity;

        await aflabContract.executeOpportunity(opportunity);

        expect(mockContract.interface.encodeFunctionData).toHaveBeenCalled();
        expect(mockTxHandler.push).toHaveBeenCalled();
    });
    it("should should log message and return on executeOpportunity when the contract is not initialized", async () => {
        aflabContract["contract"] = undefined;

        const opportunity: Opportunity = {
            arbitrageInfo: {
                swap1: {
                    tokenIn: { id: "0xTokenIn1" },
                    tokenOut: { id: "0xTokenOut1" },
                    poolFee: BigNumber.from(3000),
                    amountOutMinimum: BigNumber.from(0),
                },
                swap2: {
                    tokenIn: { id: "0xTokenIn2" },
                    tokenOut: { id: "0xTokenOut2" },
                    poolFee: BigNumber.from(3000),
                    amountOutMinimum: BigNumber.from(0),
                },
                swap3: {
                    tokenIn: { id: "0xTokenIn3" },
                    tokenOut: { id: "0xTokenOut3" },
                    poolFee: BigNumber.from(3000),
                    amountOutMinimum: BigNumber.from(0),
                },
                estimatedGasCost: BigNumber.from(200000),
            },
            tokenAIn: BigNumber.from(1000000000000000000n), // 1 token
        } as Opportunity;

        // Spy the logger.error method
        const spy = vi.spyOn(logger, "error");

        await aflabContract.executeOpportunity(opportunity);

        expect(spy).toHaveBeenCalledWith(
            "AFLAB contract not initialized. Cannot execute opportunity.",
            "AflabContract",
        );
    }, 10000);
});
