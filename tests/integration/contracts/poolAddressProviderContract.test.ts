import { beforeAll, describe, expect, it } from "vitest";
import { Alchemy, Network } from "alchemy-sdk";
import { config } from "../../../src/common.js";
import { LendingPoolAPContract } from "../../../src/contracts/lendingPoolAPContract.js";
import dotenv from "dotenv";
import { Decimal } from "decimal.js";

dotenv.config();
const privateKey = process.env.WALLET_PRIVATE_KEY as string;
const apiKey = process.env.ALCHEMY_API_KEY as string;
const contractAddress = process.env.AAVE_POOL_ADDRESS_PROVIDER_CONTRACT_ADDRESS as string;

describe("PoolAddressProviderContract Integration Tests", () => {
    let contract: LendingPoolAPContract;
    let alchemy: Alchemy;

    beforeAll(async () => {
        if (!privateKey || !apiKey || !contractAddress) {
            throw new Error("Missing environment variables");
        }
        console.log(contractAddress);
        alchemy = new Alchemy({ apiKey: apiKey, network: Network.MATIC_MAINNET });

        contract = new LendingPoolAPContract(contractAddress, alchemy, config.LENDING_POOL_AP_ABI, 137);
        await contract.initialize();
    });

    it("should initialize the contract correctly", () => {
        expect(contract).toBeDefined();
        expect(contract["contract"]).toBeDefined();
    });

    it("should get the flashloan fee", async () => {
        try {
            const fee: Decimal = await contract.getFlashloanFee();
            expect(fee.gt(0)).toBeTruthy();
            console.log("Flashloan Fee:", fee);
        } catch (e) {
            console.log(`Error getting flashloan fee: ${e}`);
        }
    });
});
