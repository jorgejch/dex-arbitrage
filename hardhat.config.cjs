const { vars } = require("hardhat/config");

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.6.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  defaultNetwork: "localhost",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    hardhat: {},
    bsc: {
      url: vars.get("QUICKNODE_BSC_HTTP_PROVIDER"),
      chainId: 56,
      accounts: [
        vars.get("BSC_PRIVATE_KEY"),
      ],
    },
    sepolia: {
      url: vars.get("QUICKNODE_SEPOLIA_HTTP_PROVIDER"),
      chainId: 11155111,
      accounts: [
        vars.get("SEPOLIA_PRIVATE_KEY"),
      ],
    },
    bsctestnet: {
      url: vars.get("QUICKNODE_BSCTESTNET_HTTP_PROVIDER"),
      chainId: 97,
      accounts: [
        vars.get("BSCTESTNET_PRIVATE_KEY"),
      ],
    },
  },
  sourcify:{
    enabled: true
  },
  etherscan:{
    apiKey: vars.get("ETHERSCAN_API_KEY")
  },
  paths: {
    sources: "contracts",
    tests: "tests/unit"
  }
};