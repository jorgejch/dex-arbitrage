import { ContractType } from "../../../src/types.js";
import { BaseContract } from "../../../src/contracts/baseContract.js";
import { WebSocketManager } from "../../../src/ws.js";
import { config } from "../../../src/common.js";
import { Contract } from "ethers";
import { expect, describe, beforeEach, test, vi } from "vitest";
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

  public getWsManager() {
    return this.wsManager;
  }
}

describe("Base Contract Integration Tests", () => {
  let testContract: TestContract;

  beforeEach(() => {
    const url = process.env.FAST_RPC_WSS_ENDPOINT ?? "";

    const wsManager = new WebSocketManager(
      url,
      false
    );

    testContract = new TestContract(
      "0x1234",
      wsManager,
      config.POOL_ABI,
      ContractType.TEST
    );
    if (!testContract.getWsManager().isInitialized()) {
      testContract.initialize();
    }
  });

  test("should initialize the contract", () => {
    expect(testContract).toBeDefined();
    expect(testContract.getContractType()).toBe(ContractType.TEST);
    expect(testContract.getWsManager().isInitialized()).toBe(true);
  });

  test.skip("should handle WebSocket reconnected event", () => {
    // Simulate the WebSocket reconnected event to test if the contract reinitializes correctly
    if (testContract.getWsManager().isInitialized()) {
      if (!testContract.getWsManager().emitEvent("reconnected")){
        throw new Error("Failed to emit reconnected event");
      }
    }
  });
});
