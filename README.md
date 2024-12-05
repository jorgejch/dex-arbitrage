# Another Flash-loan Arbitrage Bot (AFLAB)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=jorgejch_dex-arbitrage&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=jorgejch_dex-arbitrage)
## What?

Another Flash-loan arbitrage system that:

- is low cost, works on Polygon;
- uses AAVE for flash loans;
- it uses Uniswap v3 for the DEX;
- makes use of established patterns when they exist;
- prefers open-source tools but does not shy away from freemium services.

## Introduction

Decentralized exchanges (DEXs) often have price discrepancies due to liquidity variations and large trades. This system aims to exploit these discrepancies through flash loans, which allow borrowing large amounts of cryptocurrency without collateral, provided the loan is repaid within the same transaction.

Key features of this system include:

- **Mispricing**: Take advantage of mispricing between exchanges. When someone executes a large trade into one liquidity pool, it can create an imbalance, distorting the price and causing slippage for that trader.
- **Smart Contract Relay**: Use a Solidity smart contract as a relay between our controller and the exchanges.
- **Risk Management**: We can revert the entire transaction and only lose the transaction fee if it is not profitable with one line of code: `require(endBalance > startBalance, "Trade Reverted, No Profit Made");`

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

- Node.js
- npm
- TypeScript

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

This repo is not either investment advice or a recommendation or solicitation to buy or sell any investment. It should not be used to evaluate the merits of making any investment decision. It should not be relied upon for accounting, legal, tax advice, or investment recommendations. The contents reflected herein are subject to change unless updated.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
