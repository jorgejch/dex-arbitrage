import { BaseSwap } from "./baseSwap.js";

import { Decimal } from "decimal.js";

/**
 * Represents a PSv3 swap.
 */
class PSv3Swap extends BaseSwap {
  protocolFeesToken0: bigint;
  protocolFeesToken1: bigint;
  contractAddress: string;

  constructor(
    sender: string,
    recipient: string,
    amount0: bigint,
    amount1: bigint,
    sqrtPriceX96: Decimal,
    liquidity: bigint,
    protocolFeesToken0: bigint,
    protocolFeesToken1: bigint,
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
    this.protocolFeesToken0 = protocolFeesToken0;
    this.protocolFeesToken1 = protocolFeesToken1;
    this.contractAddress = contractAddress;
  }
}

export { PSv3Swap };
