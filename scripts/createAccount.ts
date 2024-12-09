import { Wallet } from "alchemy-sdk";
import { promises as fs } from "fs";

/*
 * This script is used to create a new account.
 * The address and private key of the account will be saved in a .address file.
 */
async function createAccount() {
    const wallet = Wallet.createRandom();
    const address = wallet.address;
    const privateKey = wallet.privateKey;

    await fs.appendFile(".address", `${address}\t${privateKey}\n`);
    console.log("Address and private key are saved in .address file");
}

createAccount().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
