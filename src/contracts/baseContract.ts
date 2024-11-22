import { Contract } from "ethers";
import { WebSocketManager } from '../ws.js';

abstract class BaseContract {
  protected _contract: Contract | null = null;
  private readonly _address: string;
  private readonly _wsManager: WebSocketManager;
  private readonly _abi: any;

  /**
   * @param address The contract address
   * @param wsManager The WebSocket Manager
   * @param abi The contract ABI
   */
  constructor(address: string, wsManager: WebSocketManager, abi: any) {
    this._address = address;
    this._wsManager = wsManager;
    this._abi = abi;

    // Reinitialize when reconnected
    this._wsManager.on("reconnected", this.initialize.bind(this));
  }

  /**
   * Initializes the contract.
   * Must be called before interacting with the contract.
   */
  public initialize() {
    this.createContract();
    this.listenForEvents(this._contract as Contract);
  }

  private createContract() {
    try {
      this._contract = new Contract(
        this._address,
        this._abi,
        this._wsManager.getProvider()
      );
    } catch (error) {
      console.error(`Error creating contract: ${error}`);
    }
  }

  /**
   * Implement this method to listen for contract events.
   * 
   * @param contract The contract instance
   */
  abstract listenForEvents(contract: Contract): void;
}

export { BaseContract };
