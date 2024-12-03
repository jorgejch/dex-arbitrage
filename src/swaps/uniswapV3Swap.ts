import { BaseSwap } from "./baseSwap.js";

import { Decimal } from "decimal.js";

/**
 * Represents a Uniswap v3 swap.
 */
class UniswapV3Swap extends BaseSwap {
  constructor(
    sender: string,
    recipient: string,
    amount0: bigint,
    amount1: bigint,
    sqrtPriceX96: Decimal,
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
