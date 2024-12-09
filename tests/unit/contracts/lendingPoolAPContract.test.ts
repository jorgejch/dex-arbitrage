import { beforeEach, describe, expect, it, vi } from "vitest";
import { LendingPoolAPContract } from "../../../src/contracts/lendingPoolAPContract.js";
import { Alchemy, Contract } from "alchemy-sdk";
import { Decimal } from "decimal.js";

describe("LendingPoolAPContract", () => {
    const mockAddress = "0x0000000000000000000000000000000000000000";
    const mockAbi: object[] = [];
    const mockNetwork = 1;

    const mockCoreNamespace = {
        call: vi.fn(),
    };

    const mockAlchemy = {
        core: mockCoreNamespace,
        config: {
            getProvider: vi.fn(),
        },
    } as unknown as Alchemy;

    let contract: LendingPoolAPContract;

    beforeEach(() => {
        contract = new LendingPoolAPContract(mockAddress, mockAlchemy, mockAbi, mockNetwork);
    });

    describe("getFlashloanFee", () => {
        it("should return cached flashloan fee if available", async () => {
            contract["flashloanFee"] = new Decimal(0.0009);
            const fee = await contract.getFlashloanFee();
            expect(fee.toString()).toBe("0.0009");
            expect(mockCoreNamespace.call).not.toHaveBeenCalled();
        });

        it("should throw an error if poolContract is not defined", async () => {
            await expect(contract.getFlashloanFee()).rejects.toThrow("Pool contract is not defined");
        });

        it("should call alchemy core to get flashloan fee", async () => {
            const mockPoolContract = {
                address: "0xMockPoolContract",
                interface: {
                    encodeFunctionData: vi.fn().mockReturnValue("mockData"),
                },
            };
            contract["poolContract"] = mockPoolContract as unknown as Contract;

            mockCoreNamespace.call.mockResolvedValue("9");

            const fee = await contract.getFlashloanFee();

            expect(fee.toString()).toBe("0.0009");
            expect(mockCoreNamespace.call).toHaveBeenCalledTimes(1);
            expect(mockCoreNamespace.call).toHaveBeenCalledWith({
                to: "0xMockPoolContract",
                data: "mockData",
            });
        });

        it("should throw an error if call to alchemy core fails", async () => {
            const mockPoolContract = {
                address: "0xMockPoolContract",
                interface: {
                    encodeFunctionData: vi.fn().mockReturnValue("mockData"),
                },
            };
            contract["poolContract"] = mockPoolContract as unknown as Contract;

            mockCoreNamespace.call.mockRejectedValue(new Error("Network error"));

            await expect(contract.getFlashloanFee()).rejects.toThrow("Failed to get flashloan fee");
        });
    });
});
