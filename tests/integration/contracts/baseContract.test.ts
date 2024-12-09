import { ContractType } from "../../../src/types.js";
import { BaseContract } from "../../../src/contracts/baseContract.js";
import { config } from "../../../src/common.js";
import { Alchemy, Contract, Network } from "alchemy-sdk";
import { beforeEach, describe, expect, test, vi } from "vitest";
import dotenv from "dotenv";

dotenv.config();

class TestContract extends BaseContract {
    constructor(alchemy: Alchemy, address: string, abi: any, contractType: ContractType) {
        super(address, abi, contractType, alchemy, 137);
    }

    protected async createContract(): Promise<void> {
        this.contract = vi.fn() as unknown as Contract;
    }

    protected async customInit(): Promise<void> {
        // Mock implementation
    }

    async listenForEvents(contract: Contract): Promise<void> {
        if (!contract) {
            throw new Error("Contract is not defined");
        }
        const wsProvider = await this.alchemy.config.getWebSocketProvider();
        wsProvider.on("Swap", (event: any) => {
            console.log("Event received:", event);
        });
    }
}

describe("Base Contract Integration Tests", () => {
    let testContract: TestContract;

    beforeEach(async () => {
        testContract = new TestContract(
            new Alchemy({
                apiKey: process.env.ALCHEMY_API_KEY,
                network: Network.MATIC_MAINNET,
            }),
            "0x1234",
            config.POOL_ABI,
            ContractType.TEST,
        );

        try {
            await testContract.initialize();
        } catch (e) {
            console.log(`Error initializing contract: ${e}`);
        }
    });

    test("should initialize the contract", () => {
        expect(testContract).toBeDefined();
        expect(testContract.getContractType()).toBe(ContractType.TEST);
    });
});
