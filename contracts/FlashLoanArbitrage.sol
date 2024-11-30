// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@pancakeswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@pancakeswap/v3-periphery/contracts/libraries/TransferHelper.sol";

/**
 * @title Flash-Loan Arbitrage Contract
 * @notice This is an arbitrage contract that uses AAVE v3 flash loans to make a profit on PancakeSwap v3.
 */
contract FlashLoanArbitrage is FlashLoanSimpleReceiverBase, Ownable2Step {
    uint256 balanceReceived = 0;
    uint32 executionCounter = 0;
    address immutable addressThis = address(this);
    ISwapRouter internal immutable router;
    address internal immutable routerAddress;

    /**
     * @dev Event emitted when the arbitrage is concluded, regardless of success or failure.
     *
     * @param id The execution identifier number (counter)
     * @param amountToBorrow The amount borrowed
     * @param swap1 The initial swap information for swap 1
     * @param swap1AmountOut Amount of the output token for swap 1
     * @param swap2 The initial swap information for swap 2
     * @param swap2AmountOut Amount of the output token for swap 2
     * @param swap3 The initial swap information for swap 3
     * @param swap3AmountOut Amount of the output token for swap 3
     * @param profit The profit made from the arbitrage
     * @param success Whether the arbitrage was successful
     */
    event ArbitrageConcluded(
        uint32 id,
        uint256 amountToBorrow,
        SwapInfo swap1,
        uint256 swap1AmountOut,
        SwapInfo swap2,
        uint256 swap2AmountOut,
        SwapInfo swap3,
        uint256 swap3AmountOut,
        uint256 profit,
        bool success
    );

    /**
     * Individual swap information.
     */
    struct SwapInfo {
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
        uint256 extraCost; // in input token
    }

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
        routerAddress = swapRouter;
        router = ISwapRouter(routerAddress);
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
    ) internal returns (uint256 amountOut) {
        // Approve the PancakeSwap router to spend the token
        TransferHelper.safeApprove(
            swapInfo.tokenIn,
            routerAddress,
            amountIn
        );

        // Create the swap parameters
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: swapInfo.tokenIn,
                tokenOut: swapInfo.tokenOut,
                fee: swapInfo.poolFee,
                recipient: addressThis,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: swapInfo.amountOutMinimum,
                sqrtPriceLimitX96: 0 // No price limit
            });

        amountOut = router.exactInputSingle(params);
    }

    /**
     * Called by the lending pool when the flashloan is executed.
     * It executes the swaps for the triangular arbitrage opportunity.
     * Overridden from FlashLoanSimpleReceiverBase.
     *
     * @param asset     The asset address
     * @param amount    The amount to borrow
     * @param premium   The premium to pay
     * @param params    The parameters
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address /* initiator */,
        bytes calldata params
    ) external override returns (bool isSucess) {
        require(msg.sender == address(POOL), "malicious callback");
        require(
            amount <= IERC20(asset).balanceOf(addressThis),
            "invalid balance"
        );

        executionCounter++;

        // Decode the arbitrage info
        ArbitInfo memory decoded = abi.decode(params, (ArbitInfo));

        // Swap token A for token B.
        uint256 swap1AmountOut = _swapTokens(decoded.swap1, amount);

        // Swap token B for token C.
        uint256 swap2AmountOut = _swapTokens(decoded.swap2, swap1AmountOut);

        // Swap token C for token A.
        uint256 swap3AmountOut = _swapTokens(decoded.swap3, swap2AmountOut);

        // Amount owed to the lending pool
        uint256 amountOwed = amount + premium;

        // Profit
        uint256 profit = swap3AmountOut - (amountOwed + decoded.extraCost);

        // Emit the arbitrage conclusion event
        emit ArbitrageConcluded(
            executionCounter,
            amount,
            decoded.swap1,
            swap1AmountOut,
            decoded.swap2,
            swap2AmountOut,
            decoded.swap3,
            swap3AmountOut,
            profit,
            profit > 0
        );

        // Check if the arbitrage is profitable
        require(profit > 0, "not profitable");

        // Authorize flash loan repayment
        TransferHelper.safeApprove(asset, address(POOL), amountOwed);

        isSucess = true;
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
    ) external payable onlyOwner {
        POOL.flashLoanSimple(
            addressThis,
            data.swap1.tokenIn,
            amount,
            abi.encode(data),
            0
        );
    }

    /**
     * Withdraw the token balance.
     *
     * @param token The token address
     */
    function withdraw(address token) external payable onlyOwner {
        uint256 balance = IERC20(token).balanceOf(addressThis);
        require(balance != 0, "no balance");
        IERC20(token).transfer(owner(), balance);
    }

    /**
     * Withdraw the BNB balance.
     */
    function withdrawBNB() external payable onlyOwner {
        uint256 balance = addressThis.balance;
        require(balance != 0, "no balance");
        payable(owner()).transfer(balance);
    }

    /**
     * Get balance of the token.
     *
     * @param token The token address
     */
    function getBalance(
        address token
    ) external payable onlyOwner returns (uint256) {
        return IERC20(token).balanceOf(addressThis);
    }

    /**
     * Receive tokens.
     */
    receive() external payable {
        balanceReceived = balanceReceived + msg.value;
    }
}
