import { describe, it, expect, beforeEach, vi } from "vitest";
import { Contract, Alchemy, Network } from "alchemy-sdk";
import { BaseContract } from "../../../src/contracts/baseContract.js";
import { ContractType } from "../../../src/types.js";

// Mock subclass to implement abstract methods
class MockContract extends BaseContract {
  protected async createContract(): Promise<void> {
    this.contract = {} as Contract;
  }

  protected async listenForEvents(contract: Contract): Promise<void> {
    // Mock implementation
  }

  protected async customInit(): Promise<void> {
    // Mock implementation
  }

  public getContract(): Contract {
    return this.contract!;
  }
}

describe("BaseContract", () => {
  let mockContract: MockContract;
  const address = "0x0000000000000000000000000000000000000000";
  const abi: object[] = [];
  const contractType = ContractType.TEST;
  const alchemy = new Alchemy({ apiKey: "test", network: Network.MATIC_MAINNET });
  const network = 137;

  beforeEach(() => {
    mockContract = new MockContract(address, abi, contractType, alchemy, network);
  });

  it("should initialize correctly", async () => {
    expect(mockContract.isInitialized()).toBe(false);
    await mockContract.initialize();
    expect(mockContract.isInitialized()).toBe(true);
  });

  it("should return the correct contract type", () => {
    expect(mockContract.getContractType()).toBe(contractType);
  });

  it("should throw an error if contract is undefined after creation", async () => {
    class FaultyContract extends BaseContract {
      protected async createContract(): Promise<void> {
        // Do not set this.contract
      }
      protected async listenForEvents(contract: Contract): Promise<void> {
        // Mock implementation
      }
      protected async customInit(): Promise<void> {
        // Mock implementation
      }

    }
    const faultyContract = new FaultyContract(address, abi, contractType, alchemy, network);
    await expect(faultyContract.initialize()).rejects.toThrow("Contract is not defined");
  });

  it("should call customInit during initialization", async () => {
    const customInitSpy = vi.spyOn(MockContract.prototype as any, "customInit");
    await mockContract.initialize();
    expect(customInitSpy).toHaveBeenCalled();
  });

  it("should call listenForEvents during initialization", async () => {
    const listenForEventsSpy = vi.spyOn(MockContract.prototype as any, "listenForEvents");
    await mockContract.initialize();
    expect(listenForEventsSpy).toHaveBeenCalledWith(mockContract.getContract());
  });
});