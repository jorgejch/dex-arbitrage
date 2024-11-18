import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

export default buildModule("aflab", (m) => {
  // Deploy the FlashLoanArbitrage contract with the BSC mainnet Pool Address Provider address as the constructor argument
  const flashLoanArbitrage = m.contract("FlashLoanArbitrage", ["0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e"])

  return { flashLoanArbitrage }
})