import { beforeEach, describe, expect, it } from "vitest";
import { Alchemy, TransactionRequest, TransactionResponse } from "alchemy-sdk";
import { TxHandler } from "../../src/txHandler.js";

describe("TxHandler", () => {
    let alchemy: Alchemy;

    beforeEach(() => {
        alchemy = {} as unknown as Alchemy;
    });

    it("should process a transaction request successfully", () => {
        const processTx = async (
            tx: TransactionRequest,
            cb: (error: Error | null, result: TransactionResponse | null) => void,
        ) => {
            cb(null, null);
        };
        const txHandler = new TxHandler(alchemy, processTx);
        const tx: TransactionRequest = { to: "0x123", value: "1000" };
        const cb: (error: Error | null, result: TransactionResponse | null) => void = (
            err: Error | null,
            result: TransactionResponse | null,
        ) => {
            expect(err).toBeNull();
            expect(result).toBeNull();
        };
        txHandler.push(tx, cb);
    });

    it("should handle processTx error correctly", () => {
        const processTx = async (
            tx: TransactionRequest,
            cb: (error: Error | null, result: TransactionResponse | null) => void,
        ) => {
            cb(new Error("test"), null);
        };
        const txHandler = new TxHandler(alchemy, processTx);
        const tx: TransactionRequest = { to: "0x123", value: "1000" };
        const cb: (error: Error | null, result: TransactionResponse | null) => void = (
            err: Error | null,
            result: TransactionResponse | null,
        ) => {
            expect(err).toBeInstanceOf(Error);
            expect(err!.message).toBe("test");
        };

        txHandler.push(tx, cb);
    });

    it("should process multiple transaction requests", () => {
        const processTx = async (
            tx: TransactionRequest,
            cb: (error: Error | null, result: TransactionResponse | null) => void,
        ) => {
            cb(null, null);
        };
        const txHandler = new TxHandler(alchemy, processTx);
        const tx1: TransactionRequest = { to: "0x123", value: "1000" };
        const tx2: TransactionRequest = { to: "0x456", value: "2000" };

        const cb = (err: Error | null, result: TransactionResponse | null) => {
            expect(err).toBeNull();
            expect(result).toBeNull();
        };

        txHandler.push(tx1, cb);
        txHandler.push(tx2, cb);
    });
});
