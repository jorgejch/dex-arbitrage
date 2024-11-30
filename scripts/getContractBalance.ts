import dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

/*
 * This script is used to get the balance of a smart contract.
 *
 * @param providerUrl The URL of the Binance Smart Chain provider.
 * @param contractAddress The address of the smart contract.
 * @returns The balance of the smart contract in wei.
 */
async function getContractBalance(
  providerUrl: string,
  contractAddress: string
): Promise<bigint> {
  try {
    // Validate inputs
    if (!ethers.isAddress(contractAddress)) {
      throw new Error("Invalid contract address");
    }
    const provider = new ethers.JsonRpcProvider(providerUrl, "bnb");
    const balance = await provider.getBalance(contractAddress);
    return balance;
  } catch (error) {
    console.error("Error getting contract balance:", error);
    throw error;
  }
}

// Load the provider URL from the .env file
const providerUrl = process.env.FAST_RPC_HTTP_ENDPOINT || "";
if (!providerUrl) {
  console.error(
    "No provider URL specified. Please set QUICKNODE_HTTP_PROVIDER in your .env file."
  );
  process.exit(1);
}

// The contract address should be passed as an argument
const contractAddress = process.argv[2];
if (!contractAddress) {
  console.error(
    "No contract address specified. Please provide the contract address as an argument."
  );
  process.exit(1);
}

getContractBalance(providerUrl, contractAddress)
  .then((balance) => {
    console.log(`Contract Balance: ${balance} BNB`);
  })
  .catch((error) => {
    console.error("Error getting contract balance:", error);
  });
