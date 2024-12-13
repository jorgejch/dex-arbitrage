// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import { Test } from "forge-std/Test.sol";
import { UniswapV3Arbitrage } from "../UniswapV3Arbitrage.sol";
import { IPoolAddressesProvider } from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

contract UniswapV3ArbitrageTest is Test {
  UniswapV3Arbitrage arbitrage;
  address owner = address(this);
  address addressProvider = address(0x1234567890123456789012345678901234567890);
  address swapRouter = address(0x0987654321098765432109876543210987654321);

  function setUp() public {
    arbitrage = new UniswapV3Arbitrage(addressProvider, swapRouter);
  }

  function testInitiateFlashLoan() public {
    UniswapV3Arbitrage.SwapInfo memory swap1 = UniswapV3Arbitrage.SwapInfo({
      tokenIn: address("0xTokenA"),
      tokenOut: address("0xTokenB"),
      poolFee: 3000,
      amountOutMinimum: 0
    });
    UniswapV3Arbitrage.SwapInfo memory swap2 = UniswapV3Arbitrage.SwapInfo({
      tokenIn: address("0xTokenB"),
      tokenOut: address("0xTokenC"),
      poolFee: 3000,
      amountOutMinimum: 0
    });
    UniswapV3Arbitrage.SwapInfo memory swap3 = UniswapV3Arbitrage.SwapInfo({
      tokenIn: address("0xTokenC"),
      tokenOut: address("0xTokenA"),
      poolFee: 3000,
      amountOutMinimum: 0
    });
    UniswapV3Arbitrage.ArbitrageInfo memory data = UniswapV3Arbitrage.ArbitrageInfo({
      swap1: swap1,
      swap2: swap2,
      swap3: swap3,
      extraCost: 0
    });

    uint256 tokenAIn = 1 ether;
    arbitrage.initiateFlashLoan(data, tokenAIn);
  }

  function testWithdrawToken() public {
    address token = address("0xToken");
    vm.prank(owner);
    arbitrage.withdraw(token);
  }

  function testWithdrawNative() public {
    vm.prank(owner);
    arbitrage.withdrawNative();
  }

  function testGetBalance() public {
    address token = address("0xToken");
    uint256 balance = arbitrage.getBalance(token);
    assertEq(balance, 0);
  }

  function testGetExecutionCounter() public {
    uint32 counter = arbitrage.getExecutionCounter();
    assertEq(counter, 0);
  }

  function testReceive() public {
    payable(address(arbitrage)).transfer(1 ether);
    uint256 balance = arbitrage.getBalanceReceived();
    assertEq(balance, 1 ether);
  }
}