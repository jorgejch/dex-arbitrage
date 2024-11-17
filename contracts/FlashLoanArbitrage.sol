// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Flash-Loan Arbitrage Contract
 * @notice This is an arbitrage contract that uses AAVE v3 flash loans to make a profit on Uniswap v3 compatible DEX.
 */
contract FlashLoanArbitrage is FlashLoanSimpleReceiverBase, Ownable {

    constructor(address _addressProvider) FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider)) Ownable(msg.sender) {}

    /**
     * Execute the arbitrage operation.
     * Overridden from FlashLoanReceiverBase.
     *
     * @param asset     The asset address
     * @param amount    The amount to borrow
     * @param premium   The premium to pay
     * @param initiator The initiator address
     * @param params    The parameters
     */
    function executeOperation(
            address asset,
            uint256 amount,
            uint256 premium,
            address initiator,
            bytes calldata params
        ) external override returns (bool) {
        // Arbitrage logic goes here

        // Repay AAVE flash loan
        uint256 amountOwed = amount + premium;
        IERC20(asset).approve(address(POOL), amountOwed);
        return true;
    }

    /**
     * Initiate a flash loan.
     *
     * @param asset     The asset address
     * @param amount    The amount to borrow
     */
    function initiateFlashLoan(
        address asset,
        uint256 amount
    ) external onlyOwner {
        address receiverAddress = address(this);
        bytes memory params = "";
        uint16 referralCode = 0;

        POOL.flashLoanSimple(
            receiverAddress,
            asset,
            amount,
            params,
            referralCode
        );
    }

    /**
     * Withdraw the token balance.
     *
     * @param _token The token address
     */
    function withdraw(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");
        IERC20(_token).transfer(owner(), balance);
    }

    /**
     * Get balance of the token.
     *
     * @param _token The token address
     */
    function getBalance(address _token) external view returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }

    /**
     * Receive tokens.
     */
    receive() external payable {}
}
