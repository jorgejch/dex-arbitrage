# Another Flash-loan Arbitrage Bot (AFLAB)

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=jorgejch_dex-arbitrage&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=jorgejch_dex-arbitrage) [![Codacy Badge](https://app.codacy.com/project/badge/Grade/7538c6b1bbb44105a7159daa9d70450e)](https://app.codacy.com/gh/jorgejch/dex-arbitrage/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

## What?

Another Flash-loan arbitrage bot that:

- is low cost, works on Polygon;
- uses AAVE for flash-loans;
- performs swaps on Uniswap v3 (the DEX);
- makes use of established patterns when they exist;
- prefers open-source tools but does not shy away from freemium services.

## Introduction

Decentralized exchanges (DEXs) often exhibit price discrepancies due to the impact of large trades. This system aims to take advantage of these discrepancies through flash loans, which allow borrowing large amounts of cryptocurrency without collateral, provided the loan is repaid within the same transaction.

Key features of this system include:

- **Price Arbitrage**: Capitalize on price misalignments between exchanges. Large trades can create imbalances in liquidity pools, distorting prices and causing slippage.
- **Smart Contract Relay**: Utilize a Solidity smart contract to act as a relay between the controller and the exchanges, ensuring efficient and secure transactions.
- **Modular and Extensible Design**: Built with a modular architecture, allowing for easy integration of additional features and support for other exchanges.

## Tech Stack

- [Node.js](https://nodejs.org) - JavaScript runtime.
- [TypeScript](https://www.typescriptlang.org) - Typed superset of JavaScript.
- [Hardhat](https://hardhat.org) - Ethereum development environment.
- [Alchemy](www.alchemy.com) - Ethereum node provider.
- [Solidity](https://soliditylang.org) - A programming language for writing smart contracts.
- [Uniswap v3](https://app.uniswap.org/) - Decentralized exchange on Binance Smart Chain.

## Outline

[Strategy](STRATEGY.md)

## Resources

- [Uniswap V3 Polygon Deployed Contracts](https://docs.uniswap.org/contracts/v3/reference/deployments/polygon-deployments)
- [AAVE Resources and Addresses](https://aave.com/docs/resources/addresses)
- [AAVE Error Codes](https://github.com/aave/aave-v3-core/blob/master/contracts/protocol/libraries/helpers/Errors.sol)

## Getting Started

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org)
- [npm](https://www.npmjs.com/)

Additionally, you will need:

- An Ethereum wallet with sufficient funds to cover gas fees. You can create a new wallet using the script in the `scripts` folder.
- An account on [Alchemy](https://www.alchemy.com/) with a new project created to obtain the API key.
- Deployed smart contracts on the Polygon network. The [Remix IDE](https://remix.ethereum.org/) is a good tool to perform the deployment.

### Installation

1. Clone the repository:

    ```sh
    git clone https://github.com/jorgejch/dex-arbitrage.git
    cd dex-arbitrage
    ```

2. Install dependencies:

    ```sh
    npm install
    ```

3. Set up environment variables: Create a `.env` file in the root directory and add your configuration as in the `.env.example` file.

### Usage

1. Compile the TypeScript files:

    ```sh
    npm run build
    ```

2. Run the deployment script:

    ```sh
    npm run start
    ```

## Disclaimer

This repository is for educational and informational purposes only. It is not investment advice or a recommendation to buy or sell any financial instrument. The information provided here should not be used as the basis for any investment decision. Always conduct your own research and consult with a qualified financial advisor before making any investment decisions. The authors and contributors are not responsible for any financial losses or damages incurred as a result of using this software. The contents are subject to change without notice.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
