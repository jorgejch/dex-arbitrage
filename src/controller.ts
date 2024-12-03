import { BaseDex } from "./dexes/baseDex.js";
import { UniswapV3Dex } from "./dexes/uniswapV3Dex.js";
import { DexPoolSubgraph } from "./subgraphs/dexPoolSubgraph.js";
import { getTGUrl, logger, config } from "./common.js";
import { AflabContract } from "./contracts/aflabContract.js";
import { Network, Alchemy, Wallet } from "alchemy-sdk";

class Controller {
  private readonly wallet: Wallet;
  private readonly aflabContractAddress: string;
  private readonly alchemy: Alchemy;
  private readonly theGraphBaseUrl: string;
  private readonly theGraphApiKey: string;
  private readonly uniswapV3SubgraphName: string;
  private dexes?: BaseDex[];

  /**
   * @param walletPrivateKey - The private key of the wallet.
   * @param aflabContractAddress - The address of the Aflab contract.
   * @param theGraphBaseUrl - The base URL for The Graph API.
   * @param theGraphApiKey - The API key for The Graph.
   * @param uniswapV3SubgraphName - The name of the Uniswap V3 subgraph.
   * @param alchemyApiKey - The API key for Alchemy.
   *
   * @throws Will throw an error if initialization fails.
   */
  constructor(
    walletPrivateKey: string,
    aflabContractAddress: string,
    theGraphBaseUrl: string,
    theGraphApiKey: string,
    uniswapV3SubgraphName: string,
    alchemyApiKey: string
  ) {
    try {
      this.theGraphBaseUrl = theGraphBaseUrl;
      this.theGraphApiKey = theGraphApiKey;
      this.uniswapV3SubgraphName = uniswapV3SubgraphName;
      this.alchemy = new Alchemy({
        apiKey: alchemyApiKey,
        network: Network.MATIC_MAINNET,
        maxRetries: 3,
        requestTimeout: 30000,
      });
      this.wallet = new Wallet(walletPrivateKey, this.alchemy);
      this.aflabContractAddress = aflabContractAddress;
    } catch (error) {
      logger.error(
        `Error initializing Controller: ${error}`,
        this.constructor.name
      );
      throw error;
    }
  }

  private async initializeDexes() {
    this.dexes = [
      new UniswapV3Dex(
        this.alchemy,
        this.wallet,
        new DexPoolSubgraph(
          getTGUrl(
            this.theGraphBaseUrl,
            this.uniswapV3SubgraphName,
            this.theGraphApiKey
          )
        ),
        new AflabContract(
          this.aflabContractAddress,
          config.AFLAB_ABI,
          this.alchemy,
          this.wallet,
          137
        ),
        137
      ),
    ];
  }

  /**
   * Starts the Controller.
   */
  public async start() {
    try {
      await this.initializeDexes();
    } catch (error) {
      logger.error(`Error initializing DEXes: ${error}`, this.constructor.name);
      return;
    }

    if (!this.dexes) {
      logger.error(
        "Error initializing DEXes: DEXes not defined",
        this.constructor.name
      );
      return;
    }

    let dexInitPromises: Promise<void>[];
    try {
      dexInitPromises = this.dexes.map(async (dex: BaseDex) => {
        dex.initialize();
      });
    } catch (error) {
      logger.error(
        `Error getting DEXes initialization Promises: ${error}`,
        this.constructor.name
      );
      return;
    }

    try {
      await Promise.all(dexInitPromises);
    } catch (error) {
      logger.error(`Error initializing DEXes: ${error}`, this.constructor.name);
      return;
    }

    logger.info(
      `Initialized Controller with arguments:
      \tPSv3 AFLAB contract Address: ${this.aflabContractAddress}
      \tWallet Address: ${await this.wallet.getAddress()}`,
      this.constructor.name
    );
  }

  /**
   * Stops the Controller.
   */
  public stop() {
    this.alchemy.ws.removeAllListeners();
  }
}
export { Controller };
