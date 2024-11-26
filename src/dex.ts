import { PSv3Subgraph } from "./subgraphs/psv3Subgraph.js";
import { Pool } from "./types.js";

/**
 * Represents a DEX.
 */
class Dex {
  private pools: Map<string, Pool>;
  private inputTokenSymbolIndex: Map<string, Pool[]>;
  private readonly subgraph: PSv3Subgraph;
  private contracts: Map<string, any>;

  /**
   * @param subgraph The Graph Subgraph instance
   */
  constructor(subgraph: PSv3Subgraph) {
    this.pools = new Map<string, Pool>();
    this.inputTokenSymbolIndex = new Map<string, Pool[]>();
    this.subgraph = subgraph;
  }

  /**
   * Initialize the DEX.
   */
  public async initialize(): Promise<void> {
    this.subgraph.initialize();

    const pools = await this.subgraph.getPools();

    for (const pool of pools) {
      this.pools.set(pool.id, pool);

      for (const token of pool.inputTokens) {
        if (!this.inputTokenSymbolIndex.has(token.symbol)) {
          this.inputTokenSymbolIndex.set(token.symbol, []);
        }
        this.inputTokenSymbolIndex.get(token.symbol)!.push(pool);
      }
    }
  }

  /**
   * Get a list of pool contract addresses.
   */
  public getPoolAddresses(): string[] {
    return Array.from(this.pools.keys());
  }

  /**
   * Get pools by input token symbol.
   * @param symbol The input token symbol
   * @returns A list of pools that have the input token symbol
   */
  public getPoolsByInputTokenSymbol(symbol: string): Pool[] {
    return this.inputTokenSymbolIndex.get(symbol) || [];
  }
}

export { Dex };
