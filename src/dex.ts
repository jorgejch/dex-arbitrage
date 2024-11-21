import { PoolFactoryContract } from "./contracts/poolFactoryContract";
import { PoolContract } from "./contracts/poolContract";
import { ReconnectingWebSocketProvider } from "./ws";

/**
 * Represents a DEX.
 */
class Dex {
  private poolContracts: { [key: string]: any };
  private readonly poolFactoryContract: PoolFactoryContract;

  /**
   * @param poolFactoryContract The pool factory contract instance
   */
  constructor(poolFactoryContract: PoolFactoryContract) {
    this.poolContracts = {};
    this.poolFactoryContract = poolFactoryContract;
  }

  private addPoolContract(poolAddress: string, contract: any): void {
    this.poolContracts[poolAddress] = contract;
  }

  /**
   * Get a list of pool contract addresses.
   * 
   * @returns A list of pool contract addresses
   */
  public getPoolContractsAddresses(): string[] {
    return Object.keys(this.poolContracts);
  }

  /**
   * Fetches the DEX's pool contracts from the PoolFactory contract
   * and populates the poolContracts map.
   * 
   * @param tokens A list of token pairs (order matters)
   * @param provider The WebSocket provider
   * @param abi The contract ABI
   */
  public async fetchPoolContracts(
    tokens: [token0: string, token1: string][],
    provider: ReconnectingWebSocketProvider,
    abi: any
  ): Promise<void> {
    const poolAddresses: string[] =
      await this.poolFactoryContract.getPoolsAddresses(tokens);
    for (const poolAddress of poolAddresses) {
      const poolContract = new PoolContract(poolAddress, provider, abi);
      this.addPoolContract(poolAddress, poolContract);
    }
  }
}

export { Dex };
