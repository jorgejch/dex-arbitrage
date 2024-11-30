import { WebSocketManager } from "./ws.js";
import { BaseDex } from "./dexes/baseDex.js";
import { PSv3Dex } from "./dexes/psv3Dex.js";
import { DexPoolSubgraph } from "./subgraphs/dexPoolSubgraph.js";
import { getTGPancakeSwapUrl, logger, config } from "./common.js";
import { AflabContract } from "./contracts/aflabContract.js";

import { ethers } from "ethers";

/**
 * The `Controller` class orchestrates the initialization and management of decentralized exchanges (DEXes),
 * WebSocket connections, and interactions with smart contracts. It handles the setup of providers, wallets,
 * DEX instances, and manages their lifecycle.
 *
 * @class Controller
 *
 * @param httpProviderUrl - The URL of the HTTP provider for Ethereum JSON-RPC.
 * @param wsProviderUrl - The URL of the WebSocket provider.
 * @param walletPrivateKey - The private key of the wallet used for signing transactions.
 * @param aflabContractAddress - The address of the AFLAB smart contract.
 * @param theGraphBaseUrl - The base URL for The Graph API.
 * @param theGraphApiKey - The API key for The Graph.
 * @param pancakeswapV3SubgraphName - The subgraph name for PancakeSwap V3 on The Graph.
 * @param simulateDisconnect - A boolean flag to simulate WebSocket disconnections (default is `false`).
 *
 * @method start - Initializes the Controller and starts the DEXes.
 * @method stop - Stops the WebSocket manager.
 *
 * @returns An instance of the `Controller` class.
 */
class Controller {
  private readonly httpProvider: ethers.JsonRpcProvider;
  private readonly wallet: ethers.Wallet;
  private readonly aflabContractAddress: string;
  private readonly dexes: BaseDex[];
  private readonly wsManager: WebSocketManager;

  constructor(
    httpProviderUrl: string,
    wsProviderUrl: string,
    walletPrivateKey: string,
    aflabContractAddress: string,
    theGraphBaseUrl: string,
    theGraphApiKey: string,
    pancakeswapV3SubgraphName: string,
    simulateDisconnect: boolean = false
  ) {
    try {
      this.httpProvider = new ethers.JsonRpcProvider(httpProviderUrl);
      this.wsManager = new WebSocketManager(wsProviderUrl, simulateDisconnect);
      this.wallet = new ethers.Wallet(walletPrivateKey, this.httpProvider);
      this.aflabContractAddress = aflabContractAddress;
      this.dexes = [
        new PSv3Dex(
          this.wsManager,
          this.wallet,
          new DexPoolSubgraph(
            getTGPancakeSwapUrl(
              theGraphBaseUrl,
              pancakeswapV3SubgraphName,
              theGraphApiKey
            )
          ),
          new AflabContract(
            this.aflabContractAddress,
            config.AFLAB_ABI,
            this.wsManager,
            this.httpProvider,
            this.wallet
          )
        ),
      ];
    } catch (error) {
      logger.error(
        `Error initializing Controller: ${error}`,
        this.constructor.name
      );
      throw error;
    }

    logger.info(
      `Initialized Controller with arguments:
      \tPSv3 AFLAB contract Address: ${aflabContractAddress}
      \tThe Graph Base URL: ${theGraphBaseUrl}
      \tPS v3 Subgraph name: ${pancakeswapV3SubgraphName}
      \tWallet Address: ${this.wallet.address}
      \tSimulate disconnect: ${simulateDisconnect}`,
      this.constructor.name
    );
  }

  /**
   * Starts the Controller.
   */
  public async start() {
    try {
      this.wsManager.refresh();
    } catch (error) {
      logger.error(
        `Error initializing WebSocketManager: ${error}`,
        this.constructor.name
      );
      throw error;
    }

    const dexInitPromises: Promise<void>[] = this.dexes.map(
      async (dex: BaseDex) => {
        dex.initialize();
      }
    );

    try {
      await Promise.all(dexInitPromises);
    } catch (error) {
      logger.error(`Error initializing DEXes: ${error}`, this.constructor.name);
      return;
    }
  }

  /**
   * Stops the Controller.
   */
  public stop() {
    this.wsManager.stop();
  }
}
export { Controller };
