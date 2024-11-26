import { ContractType } from "../types.js";
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
  private contractType: ContractType;

  /**
   * @param address The contract address
   * @param wsManager The WebSocket Manager
   * @param abi The contract ABI
   * @param contractType One of the ContractType enum values
   */
  constructor(address: string, wsManager: WebSocketManager, abi: any, contractType: ContractType) {
    this.address = address;
    this.wsManager = wsManager;
    this.abi = abi;
    this.contractType = contractType;

    // Reinitialize when reconnected
    this.wsManager.on("reconnected", this.initialize.bind(this));
  }

  /**
   * Create or update the contract instance.
   * This is necessary to handle reconnections.
   */
  private createContract() {
    try {
      this.contract = new Contract(
        this.address,
        this.abi[0],
        this.wsManager.getProvider()
      );
    } catch (error) {
      console.error(`Error creating contract: ${error}`);
    }
  }

  /**
   * Listen for events emitted by the contract.
   * Must be implemented by the subclass.
   * 
   * @param contract The ethers.js contract instance
   */
  protected abstract listenForEvents(contract: Contract): void;
  /**
   * Initializes the contract.
   * Must be called before interacting with the contract.
   */
  public initialize() {
    this.wsManager.start();
    this.createContract();
    this.listenForEvents(this.contract as Contract);
  }

  /**
   * Get the contract's type.
   */
  public getContractType(): ContractType {
    return this.contractType;
  }
}

export { BaseContract };
