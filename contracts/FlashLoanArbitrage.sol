// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@pancakeswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@pancakeswap/v3-periphery/contracts/libraries/TransferHelper.sol";

import "hardhat/console.sol";

/**
 * @title Flash-Loan Arbitrage Contract
 * @notice This is an arbitrage contract that uses AAVE v3 flash loans to make a profit on PancakeSwap v3.
 */
contract FlashLoanArbitrage is FlashLoanSimpleReceiverBase, Ownable {
    ISwapRouter immutable router;

    /**
     * Individual swap information.
     */
    struct SwapInfo {
        address router;
        address tokenIn;
        address tokenOut;
        uint24 poolFee;
        uint256 amountOutMinimum;
    }

    /**
     * Triangular arbitrage information.
     */
    struct ArbitInfo {
        SwapInfo swap1;
        SwapInfo swap2;
        SwapInfo swap3;
        uint256 estimatedGasCost;
    }

    /**
     * Event emitted when a swap is executed
     *  
     * @param swapInfo The swap information
     * @param amountIn Amount of the input token
     * @param amountOut Amount of the output token
     */
    event Swap(
        SwapInfo swapInfo,
        uint256 amountIn,
        uint256 amountOut
    );

    /**
     * Event emitted when the arbitrage is started.
     * 
     * @param data The arbitrage information
     * @param amount The amount to borrow
     */
    event ArbitrageStart(ArbitInfo data, uint256 amount);

    /**
     * Constructor.
     *
     * @param addressProvider  The AAVE Pool Address Provider address.
     * @param swapRouter       The PancakeSwap v3 router address.
     */
    constructor(
        address addressProvider,
        address swapRouter
    )
        payable
        FlashLoanSimpleReceiverBase(IPoolAddressesProvider(addressProvider))
        Ownable(msg.sender)
    {
        router = ISwapRouter(swapRouter);
    }

    /**
     * Internal function to swap tokens on PancakeSwap v3.
     *
     * @param swapInfo  The swap information
     * @param amountIn  The amount of input tokens
     */
    function _swapTokens(
        SwapInfo memory swapInfo,
        uint256 amountIn
    ) internal returns (uint256) {
        // Approve the PancakeSwap router to spend the token
        TransferHelper.safeApprove(swapInfo.tokenIn, address(router), amountIn);

        // Create the swap parameters
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: swapInfo.tokenIn,
                tokenOut: swapInfo.tokenOut,
                fee: swapInfo.poolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: swapInfo.amountOutMinimum,
                sqrtPriceLimitX96: 0 // No price limit
            });

        uint256 amountOut = router.exactInputSingle(params);

        require(
            amountOut >= swapInfo.amountOutMinimum,
            "Insufficient output amount"
        );

        emit Swap(
            swapInfo,
            amountIn,
            amountOut
        );

        return amountOut;
    }

    /**
     * Called by the lending pool when the flashloan is executed.
     * It executes the swaps for the triangular arbitrage opportunity.
     * Overridden from FlashLoanSimpleReceiverBase.
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
        require(msg.sender == address(POOL), "Malicious Callback");
        require(
            amount <= IERC20(asset).balanceOf(address(this)),
            "Invalid Balance"
        );

        // Decode the arbitrage info
        ArbitInfo memory decoded = abi.decode(params, (ArbitInfo));

        // Swap token A for token B.
        SwapInfo memory swap1 = decoded.swap1;
        uint256 swap1AmountOut = _swapTokens(swap1, amount);

        // Swap token B for token C.
        SwapInfo memory swap2 = decoded.swap2;
        uint256 swap2AmountOut = _swapTokens(swap2, swap1AmountOut);

        // Swap token C for token A.
        SwapInfo memory swap3 = decoded.swap3;
        uint256 swap3AmountOut = _swapTokens(swap3, swap2AmountOut);

        // Amount owed to the lending pool
        uint256 amountOwed = amount + premium;

        // Check if the arbitrage is profitable after accounting for gas costs
        require(
            swap3AmountOut > amountOwed + decoded.estimatedGasCost,
            "Arbitrage Opportunity Not Profitable"
        );

        // Authorize flash loan repayment
        TransferHelper.safeApprove(asset, address(POOL), amountOwed);

        return true;
    }

    /**
     * Initiate a flash loan.
     *
     * @param data      The arbitrage information
     * @param amount    The amount to borrow
     */
    function initiateFlashLoan(
        ArbitInfo memory data,
        uint256 amount
    ) external onlyOwner {
        address receiverAddress = address(this);
        uint16 referralCode = 0;

        emit ArbitrageStart(data, amount);

        POOL.flashLoanSimple(
            receiverAddress,
            data.swap1.tokenIn,
            amount,
            abi.encode(data),
            referralCode
        );
    }

    /**
     * Withdraw the token balance.
     *
     * @param token The token address
     */
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");
        IERC20(token).transfer(owner(), balance);
    }

    /**
     * Get balance of the token.
     *
     * @param token The token address
     */
    function getBalance(
        address token
    ) external view onlyOwner returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * Receive tokens.
     */
    receive() external payable {}
}
