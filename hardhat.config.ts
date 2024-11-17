import { HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.10",
  defaultNetwork: "bsctestnet",
  networks: {
    hardhat: {},
    bsc: {
      url: `https://misty-dry-pallet.bsc.quiknode.pro/${vars.get("QUICKNODE_API_KEY")}/`,
      chainId: 56,
      gasPrice: 1000000000,
      accounts: [
        vars.get("QUICKNODE_API_KEY"),
      ],
    },
    bsctestnet: {
      url: `https://misty-dry-pallet.bsc-testnet.quiknode.pro/${vars.get("QUICKNODE_API_KEY")}/`,
      chainId: 97,
      accounts: [
        vars.get("QUICKNODE_API_KEY"),
      ],
    },
  }
};

export default config;