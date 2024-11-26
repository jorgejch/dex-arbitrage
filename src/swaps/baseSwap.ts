abstract class BaseSwap {
  sender: string;
  recipient: string;
  amount0: number;
  amount1: number;
  sqrtPriceX96: number;
  liquidity: number;
  tick: number;
  poolContract: string;

  constructor(
    sender: string,
    recipient: string,
    amount0: number,
    amount1: number,
    sqrtPriceX96: number,
    liquidity: number,
    tick: number,
    poolContract: string
  ) {
    this.sender = sender;
    this.recipient = recipient;
    this.amount0 = amount0;
    this.amount1 = amount1;
    this.sqrtPriceX96 = sqrtPriceX96;
    this.liquidity = liquidity;
    this.tick = tick;
    this.poolContract = poolContract;
  }
}

export { BaseSwap };  