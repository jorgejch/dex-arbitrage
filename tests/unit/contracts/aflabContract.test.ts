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
    let opportunity: Opportunity;
    let arbitrageInfo: any;

    beforeEach(() => {
        address = "0xContractAddress";
        abi = [];
        opportunity = {
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
                chainId: 137,
                confirmations: 0,
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

    it("should should log error message on executeOpportunity when the contract is not initialized", async () => {
        aflabContract["contract"] = undefined;

        // Spy the logger.error method
        const spy = vi.spyOn(logger, "error");

        await aflabContract.executeOpportunity(opportunity);

        expect(spy).toHaveBeenCalledWith(
            "AFLAB contract not initialized. Cannot execute opportunity.",
            "AflabContract",
        );
    }, 10000);

    it("should get the correct transaction request from getTransactionRequest", async () => {
        const arbitrageInfo = opportunity.arbitrageInfo;
        vi.spyOn(aflabContract as any, "getArbitrageInfo").mockReturnValue(arbitrageInfo);
        const mockContract = {
            interface: {
                encodeFunctionData: vi.fn().mockReturnValue("0xEncodedData"),
            },
        };
        aflabContract["contract"] = mockContract as unknown as Contract;
        const txRequest = await aflabContract["getTransactionRequest"](
            wallet.address,
            address,
            arbitrageInfo,
            BigNumber.from(1000),
        );
        expect(txRequest).toEqual({
            from: wallet.address,
            to: address,
            data: "0xEncodedData",
            value: BigNumber.from(0),
            chainId: network,
            gasLimit: 1500000,
            gasPrice: BigNumber.from("1000000000"),
        });
    });

    it("should log error and return if getTransactionRequest throws an error", async () => {
        vi.spyOn(aflabContract as any, "getArbitrageInfo").mockReturnValue(arbitrageInfo);

        const errorMsg = "Error constructing transaction request";
        vi.spyOn(aflabContract as any, "getTransactionRequest").mockImplementation(() => {
            throw new Error(errorMsg);
        });

        const loggerErrorSpy = vi.spyOn(logger, "error");

        await aflabContract.executeOpportunity(opportunity);

        expect(loggerErrorSpy).toHaveBeenCalledWith(
            "AFLAB contract not initialized. Cannot execute opportunity.",
            "AflabContract",
        );
        expect(mockTxHandler.push).not.toHaveBeenCalled();
    });

    it("should push transaction request to txHandler when all steps succeed", async () => {
        const arbitrageInfo = opportunity.arbitrageInfo;
        vi.spyOn(aflabContract as any, "getArbitrageInfo").mockReturnValue(arbitrageInfo);

        const txRequest = {
            from: wallet.address,
            to: address,
            data: "0xEncodedData",
            value: BigNumber.from(0),
            chainId: network,
            gasLimit: 1500000,
            gasPrice: BigNumber.from("1000000000"),
        };
        vi.spyOn(aflabContract as any, "getTransactionRequest").mockResolvedValue(txRequest);

        const mockContract = {
            interface: {
                encodeFunctionData: vi.fn().mockReturnValue("0xEncodedData"),
            },
        };
        aflabContract["contract"] = mockContract as unknown as Contract;

        await aflabContract.executeOpportunity(opportunity);

        expect(mockTxHandler.push).toHaveBeenCalledWith(txRequest, expect.any(Function));
    });

    it("should handle error when waiting for transaction receipt", async () => {
        const arbitrageInfo = opportunity.arbitrageInfo;
        vi.spyOn(aflabContract as any, "getArbitrageInfo").mockReturnValue(arbitrageInfo);

        const txRequest = {
            from: wallet.address,
            to: address,
            data: "0xEncodedData",
            value: BigNumber.from(0),
            chainId: network,
            gasLimit: 1500000,
            gasPrice: BigNumber.from("1000000000"),
        };
        vi.spyOn(aflabContract as any, "getTransactionRequest").mockResolvedValue(txRequest);

        const errorMsg = "Error waiting for receipt";
        const mockTransactionResponse = {
            wait: vi.fn().mockRejectedValue(new Error(errorMsg)),
        } as unknown as TransactionResponse;

        mockTxHandler.push.mockImplementation((_: any, callback: (arg0: null, arg1: TransactionResponse) => void) => {
            callback(null, mockTransactionResponse);
        });

        const loggerErrorSpy = vi.spyOn(logger, "error");

        await aflabContract.executeOpportunity(opportunity);

        expect(loggerErrorSpy).toHaveBeenCalledWith(
            "AFLAB contract not initialized. Cannot execute opportunity.",
            "AflabContract",
        );
    });
});
