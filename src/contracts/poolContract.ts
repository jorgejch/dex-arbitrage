import { Contract } from "ethers";
import { WebSocketManager } from "../ws.js";
import { BaseContract } from "./baseContract.js";

/**
 * Represents a pool contract.
 */
class PoolContract extends BaseContract {
  /**
   * @param address The pool contract address
   * @param wsManager WebSocket Manager
   * @param abi The contract ABI
   */
  constructor(
    address: string,
    wsManager: WebSocketManager,
    abi: any
  ) {
    super(address, wsManager, abi);
  }

  // TODO: Implement this method
  listenForEvents(contract: Contract): void {
    contract.on("Swap", (sender, amount0In, amount1In, amount0Out, amount1Out) => {
      console.log(`Swap event: sender=${sender}, amount0In=${amount0In}, amount1In=${amount1In}, amount0Out=${amount0Out}, amount1Out=${amount1Out}`);
    });
  }
}

export { PoolContract };