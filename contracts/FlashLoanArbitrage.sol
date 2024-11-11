// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/*
 * This is an arbitrage contract that uses AAVE v3 flash loans to make a profit on 0x DEX.
 */

import "@aave-v3-core/contracts/flashloan/base/FlashLoanReceiverBase.sol";
import "@aave-v3-core/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave-v3-core/contracts/interfaces/IPool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FlashLoanArbitrage is FlashLoanReceiverBase {
    address private owner;

    constructor(address _addressProvider) FlashLoanReceiverBase(IPoolAddressesProvider(_addressProvider)) {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        // Arbitrage logic goes here

        // Repay AAVE flash loan
        for (uint i = 0; i < assets.length; i++) {
            uint amountOwing = amounts[i] + premiums[i];
            IERC20(assets[i]).approve(address(POOL), amountOwing);
        }
        return true;
    }

    function initiateFlashLoan(address asset, uint256 amount) external onlyOwner {
        address receiverAddress = address(this);
        address onBehalfOf = address(this);
        bytes memory params = "";
        uint16 referralCode = 0;

        address[] memory assets = new address[](1);
        assets[0] = asset;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        uint256[] memory interestRateModes = new uint256[](1);
        interestRateModes[0] = 0; // 0: no debt (flash loan), 1: stable, 2: variable

        POOL.flashLoan(
            receiverAddress,
            assets,
            amounts,
            interestRateModes,
            onBehalfOf,
            params,
            referralCode
        );
    }

    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");
        IERC20(token).transfer(owner, balance);
    }
}