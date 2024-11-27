import { BaseSwap } from "./baseSwap.js";

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
    sqrtPriceX96: bigint,
    liquidity: bigint,
    tick: number,
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
      tick,
      contractAddress
    );
    this.protocolFeesToken0 = protocolFeesToken0;
    this.protocolFeesToken1 = protocolFeesToken1;
    this.contractAddress = contractAddress;
  }

  /**
   * Calculate the protocol fees for the swap
   * 
   * @returns The protocol fees
   * @throws An error if the protocol fees are not set
   */
  public calculateProtocolFees(): bigint {
    if (this.protocolFeesToken0 === undefined || this.protocolFeesToken1 === undefined) {
      throw new Error("Protocol fees not set");
    }

    return this.protocolFeesToken0 + this.protocolFeesToken1;
  }
}

export { PSv3Swap };
