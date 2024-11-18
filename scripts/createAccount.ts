import { ethers } from "ethers";
import { promises as fs } from "fs";

async function createAccount() {
  const wallet = ethers.Wallet.createRandom();

  // Append the wallet address and private key in the .address file
  await fs.appendFile(".address", wallet.address + "\t" + wallet.privateKey + "\n");
  console.log("Address and private key are saved in .address file");
}

createAccount().catch((error) => {
  console.error(error);
  process.exit(1);
});