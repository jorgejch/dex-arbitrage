import { ethers } from "ethers";
import { promises as fs } from "fs";

/*
 * This script is used to create a new account.
 * The address and private key of the account will be saved in a .address file.
 */
async function createAccount() {
  const wallet = ethers.Wallet.createRandom();
  await fs.appendFile(
    ".address",
    wallet.address + "\t" + wallet.privateKey + "\n"
  );
  console.log("Address and private key are saved in .address file");
}

createAccount().catch((error) => {
  console.error(error);
  process.exit(1);
});
