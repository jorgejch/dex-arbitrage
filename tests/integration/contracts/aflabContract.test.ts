import { AflabContract } from "../../../src/contracts/aflabContract.js";
import { ArbitrageInfo, Opportunity, SwapInfo } from "../../../src/types.js";
import { BaseSwap } from "../../../src/swaps/baseSwap.js";
import { config, logger } from "../../../src/common.js";

import { vi, describe, expect, beforeAll, afterAll, test } from "vitest";
import { Alchemy, Network, Wallet, BigNumber } from "alchemy-sdk";
import dotenv from "dotenv";

dotenv.config();

const address = process.env.UNISWPV3_CONTRACT_ADDRESS ?? "";
const walletPrivKey = process.env.WALLET_PRIVATE_KEY ?? "";
const alchemyApiKey = process.env.ALCHEMY_API_KEY ?? "";

describe("AflabContract Integration Tests", () => {
  let aflabContract: AflabContract;

  beforeAll(async () => {
    logger.setLogLevel("debug");
    const alchemy = new Alchemy({
      apiKey: alchemyApiKey,
      network: Network.MATIC_MAINNET,
    });
    const wallet = new Wallet(walletPrivKey, alchemy);
    aflabContract = new AflabContract(
      address,
      config.AFLAB_ABI,
      alchemy,
      wallet,
      137
    );
    aflabContract.initialize();
  });

  afterAll(async () => {
    logger.setLogLevel(config.LOG_LEVEL);
  });

  test("should have sourced the environment variables correctly", async () => {
    expect(address).not.toBe("");
    expect(walletPrivKey).not.toBe("");
  });

  test("should initialize correctly", async () => {
    expect(aflabContract.isInitialized()).toBe(true);
  });

  test("should execute trade successfully", async () => {
    const inputAmount: BigNumber = BigNumber.from("10");
    const swap1: SwapInfo = {
      tokenIn: {
        id: "0x55d398326f99059ff775485246999027b3197955",
        name: "Tether USD",
        symbol: "USDT",
        decimals: 18,
      },
      tokenOut: {
        id: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        name: "Wrapped BNB",
        symbol: "WBNB",
        decimals: 18,
      },
      poolFee: BigNumber.from(0.03 * 10 ** 5),
      amountOutMinimum: BigNumber.from(0),
    };

    const swap2: SwapInfo = {
      tokenIn: {
        id: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        name: "Wrapped BNB",
        symbol: "WBNB",
        decimals: 18,
      },
      tokenOut: {
        id: "0x4d2d32d8652058bf98c772953e1df5c5c85d9f45",
        name: "DAO",
        symbol: "DAO",
        decimals: 18,
      },
      poolFee: BigNumber.from(0.03).mul(10 ** 5),
      amountOutMinimum: BigNumber.from(0),
    };

    const swap3: SwapInfo = {
      tokenIn: {
        id: "0x4d2d32d8652058bf98c772953e1df5c5c85d9f45",
        name: "DAO",
        symbol: "DAO",
        decimals: 18,
      },
      tokenOut: {
        id: "0x55d398326f99059ff775485246999027b3197955",
        name: "Tether USD",
        symbol: "USDT",
        decimals: 18,
      },
      poolFee: BigNumber.from(0.03).mul(10 ** 5),
      amountOutMinimum: BigNumber.from(0),
    };

    const arbitInfo: ArbitrageInfo = {
      swap1: swap1,
      swap2: swap2,
      swap3: swap3,
      estimatedGasCost: BigNumber.from(0),
    };

    const mockOriginalSwap: BaseSwap = {
      inputTokens: [
        {
          id: "0x55d398326f99059ff775485246999027b3197955",
          name: "Tether USD",
          symbol: "USDT",
          decimals: 18,
        },
        {
          id: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
          name: "Wrapped BNB",
          symbol: "WBNB",
          decimals: 18,
        },
      ],
      amount0: BigInt(0),
      amount1: BigInt(0),
      sender: "",
      recipient: "",
      sqrtPriceX96: BigNumber.from(0),
      liquidity: BigInt(0),
      poolContractAddress: "",
      setTokens: vi.fn(),
      getTokens: vi.fn(),
      calculatePriceImpact: vi.fn(),
      getContractAddress: vi.fn(),
    };

    const opportunity: Opportunity = {
      arbitInfo: arbitInfo,
      tokenAIn: inputAmount,
      lastPoolSqrtPriceX96: BigNumber.from(0),
      originalSwap: mockOriginalSwap,
      expectedProfit: BigNumber.from(0),
      originalSwapPriceImpact: 18,
    };

    let tradeResult;
    try {
      tradeResult = await aflabContract.executeOpportunity(opportunity);
    } catch (error) {
      console.error("Error executing opportunity:", error);
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
    }
    console.log(tradeResult);
  });
}, 60000);
