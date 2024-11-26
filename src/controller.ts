import { WebSocketManager } from "./ws.js";
import { Dex } from "./dex.js";
import { PSv3Subgraph } from "./subgraphs/psv3Subgraph.js";

import { ethers } from "ethers";
import dotenv from "dotenv";
import { logger } from "./common.js";
dotenv.config();

/**
 * Controller class that scans for arbitrage opportunities and triggers smart contract execution.
 */
class Controller {
  private readonly httpProvider: ethers.JsonRpcProvider;
  private readonly wallet: ethers.Wallet;
  private readonly aflabContractAddress: string;
  private readonly dex: Dex;
  private readonly wsManager: WebSocketManager;

  constructor(
    httpProviderUrl: string,
    wsProviderUrl: string,
    walletPrivateKey: string,
    aflabContractAddress: string,
    theGraphBaseUrl: string,
    pancakeswapV3SubgraphName: string,
    simulateDisconnect: boolean = false
  ) {
    try {
      this.httpProvider = new ethers.JsonRpcProvider(httpProviderUrl);
      this.wsManager = new WebSocketManager(wsProviderUrl, simulateDisconnect);
      this.wallet = new ethers.Wallet(walletPrivateKey, this.httpProvider);
      this.aflabContractAddress = aflabContractAddress;
      this.dex = new Dex(
        new PSv3Subgraph(theGraphBaseUrl, pancakeswapV3SubgraphName),
        this.wsManager
      );
    } catch (error) {
      logger.error(
        `Error initializing Controller: ${error}`,
        this.constructor.name
      );
      throw error;
    }
  }

  private async scanForArbitrageOpportunities(tradeData: any) {
    logger.info(
      `Received trade data: ${JSON.stringify(tradeData)}`,
      this.constructor.name
    );
    const { tokenA, tokenB } = this.pickTokens(tradeData);
    const tokenC = await this.pickTokenC(tokenB);

    if (tokenC) {
      const profit = await this.calculateExpectedProfit(tokenA, tokenB, tokenC);
      if (profit > 0) {
        this.logOpportunities(tokenA, tokenB, tokenC, profit);
        await this.triggerSmartContract(tokenA, tokenB, tokenC, profit);
      }
    }
  }

  private async triggerSmartContract(
    tokenA: string,
    tokenB: string,
    tokenC: string,
    profit: number
  ) {
    // Logic to trigger smart contract execution
  }

  private pickTokens(tradeData: any): { tokenA: string; tokenB: string } {
    // Logic to pick tokens A and B based on trade data
    return { tokenA: "", tokenB: "" };
  }

  private async pickTokenC(tokenB: string): Promise<string | null> {
    // Logic to pick token C based on liquidity and price data
    return null;
  }

  private async calculateExpectedProfit(
    tokenA: string,
    tokenB: string,
    tokenC: string
  ): Promise<number> {
    // Logic to calculate expected profit from arbitrage opportunity
    return 0;
  }

  private logOpportunities(
    tokenA: string,
    tokenB: string,
    tokenC: string,
    profit: number
  ) {
    // Logic to log identified arbitrage opportunities
  }

  public getDex(): Dex {
    return this.dex;
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

    await this.dex.initialize().catch((error) => {
      logger.error(
        `Error initializing the Dex: ${error}`,
        this.constructor.name
      );
      throw error;
    });
  }

  public stop() {
    this.wsManager.stop();
  }
}
export { Controller };
