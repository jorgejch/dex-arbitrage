import {BaseContract}   from "./baseContract.js";
import {config, logger} from "../common.js";
import {ContractType}   from "../types.js";

import {Alchemy, Contract, TransactionRequest} from "alchemy-sdk";
import {Decimal}                               from "decimal.js";

class LendingPoolAPContract extends BaseContract {
    private poolContract?: Contract;
    private flashloanFee?: Decimal;

    constructor(address: string, alchemy: Alchemy, abi: object[], network: number) {
        super(address, abi, ContractType.POOL_ADDRESS_PROVIDER, alchemy, network);
    }

    public async getFlashloanFee(): Promise<Decimal> {
        if (this.flashloanFee) {
            return this.flashloanFee;
        }

        if (!this.poolContract) {
            throw new Error("Pool contract is not defined");
        }

        const tr: TransactionRequest = {
            to: this.poolContract.address,
            data: this.poolContract.interface.encodeFunctionData("FLASHLOAN_PREMIUM_TOTAL", []),
        };

        let fee: string;
        try {
            fee = await this.alchemy.core.call(tr);
        } catch (e) {
            logger.warn(`Error getting flashloan fee: ${e}`, this.constructor.name);
            throw new Error("Failed to get flashloan fee");
        }

        this.flashloanFee = new Decimal(fee).div(1e4);
        return this.flashloanFee;
    }

    protected async createContract() {
        this.contract = new Contract(this.address, this.abi, await this.alchemy.config.getProvider());
    }

    protected async customInit(): Promise<void> {
        const poolAddress = await this.getPoolAddress();
        console.log("Pool address:", poolAddress);
        if (!poolAddress) {
            throw new Error("Pool address is not defined");
        }
        console.log("Pool address:", poolAddress);

        this.poolContract = new Contract(poolAddress, config.LENDING_POOL_ABI, await this.alchemy.config.getProvider());
    }

    protected async listenForEvents(contract: Contract) {
        contract.on("PoolUpdated", async (poolAddress) => {
            logger.info(`Pool address updated: ${poolAddress}`, this.constructor.name);
        });
    }

    private async getPoolAddress(): Promise<string> {
        const tr: TransactionRequest = {
            to: this.address, data: this.contract?.interface.encodeFunctionData("getPool", []),
        };

        let rawPoolAddress: string;
        try {
            rawPoolAddress = await this.alchemy.core.call(tr);
        } catch (e) {
            logger.warn(`Error getting pool address: ${e}`, this.constructor.name);
            throw new Error("Failed to get pool address");
        }

        // Ensure rawPoolAddress is defined and is not huge.
        if (!rawPoolAddress || rawPoolAddress.length > 100) {
            throw new Error("Invalid pool address");
        }

        // There is a strange series of 0s at the beginning of the address
        const match = /^0x0+(.+)$/.exec(rawPoolAddress)!;
        return `0x${match[1]}`;
    }
}

export {LendingPoolAPContract};
