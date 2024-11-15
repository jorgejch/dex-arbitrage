// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@aave/src/contracts/misc/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@aave/src/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/src/contracts/interfaces/IPool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Flash-Loan Arbitrage Contract
 * @notice This is an arbitrage contract that uses AAVE v3 flash loans to make a profit on 0x DEX.
 */
contract FlashLoanArbitrage is FlashLoanSimpleReceiverBase {
    address payable owner;

    constructor(
        address _addressProvider
    ) FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider)) {
        owner = payable(msg.sender);
    }

    /**
     * Modifier to check if the caller is the owner.
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

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
        IERC20(_token).transfer(owner, balance);
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
