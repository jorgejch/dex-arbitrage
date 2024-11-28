import { WebSocketManager } from "./ws.js";
import { BaseDex } from "./dexes/baseDex.js";
import { PSv3Dex } from "./dexes/psv3Dex.js";
import { DexPoolSubgraph } from "./subgraphs/dexPoolSubgraph.js";
import { getTGPancakeSwapUrl, logger } from "./common.js";

import { ethers } from "ethers";

/**
 * Controller class that scans for arbitrage opportunities and triggers smart contract execution.
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
    logger.info(
      `Initializing Controller with arguments:
      \tAFLAB contract Address: ${aflabContractAddress}
      \tThe Graph Base URL: ${theGraphBaseUrl}
      \tPS v3 Subgraph name: ${pancakeswapV3SubgraphName}
      \tSimulate disconnect: ${simulateDisconnect}`,
      this.constructor.name
    );

    try {
      this.httpProvider = new ethers.JsonRpcProvider(httpProviderUrl);
      this.wsManager = new WebSocketManager(wsProviderUrl, simulateDisconnect);
      this.wallet = new ethers.Wallet(walletPrivateKey, this.httpProvider);
      this.aflabContractAddress = aflabContractAddress;
      this.dexes = [
        new PSv3Dex(
          this.wsManager,
          new DexPoolSubgraph(
            getTGPancakeSwapUrl(
              theGraphBaseUrl,
              pancakeswapV3SubgraphName,
              theGraphApiKey
            )
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
  }

  public getDexes(): BaseDex[] {
    return this.dexes;
  }

  public getWSManager(): WebSocketManager {
    return this.wsManager;
  }

  /**
   * Initializes the Controller.
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
  public stop() {
    this.wsManager.stop();
  }
}
export { Controller };
