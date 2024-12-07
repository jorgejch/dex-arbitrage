import { describe, beforeEach, vi } from "vitest";
import { AflabContract } from "../../../src/contracts/aflabContract.js";
import { Alchemy, Wallet } from "alchemy-sdk";

describe.skip("AflabContract Unit Tests", () => {
  let aflabContract: AflabContract;
  let address: string;
  let abi: any[];
  let wallet: Wallet;
  let alchemy: Alchemy;

  beforeEach(() => {
    address = "0xContractAddress";
    abi = []; // Replace with actual ABI

    wallet = new Wallet("0xPrivateKey");

    alchemy = vi.mocked({
      // Mock necessary Alchemy methods
    }) as unknown as Alchemy;

    aflabContract = new AflabContract(address, abi, alchemy, wallet, 137);
    
    console.log("aflabContract", aflabContract);
  });

  // ... rest of the tests
});
