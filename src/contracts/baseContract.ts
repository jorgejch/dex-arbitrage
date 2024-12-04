import { logger } from "../common.js";
import { ContractType } from "../types.js";
import { Contract, Alchemy } from "alchemy-sdk";

/**
 * Abstract base class for managing smart contract interactions.
 * This class handles WebSocket reconnections and contract reinitializations.
 */
abstract class BaseContract {
  protected alchemy: Alchemy;
  protected address: string;
  protected contract?: Contract; // ethers.js Contract
  protected contractType: ContractType;
  protected abi: any;
  protected network: number;
  private initialized = false;

  /**
   * @param address The contract addres>
   * @param alchemy The WebSocket Manager
   * @param abi The contract ABI
   * @param contractType One of the ContractType enum values
   */
  constructor(
    address: string,
    abi: any,
    contractType: ContractType,
    alchemy: Alchemy,
    network: number
  ) {
    this.address = address;
    this.abi = abi;
    this.contractType = contractType;
    this.alchemy = alchemy;
    this.network = network;
  }

  /**
   * Create or update the contract instance.
   * This is necessary to handle reconnections.
   */
  protected abstract createContract(): Promise<void>;

  /**
   * Listen for events emitted by the contract.
   * Must be implemented by the subclass.
   *
   * @param contract The contract instance
   */
  protected abstract listenForEvents(contract: Contract): Promise<void>;

  /**
   * Initialize the contract.
   */
  public async initialize(): Promise<void> {
    await this.createContract();

    if (!this.contract) {
      throw new Error("Contract is not defined");
    }

    await this.listenForEvents(this.contract);
    this.initialized = true;
    logger.info(`Initialized contract ${this.address}`, this.constructor.name);
  }

  /**
   * Get the contract's type.
   */
  public getContractType(): ContractType {
    return this.contractType;
  }

  /**
   * Check if the contract is initialized.
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}

export { BaseContract };
