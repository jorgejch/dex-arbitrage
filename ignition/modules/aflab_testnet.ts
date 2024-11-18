import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

export default buildModule("aflab_testnet", (m) => {
  // Deploy the FlashLoanArbitrage contract with the Sepolia testnet Pool Address Provider address as the constructor argument
  const flashLoanArbitrage = m.contract("FlashLoanArbitrage", ["0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A"])

  return { flashLoanArbitrage }
})