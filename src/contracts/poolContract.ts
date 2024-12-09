import { ContractType, Pool, Token } from "../types.js";
import { BaseContract } from "./baseContract.js";
import { logger } from "../common.js";
import { UniswapV3Swap } from "../swaps/uniswapV3Swap.js";

import { Alchemy, BigNumber, Contract } from "alchemy-sdk";
import { Decimal } from "decimal.js";

/**
 * A contract class representing a liquidity pool.
 *
 * Listens for Swap events emitted by the pool contract and processes them using the provided `processSwapFunction`.
 * It maintains the last pool square root price and provides methods to access pool information such as input tokens
 * and total pool fees.
 *
 * @extends BaseContract
 *
 * @param address - The pool contract address.
 * @param wsManager - The WebSocket manager for managing connections.
 * @param abi - The contract's ABI.
 * @param pool - The pool instance associated with this contract.
 * @param processSwapFunction - A function to process Swap events, receiving a `PSv3Swap` object and the last pool sqrt
 *     price.
 * @param network - The network ID.
 */
class PoolContract extends BaseContract {
    protected readonly pool: Pool;
    private readonly processSwap: (psv3Swap: UniswapV3Swap, lastPoolSqrtPriceX96: BigNumber) => Promise<void>;
    private lastPoolSqrtPriceX96: BigNumber;
    private totalPoolFeesCache: Decimal | null = null;

    constructor(
        address: string,
        alchemy: Alchemy,
        abi: object[],
        pool: Pool,
        processSwapFunction: (psv3Swap: UniswapV3Swap, lastPoolSqrtPriceX96: BigNumber) => Promise<void>,
        network: number,
    ) {
        super(address, abi, ContractType.POOL, alchemy, network);
        this.processSwap = processSwapFunction;
        this.pool = pool;
        this.lastPoolSqrtPriceX96 = BigNumber.from(0);
    }

    public getPool(): Pool {
        if (!this.pool) {
            throw new Error("Pool is not defined");
        }
        return this.pool;
    }

    public getLastPoolSqrtPriceX96(): BigNumber {
        return this.lastPoolSqrtPriceX96;
    }

    public getInputTokens(): Token[] {
        if (!this.pool?.inputTokens) {
            throw new Error("Input tokens are not defined");
        }
        return this.pool.inputTokens;
    }

    /**
     * Get the total pool fees as a Decimal.
     * The total pool fees are the sum of all fees in the pool.
     * @returns {Decimal} The total pool fees
     */
    public getTotalPoolFeesAsDecimal(): Decimal {
        if (this.totalPoolFeesCache === null) {
            const totalFeePercentage: Decimal = this.pool.fees.reduce((acc, fee) => {
                const feePercentage: Decimal = new Decimal(fee.feePercentage);
                return acc.add(feePercentage);
            }, new Decimal(0));
            this.totalPoolFeesCache = totalFeePercentage.div(100);
        }
        return this.totalPoolFeesCache;
    }

    /**
     * Get the pool's address.
     *
     * @returns The pool's address
     */
    public getPoolId(): string {
        return this.pool.id;
    }

    /**
     * Create the contract instance.
     * @throws An error if the contract cannot be created
     */
    protected async createContract(): Promise<void> {
        try {
            this.contract = new Contract(this.address, this.abi, await this.alchemy.config.getWebSocketProvider());
        } catch (error) {
            logger.error(`Error creating contract: ${error}`, this.constructor.name);
        }
    }

    /**
     * Custom initialization logic.
     */
    protected async customInit(): Promise<void> {
        /* Add any subclass specific initialization logic here */
    }

    /**
     * Listen for Swap events emitted by the contract.
     *
     * @param contract The ethers.js compatible contract instance
     */
    async listenForEvents(contract: Contract): Promise<void> {
        if (!this.processSwap) {
            throw new Error("processSwap function is not defined");
        }
        contract.on("Swap", this.swapEventCallback.bind(this));
        logger.info(`Listening for Swap events on contract ${this.address}`, this.constructor.name);
    }

    private async swapEventCallback(
        ...args: [
            string, // sender
            string, // recipient
            bigint, // amount0
            bigint, // amount1
            bigint, // sqrtPriceX96
            bigint, // liquidity
            number, // tick
        ]
    ) {
        try {
            const [sender, recipient, amount0, amount1, sqrtPriceX96, liquidity] = args;
            const poolContractAddress = this.address;
            const sqrtPriceX96BigNumber = BigNumber.from(sqrtPriceX96);
            const swap = new UniswapV3Swap(
                sender,
                recipient,
                amount0,
                amount1,
                sqrtPriceX96BigNumber,
                liquidity,
                poolContractAddress,
            );

            /*
             * The first Swap caught is a sacrifice
             * in order to initialize lastPoolSqrtPriceX96
             */
            if (this.getLastPoolSqrtPriceX96() > BigNumber.from(0)) {
                try {
                    await this.processSwap(swap, this.lastPoolSqrtPriceX96);
                } catch (error) {
                    logger.warn(`Error processing swap event: ${error}`, this.constructor.name);
                    // Print stack trace
                    if (error instanceof Error && error.stack) {
                        logger.warn(error.stack, this.constructor.name);
                    }
                }
            }

            // Keep track of the last pool price
            this.lastPoolSqrtPriceX96 = sqrtPriceX96BigNumber;
        } catch (error) {
            logger.error(`Error processing swap event: ${error}`, this.constructor.name);
        }
    }
}

export { PoolContract };
