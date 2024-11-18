import { Core } from "@quicknode/sdk";
import * as dotenv from "dotenv";

dotenv.config();

// Get the logs of the Binance Smart Chain network of choice
// (mainnet or testnet) for the wallet address of choice.
function printLogs(
  chainNum: 11155111 | 56,
  networkName: "sepolia" | "bsc",
  httpProvider: string,
  isTestnet: boolean,
  currency: "SepoliaETH" | "BNB"
) {
  const core = new Core({
    endpointUrl: httpProvider,
    chain: {
      /** ID in number form */
      id: chainNum,
      /** Human-readable name */
      name: networkName,
      /** Currency used by chain */
      nativeCurrency: {
        decimals: 18,
        name: currency,
        symbol: currency,
      },
      /** Collection of RPC endpoints */
      rpcUrls: {
        default: {
          http: [httpProvider],
        },
      },
      /** Flag for test networks */
      testnet: isTestnet,
    },
  });

  core.client
    .getLogs({
      address: `0x${process.env.WALLET_ADDRESS || ""}`,
    })
    .then((logs) => {
      console.log(logs);
    })
    .catch((error) => {
      console.error(error);
    });
}

// Get the first parameter passed to the script.
const isTestnet = process.argv[2] === "true";

const chainNum = isTestnet ? 11155111 : 56;
const networkName = isTestnet ? "sepolia" : "bsc";
const currency = isTestnet ? "SepoliaETH" : "BNB";
const httpProvider = isTestnet
  ? process.env.QUICKNODE_SEPOLIA_HTTP_PROVIDER || ""
  : process.env.QUICKNODE_HTTP_PROVIDER || "";

// WALLET_ADDRESS must be set in the .env file.
if (!process.env.WALLET_ADDRESS) {
  console.error(
    "No wallet address provided. Please set WALLET_ADDRESS in your .env file."
  );
  process.exit(1);
}

if (!httpProvider) {
  console.error(
    "No RPC URL provided. Please set QUICKNODE_API_URL in your .env file."
  );
  process.exit(1);
}
// Print the wallet address to the console.
console.log(`WALLET_ADDRESS: ${process.env.WALLET_ADDRESS}`);
// Print all arguments to the getLogs function to the console.
console.log(`chainNum: ${chainNum}\tnetworkName: ${networkName}\thttpProvider: ${httpProvider}\tisTestnet: ${isTestnet}\tcurrency: ${currency}`);

printLogs(chainNum, networkName, httpProvider, isTestnet, currency);
