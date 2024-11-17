# Another DEX Flash-loan Arbitrage Bot

## What?

Another Dex Flash-loan arbitrage system that:
- is low cost, works on Binance Smart Chain (BSC);
- uses AAVE for flash loans;
- makes use of established patterns when existent;
- prefers open-source tools but does not shy away from freemium services.

## Introduction

Decentralized exchanges (DEXs) often have price discrepancies due to liquidity variations and large trades. This system aims to exploit these discrepancies through flash loans, which allow borrowing large amounts of cryptocurrency without collateral, provided the loan is repaid within the same transaction.

Key features of this system include:
- **Mispricing**: Take advantage of mispricing between exchanges. When someone executes a large trade into one liquidity pool, it can create an imbalance, distorting the price and causing slippage for that trader.
- **Smart Contract Relay**: Use a Solidity smart contract as a relay between our controller and the exchanges.
- **Risk Management**: We can revert the entire transaction and only lose the transaction fee if it is not profitable with one line of code: `require(endBalance > startBalance, "Trade Reverted, No Profit Made");`

## Tech Stack

* [Node.js](https://nodejs.org) - JavaScript runtime.
* [TypeScript](https://www.typescriptlang.org) - Typed superset of JavaScript.
* [Hardhat](https://hardhat.org) - Ethereum development environment.
* [QuickNode](https://www.quicknode.com) - Ethereum node provider.
* [Solidity](https://soliditylang.org) - Programming language for writing smart contracts.

## Outline

[Strategy](STRATEGY.md)

## Resources

* Uniswap v2 router-based [smart contract](https://github.com/jamesbachini/DEX-Arbitrage/blob/main/contracts/Arb.sol).

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

### Usage

1. Compile the TypeScript files:
    ```sh
    npx tsc
    ```

2. Run the deployment script:
    ```sh
    npx ts-node src/scripts/deploy.ts
    ```

## Disclaimer

This repo is not either an investment advice or a recommendation or solicitation to buy or sell any investment and should not be used in the evaluation of the merits of making any investment decision. It should not be relied upon for accounting, legal or tax advice or investment recommendations. The contents reflected herein are subject to change without being updated.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.