import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

export default buildModule("aflab_testnet", (m) => {
  // Deploy the FlashLoanArbitrage contract with the Sepolia testnet Pool Address Provider address as the constructor argument
  const flashLoanArbitrage = m.contract("FlashLoanArbitrage", ["0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A", "0x1b81D678ffb9C0263b24A97847620C99d213eB14"])

  return { flashLoanArbitrage }
})