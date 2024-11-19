import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("aflab", (m) => {
  /**
   * Deploy the FlashLoanArbitrage contract to BSC mainnet.
   * 
   * The contract will be deployed with the following parameters:
   * 1. The address of the AAVE v3 Address Provider on BSC mainnet.
   * 2. The address of the PancakeSwap v3 SwapRouter on BSC mainnet.
   */
  const flashLoanArbitrage = m.contract("FlashLoanArbitrage", [
    "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e",
    "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
  ]);

  return { flashLoanArbitrage };
});
