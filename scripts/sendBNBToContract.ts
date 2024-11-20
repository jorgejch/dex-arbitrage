import dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

/**
 * Sends BNB to a specified contract address.
 *
 * @param providerUrl The URL of the Binance Smart Chain provider.
 * @param privateKey The private key of the sender's wallet.
 * @param contractAddress The address of the contract to send BNB to.
 * @param amount The amount of BNB to send.
 * @returns The transaction hash.
 */
async function sendBNBToContract(
  providerUrl: string,
  privateKey: string,
  contractAddress: string,
  amount: string
): Promise<string> {
  try {
    // Validate inputs
    if (!ethers.isAddress(contractAddress)) {
      throw new Error("Invalid contract address");
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      throw new Error("Invalid amount");
    }
    const provider = new ethers.JsonRpcProvider(providerUrl, "bnb");
    const wallet = new ethers.Wallet(privateKey, provider);
    const tx = await wallet.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther(amount),
    });

    return tx.hash;
  } catch (error) {
    console.error("Error sending BNB to contract:", error);
    throw error;
  }
}

const providerUrl = process.env.QUICKNODE_HTTP_PROVIDER || "";
const privateKey = process.env.WALLET_PRIVATE_KEY || "";
const contractAddress = process.argv[2];
const amount = process.argv[3];

if (!providerUrl) {
  console.error(
    "No provider URL specified. Please set QUICKNODE_HTTP_PROVIDER in your .env file."
  );
  process.exit(1);
}

if (!privateKey) {
  console.error(
    "No private key specified. Please set WALLET_PRIVATE_KEY in your .env file."
  );
  process.exit(1);
}

if (!contractAddress) {
  console.error(
    "No contract address specified. Please provide the contract address as an argument."
  );
  process.exit(1);
}

if (!amount) {
  console.error(
    "No amount specified. Please provide the amount of BNB to send as an argument."
  );
  process.exit(1);
}

sendBNBToContract(providerUrl, privateKey, contractAddress, amount)
  .then((txHash) => {
    console.log(`Transaction hash: ${txHash}`);
  })
  .catch((error) => {
    console.error("Error sending BNB to contract:", error);
  });
