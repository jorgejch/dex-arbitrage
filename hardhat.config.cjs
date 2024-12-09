const { vars } = require("hardhat/config");

module.exports = {
    solidity: {
        compilers: [
            {
                version: "0.6.0",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: "0.8.0",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: "0.8.20",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: "0.8.27",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    defaultNetwork: "localhost",
    networks: {
        localhost: {
            url: "http://127.0.0.1:8545",
        },
        hardhat: {},
    },
    sourcify: {
        enabled: true,
    },
    etherscan: {
        apiKey: vars.get("ETHERSCAN_API_KEY"),
    },
    paths: {
        sources: "contracts",
    },
};
