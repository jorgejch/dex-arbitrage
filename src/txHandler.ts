import { Alchemy, TransactionRequest, TransactionResponse } from "alchemy-sdk";
import Queue from "better-queue";

/**
 * TxHandler is responsible for handling and processing transaction requests.
 * It manages a queue of transactions and processes them sequentially.
 */
class TxHandler {
    private readonly queue: Queue<TransactionRequest>;
    private readonly alchemy: Alchemy;

    /**
     * Handles and processes transaction requests sequentially.
     */
    constructor(
        alchemy: Alchemy,
        processTx: (
            tx: TransactionRequest,
            cb: (error: Error | null, result: TransactionResponse | null) => void,
        ) => Promise<void>,
    ) {
        this.queue = new Queue<TransactionRequest>(processTx, { concurrent: 1, filo: false, batchSize: 1 });
        this.alchemy = alchemy;
    }

    public push(tx: TransactionRequest, cb: (err: Error | null, result: TransactionResponse | null) => void): void {
        this.queue.push(tx, cb);
    }
}

export { TxHandler };
