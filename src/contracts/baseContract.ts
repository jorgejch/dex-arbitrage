import { WebSocketManager } from "../ws.js";
import { Contract } from "ethers";

/**
 * BaseContract is a class that provides methods to interact with a smart contract.
 * It includes methods to initialize the contract and listen for events.
 */
abstract class BaseContract {
  private address: string;
  private wsManager: WebSocketManager;
  private abi: any;
  // This is an instance of the ethers.js Contract class
  private contract?: Contract;

  /**
   * @param address The contract address
   * @param wsManager The WebSocket Manager
   * @param abi The contract ABI
   */
  constructor(address: string, wsManager: WebSocketManager, abi: any) {
    this.address = address;
    this.wsManager = wsManager;
    this.abi = abi;

    // Reinitialize when reconnected
    this.wsManager.on("reconnected", this.initialize.bind(this));
  }

  /**
   * Initializes the contract.
   * Must be called before interacting with the contract.
   */
  public initialize() {
    this.createContract();
    this.listenForEvents(this.contract as Contract);
  }

  /**
   * Create or update the contract instance.
   * This is necessary to handle reconnections.
   */
  private createContract() {
    try {
      this.contract = new Contract(
        this.address,
        this.abi,
        this.wsManager.getProvider()
      );
    } catch (error) {
      console.error(`Error creating contract: ${error}`);
    }
  }

  protected abstract listenForEvents(contract: Contract): void;
}

export { BaseContract };
