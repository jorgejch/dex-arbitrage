import { BaseSwap } from "./baseSwap.js";

class PSv3Swap extends BaseSwap {
  protocolFeesToken0: number;
  protocolFeesToken1: number;
  contractAddress: string;

  constructor(
    sender: string,
    recipient: string,
    amount0: number,
    amount1: number,
    sqrtPriceX96: number,
    liquidity: number,
    tick: number,
    protocolFeesToken0: number,
    protocolFeesToken1: number,
    contractAddress: string
  ) {
    super(sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick, contractAddress);
    this.protocolFeesToken0 = protocolFeesToken0;
    this.protocolFeesToken1 = protocolFeesToken1;
    this.contractAddress = contractAddress;
  }
}

export { PSv3Swap };