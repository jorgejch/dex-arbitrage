import { Contract } from "ethers";
import { ReconnectingWebSocketProvider } from "../ws";

abstract class BaseContract {
  protected _contract: Contract | null = null;
  private readonly _address: string;
  private readonly _provider: ReconnectingWebSocketProvider;
  private readonly _abi: any;

  constructor(
    address: string,
    provider: ReconnectingWebSocketProvider,
    abi: any
  ) {
    this._address = address;
    this._provider = provider;
    this._abi = abi;
  }

  /**
   * Creates a new contract instance.
   * Must be called before interacting with the contract.
   */
  public createContract() {
    this._contract = new Contract(this._address, this._abi, this._provider);
  }
}

export { BaseContract };