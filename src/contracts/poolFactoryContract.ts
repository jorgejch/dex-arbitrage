import { ReconnectingWebSocketProvider } from "../ws";
import { BaseContract } from "./baseContract";

/**
 * Factory class that represents a contract instance
 * with methods to interact with it.
 */
class PoolFactoryContract extends BaseContract {
  /**
   * @param address The pool factory contract address
   * @param provider The WebSocket provider
   * @param abi The contract ABI
   */
  constructor(
    address: string,
    provider: ReconnectingWebSocketProvider,
    abi: any
  ) {
    super(address, provider, abi);
  }

  /**
   * Fetches the pool address from the contract.
   * 
   * @param token0 The first token address
   * @param token1 The second token address
   * @returns The pool address
   */
  public async getPoolAddress(
    token0: string,
    token1: string
  ): Promise<string | null> {
    if (!this._contract) {
      this.createContract();
    }

    return await this._contract?.getPool(token0, token1);
  }

  /**
   * Get a list of pools from the contract for a list of token pairs.
   * 
   * @param pairs A list of token pair addresses
   * @returns A list of pool addresses
   */
  public async getPoolsAddresses(pairs: [token0: string, token1: string][]): Promise<string[]> {
    const poolAddresses: string[] = [];
    for (const [token0, token1] of pairs) {
      const poolAddress = await this.getPoolAddress(token0, token1);
      if (poolAddress) {
        poolAddresses.push(poolAddress);
      }
    }

    return poolAddresses;
  }
}

export { PoolFactoryContract };
