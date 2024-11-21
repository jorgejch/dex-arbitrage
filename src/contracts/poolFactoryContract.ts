import { ReconnectingWebSocketProvider } from "../ws";
import { BaseContract } from "./baseContract";

/**
 * Factory class that represents a contract instance
 * with methods to interact with it.
 */
class PoolFactory extends BaseContract {
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
   * Fetches the list of pools from the contract.
   * @returns A list of pool addresses
   */
  public getPools() {
    if (!this._contract) {
      this.createContract()
    }

    return this._contract?.getPools();
  }
}

export { PoolFactory };