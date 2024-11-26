import { ContractType } from "../../../src/types.js";
import { BaseContract } from "../../../src/contracts/baseContract.js";
import { WebSocketManager } from "../../../src/ws.js";
import { config } from "../../../src/common.js";
import { Contract } from "ethers";
import { expect, describe, beforeEach, test } from "vitest";
import dotenv from "dotenv";

dotenv.config();

class TestContract extends BaseContract {
  constructor(
    address: string,
    wsManager: WebSocketManager,
    abi: any,
    contractType: ContractType
  ) {
    super(address, wsManager, abi, contractType);
  }

  listenForEvents(contract: Contract): void {
    if (!contract) {
      throw new Error("Contract is not defined");
    }
    contract.on("Swap", (event: any) => {
      console.log("Event received:", event);
    });
  }
}

describe("Base Contract Integration Tests", () => {
  let testContract: TestContract;

  beforeEach(() => {
    const url = process.env.FAST_RPC_WSS_ENDPOINT ?? "";

    const wsManager = new WebSocketManager(
      url,
      false,
      (wsManager: WebSocketManager) => {}
    );

    testContract = new TestContract(
      "0x1234",
      wsManager,
      [config.POOL_ABI],
      ContractType.POOL
    );
  });

  test("should initialize the contract", () => {
    testContract.initialize();
    expect(testContract).toBeDefined();
  });
});
