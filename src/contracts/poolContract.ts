import { ContractType } from "../types.js";
import { Contract } from "ethers";
import { WebSocketManager } from "../ws.js";
import { BaseContract } from "./baseContract.js";
import { logger } from "../common.js";
import { lookup } from "dns";

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
    super(address, wsManager, abi, ContractType.POOL);
  }

  listenForEvents(contract: Contract): void {
    contract.on("Swap", (sender, amount0In, amount1In, amount0Out, amount1Out) => {
      logger.debug(`Swap event: sender=${sender}, amount0In=${amount0In}, amount1In=${amount1In}, amount0Out=${amount0Out}, amount1Out=${amount1Out}`, this.constructor.name);
    });
    logger.info(`Listening for Swap events on contract ${this.address}`, this.constructor.name);
  }
}

export { PoolContract };