import { ReconnectingWebSocketProvider } from "../ws";
import { BaseContract } from "./baseContract";

/**
 * Represents a pool contract instance.
 */
class PoolContract extends BaseContract {
  constructor(
    address: string,
    provider: ReconnectingWebSocketProvider,
    abi: any
  ) {
    super(address, provider, abi);
  }
}

export { PoolContract };