import { logger } from "../common.js";
import { ContractType } from "../types.js";
import { WebSocketManager } from "../ws.js";
import { Contract } from "ethers";

/**
 * BaseContract is a class that provides methods to interact with a smart contract.
 * It includes methods to initialize the contract and listen for events.
 */
abstract class BaseContract {
  protected wsManager: WebSocketManager;
  protected address: string;
  protected contract?: Contract; // This is an instance of the ethers.js Contract class
  protected contractType: ContractType;
  private abi: any;
  private numReinitializations = 0;

  /**
   * @param address The contract address
   * @param wsManager The WebSocket Manager
   * @param abi The contract ABI
   * @param contractType One of the ContractType enum values
   */
  constructor(
    address: string,
    wsManager: WebSocketManager,
    abi: any,
    contractType: ContractType
  ) {
    this.address = address;
    this.wsManager = wsManager;
    this.abi = abi;
    this.contractType = contractType;

    // Reinitialize when reconnected
    this.wsManager.on("reconnected", this.refresh.bind(this));
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

  /**
   * Listen for events emitted by the contract.
   * Must be implemented by the subclass.
   *
   * @param contract The ethers.js contract instance
   */
  protected abstract listenForEvents(contract: Contract): void;

  /**
   * Custom initialization logic.
   * Must be implemented by the subclass.
   * This method is called after the contract instance is created.
   */
  protected abstract customInit(): void;

  /**
   * Initialize the contract.
   * Should be called before interacting with the contract.
   * Should be called only once.
   */
  public initialize(): void {
    this.refresh();
  }

  /**
   * Refresh the contract.
   * Must be called before interacting with the contract.
   * Has to be kinda idenpotent.
   */
  public refresh(...args: any[]): void {
    logger.debug(
      `Contract ${this.address} initialization # ${this.numReinitializations}`,
      this.constructor.name
    );
    this.createContract();
    this.listenForEvents(this.contract as Contract);
    logger.info(
      args
        ? `Initialized contract ${this.address}`
        : `Reinitialized contract ${this.address} after reconnection number ${this.numReinitializations}. Args: ${args}`,
      this.constructor.name
    );
    this.numReinitializations++;
  }

  /**
   * Get the contract's type.
   */
  public getContractType(): ContractType {
    return this.contractType;
  }
}

export { BaseContract };
