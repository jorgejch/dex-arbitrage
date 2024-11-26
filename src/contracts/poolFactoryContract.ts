import { Contract } from "ethers";
import { WebSocketManager } from "../ws.js";
import { BaseContract } from "./baseContract.js";

/**
 * Factory class that represents a contract instance
 * with methods to interact with it.
 */
class PoolFactoryContract extends BaseContract {
  /**
   * @param address The pool factory contract address
   * @param wsManager The WebSocket Manager
   * @param abi The contract ABI
   */
  constructor(address: string, wsManager: WebSocketManager, abi: any) {
    super(address, wsManager, abi);
  }

  // TODO: Implement this method
  listenForEvents(contract: Contract): void {
    contract.on("PoolCreated", (token0, token1, pool) => {
      console.log(
        `PoolCreated event: token0=${token0}, token1=${token1}, pool=${pool}`
      );
    });
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
      throw new Error("Contract is not initialized");
    }

    return await this._contract?.getPool(token0, token1);
  }
}

export { PoolFactoryContract };
