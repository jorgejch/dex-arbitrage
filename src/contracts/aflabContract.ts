import { BaseContract } from "./baseContract.js";
import { ContractType, Opportunity } from "../types.js";
import { logger } from "../common.js";
import { TxHandler } from "../txHandler.js";

import {
    Alchemy,
    BigNumber,
    Contract,
    TransactionReceipt,
    TransactionRequest,
    TransactionResponse,
    Wallet,
} from "alchemy-sdk";

const INITIATE_FLASHLOAN_SIG = "initiateFlashLoan";

/**
 * A class to interact with the AFLAB (FlashLoanArbitrage) PancakeSwap V3 smart contract.
 */
class AflabContract extends BaseContract {
    private readonly wallet: Wallet;
    private readonly txHandler: TxHandler;

    /**
     * Creates an instance of the AFLAB contract.
     *
     * @param address The address of the AFLAB contract
     * @param abi The ABI of the AFLAB contract
     * @param alchemy The Alchemy SDK instance
     * @param wallet The provider instance
     * @param network The network ID
     * @param txHandler The transaction handler instance
     */
    constructor(
        address: string,
        abi: object[],
        alchemy: Alchemy,
        wallet: Wallet,
        network: number,
        txHandler: TxHandler,
    ) {
        super(address, abi, ContractType.AFLAB, alchemy, network);
        this.wallet = wallet;
        this.txHandler = txHandler;
    }

    /**
     * Executes an arbitrage opportunity.
     * @param opportunity The arbitrage opportunity to execute.
     */
    public async executeOpportunity(opportunity: Opportunity): Promise<void> {
        if (!this.contract) {
            logger.error(`AFLAB contract not initialized. Cannot execute opportunity.`, this.constructor.name);
            return;
        }
        let arbitrageInfo;

        try {
            arbitrageInfo = this.getArbitrageInfo(opportunity);
        } catch (error) {
            logger.error(`Invalid arbitrage opportunity: ${error}`, this.constructor.name);
            return;
        }
        logger.debug(`Arbitrage opportunity: ${JSON.stringify(arbitrageInfo)}`, this.constructor.name);

        let req: TransactionRequest;
        try {
            req = await this.getTransactionRequest(
                this.wallet.address,
                this.address,
                arbitrageInfo,
                opportunity.tokenAIn,
            );
        } catch (error) {
            logger.error(`Error constructing transaction request: ${error}`, this.constructor.name);
            // Print stack trace
            if (error instanceof Error && error.stack) {
                logger.error(error.stack, this.constructor.name);
            }
            return;
        }

        this.txHandler.push(
            req,
            async (err: Error| null, result: TransactionResponse | null) => {
                if (err) {
                    logger.error(`Error processing transaction: ${err}`, this.constructor.name);
                    return;
                }

                try {
                    const receipt: TransactionReceipt = await result!.wait();
                    logger.info(`Transaction confirmed in block ${receipt.blockNumber}`, this.constructor.name);
                    logger.info(`Receipt: ${JSON.stringify(receipt.transactionHash)}`, this.constructor.name);
                } catch (error) {
                    // Transaction failed after being mined
                    if (error instanceof Error && error.stack && error.message) {
                        logger.error(error.stack, this.constructor.name);
                    }
                    logger.error(
                        `Transaction failed after being mined: ${JSON.stringify(error)}`,
                        this.constructor.name,
                    );
                }
            } /* This cb handle errors while sending the tx, waits for confirmation and logs the receipt */,
        );
    }

    protected async createContract(): Promise<void> {
        this.contract = new Contract(this.address, this.abi, await this.alchemy.config.getWebSocketProvider());
    }

    /**
     * Custom initialization logic.
     */
    protected async customInit(): Promise<void> {
        // No additional initialization required
        return;
    }

    protected async listenForEvents(contract: Contract): Promise<void> {
        contract.on("FlashloanError", (...args: unknown[]) => {
            logger.info(`Flashloan error: ${JSON.stringify(args)}`, this.constructor.name);
        });
        contract.on("FlashLoanSuccess", (...args: unknown[]) => {
            logger.info(`Flashloan executed: ${JSON.stringify(args)}`, this.constructor.name);
        });
        contract.on("ArbitrageConcluded", (...args: unknown[]) => {
            logger.info(`Arbitrage concluded: ${JSON.stringify(args)}`, this.constructor.name);
        });
    }

    protected getArbitrageInfo(opportunity: Opportunity): object {
        const { swap1, swap2, swap3, estimatedGasCost } = opportunity.arbitrageInfo;

        if (!(swap1?.tokenIn && swap1.tokenOut && swap1.poolFee && swap1.amountOutMinimum)) {
            throw new Error("Missing value for component swap1");
        }

        if (!swap2?.tokenIn || !swap2.tokenOut || !swap2.poolFee || !swap2.amountOutMinimum) {
            throw new Error("Missing value for component swap2");
        }

        if (!swap3?.tokenIn || !swap3.tokenOut || !swap3.poolFee || !swap3.amountOutMinimum) {
            throw new Error("Missing value for component swap3");
        }

        if (!estimatedGasCost) {
            throw new Error("Missing value for estimatedGasCost");
        }

        return {
            swap1: {
                tokenIn: swap1.tokenIn.id, // Actual token address
                tokenOut: swap1.tokenOut.id, // Actual token address
                poolFee: swap1.poolFee.toNumber(), // e.g., 3000 represents a 0.3%
                amountOutMinimum: BigNumber.from(0), // uint256
            },
            swap2: {
                tokenIn: swap2.tokenIn.id,
                tokenOut: swap2.tokenOut.id,
                poolFee: swap2.poolFee.toNumber(),
                amountOutMinimum: BigNumber.from(0),
            },
            swap3: {
                tokenIn: swap3.tokenIn.id,
                tokenOut: swap3.tokenOut.id,
                poolFee: swap3.poolFee.toNumber(),
                amountOutMinimum: BigNumber.from(0),
            },
            extraCost: BigNumber.from(0), // uint256
        };
    }

    private async getTransactionRequest(
        from: string,
        to: string,
        arbitrageInfo: object,
        inputAmount: BigNumber,
    ): Promise<TransactionRequest> {
        if (!this.contract) {
            throw new Error("Contract not initialized");
        }

        return {
            from: from,
            to: to,
            data: this.contract.interface.encodeFunctionData(INITIATE_FLASHLOAN_SIG, [arbitrageInfo, inputAmount]),
            value: BigNumber.from(0),
            chainId: this.network,
            gasLimit: 1500000, // default gas limit
            gasPrice: await this.alchemy.core.getGasPrice(),
        };
    }
}

export { AflabContract };
