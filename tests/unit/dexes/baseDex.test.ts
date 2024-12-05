import { BaseDex } from "../../../src/dexes/baseDex.js";
import { DexPoolSubgraph } from "../../../src/subgraphs/dexPoolSubgraph.js";
import { Pool, Token, Opportunity } from "../../../src/types.js";
import { AflabContract } from "../../../src/contracts/aflabContract.js";
import { PoolContract } from "../../../src/contracts/poolContract.js";
import { LendingPoolAPContract } from "../../../src/contracts/lendingPoolAPContract.js";

import { Alchemy, Wallet, BigNumber } from "alchemy-sdk";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Decimal } from "decimal.js";

// TestDex class to expose protected methods for testing
class TestDex extends BaseDex {
  public async initialize(): Promise<void> {
    this.initialized = true;
  }

  public async processSwap(): Promise<void> {
    // Implementation not needed for tests
  }

  // Expose protected properties and methods for testing
  public getInputTokenSymbolIndex(): Map<string, Pool[]> {
    return this.inputTokenSymbolIndex;
  }

  public getContractsMap(): Map<string, PoolContract> {
    return this.contractsMap;
  }

  public findIntermediaryTokensPublic(tokenA: string, tokenC: string): Token[] {
    return this.findIntermediaryTokens(tokenA, tokenC);
  }

  public getPoolContractsForTokensPublic(
    tokenX: Token,
    tokenZ: Token
  ): PoolContract[] {
    return this.getPoolContractsForTokens(tokenX, tokenZ);
  }

  public calculateNetOutputPublic(
    inputAmount: BigNumber,
    fromToken: Token,
    toToken: Token,
    poolContract: PoolContract
  ) {
    return this.calculateNetOutput(
      inputAmount,
      fromToken,
      toToken,
      poolContract
    );
  }

  public calculateExpectedProfitPublic(
    tokenA: Token,
    tokenB: Token,
    tokenC: Token,
    inputAmount: BigNumber,
    swap1PoolContract: PoolContract,
    swap2PoolContract: PoolContract,
    swap3PoolContract: PoolContract
  ) {
    return this.calculateExpectedProfit(
      tokenA,
      tokenB,
      tokenC,
      inputAmount,
      swap1PoolContract,
      swap2PoolContract,
      swap3PoolContract,
      new Decimal(0)
    );
  }

  public async pickTokenBPublic(
    tokenA: Token,
    tokenC: Token,
    possibleBs: Token[],
    inputAmount: BigNumber,
    swapPoolContract: PoolContract
  ) {
    return await this.pickTokenB(
      tokenA,
      tokenC,
      possibleBs,
      inputAmount,
      swapPoolContract
    );
  }

  public logOpportunityPublic(opportunity: Opportunity): void {
    this.logOpportunity(opportunity);
  }

  public async triggerSmartContractPublic(opportunity: Opportunity) {
    await this.triggerSmartContract(opportunity);
  }

  public getInitialized(): boolean {
    return this.initialized;
  }
}

describe("BaseDex", () => {
  let dex: TestDex;
  let subgraph: DexPoolSubgraph;
  let mockSigner: Wallet;
  let mockAflabContract: AflabContract;
  let mockLendingPoolAPContract: LendingPoolAPContract;
  let alchemy: Alchemy;

  beforeEach(async () => {
    alchemy = vi.fn() as unknown as Alchemy;
    // Setup mocks and create TestDex instance
    subgraph = new DexPoolSubgraph("http://localhost:8000");
    mockAflabContract = {
      executeOpportunity: vi.fn().mockResolvedValue(undefined),
    } as unknown as AflabContract;
    mockLendingPoolAPContract = {} as unknown as LendingPoolAPContract;
    dex = new TestDex(
      alchemy,
      mockSigner,
      subgraph,
      mockAflabContract,
      mockLendingPoolAPContract,
      137
    );
    await dex.initialize();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should initialize the DEX", () => {
    expect(dex.getInitialized()).toBe(true);
  });

  it("should throw an error if the contract is not found", () => {
    expect(() => dex.getContract("0xNonExistent")).toThrow(
      "Contract not found: 0xNonExistent"
    );
  });
});
