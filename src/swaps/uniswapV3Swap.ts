import { BaseSwap } from "./baseSwap.js";

import { BigNumber } from "alchemy-sdk";

/**
 * Represents a Uniswap v3 swap.
 */
class UniswapV3Swap extends BaseSwap {
  constructor(
    sender: string,
    recipient: string,
    amount0: bigint,
    amount1: bigint,
    sqrtPriceX96: BigNumber,
    liquidity: bigint,
    contractAddress: string
  ) {
    super(
      sender,
      recipient,
      amount0,
      amount1,
      sqrtPriceX96,
      liquidity,
      contractAddress
    );
  }
}

export { UniswapV3Swap };
