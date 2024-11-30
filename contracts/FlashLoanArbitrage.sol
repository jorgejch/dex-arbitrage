// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

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
    uint256 private balanceReceived = 0;
    uint32 private executionCounter = 0;
    address internal immutable contractAddress = address(this);
    ISwapRouter internal immutable swapRouter;
    address internal immutable swapRouterAddress;

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
        uint256 profit
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
     * @param sRouter          The PancakeSwap v3 router address.
     */
    constructor(
        address addressProvider,
        address sRouter
    )
        payable
        FlashLoanSimpleReceiverBase(IPoolAddressesProvider(addressProvider))
        Ownable(msg.sender)
    {
        swapRouterAddress = sRouter;
        swapRouter = ISwapRouter(swapRouterAddress);
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
            swapRouterAddress,
            amountIn
        );

        // Create the swap parameters
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: swapInfo.tokenIn,
                tokenOut: swapInfo.tokenOut,
                fee: swapInfo.poolFee,
                recipient: contractAddress,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: swapInfo.amountOutMinimum,
                sqrtPriceLimitX96: 0 // No price limit
            });

        amountOut = swapRouter.exactInputSingle(params);
    }

    /**
     * @notice Executes the flash loan operation.
     * @dev This function is called by the lending pool after receiving the flash loaned amount.
     * @param asset The address of the asset being borrowed.
     * @param amount The amount of the asset being borrowed.
     * @param premium The fee to be paid for the flash loan.
     * @param params Additional parameters passed to the function.
     * @return isSuccess A boolean indicating whether the operation succeeded.
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address /* initiator */,
        bytes calldata params
    ) external override returns (bool isSuccess) {
        require(msg.sender == address(POOL), "malicious callback");
        require(
            amount <= IERC20(asset).balanceOf(contractAddress),
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

        // Check if the arbitrage is profitable
        require(profit > 0, "not profitable");

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
            profit
        );

        // Authorize flash loan repayment
        TransferHelper.safeApprove(asset, address(POOL), amountOwed);

        isSuccess = true;
    }

    /**
     * @notice Initiates a flash loan for arbitrage purposes.
     * @dev This function starts the flash loan process by interacting with the lending protocol.
     */
    function initiateFlashLoan(
        ArbitInfo memory data,
        uint256 amount
    ) external payable onlyOwner {
        POOL.flashLoanSimple(
            contractAddress,
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
        uint256 balance = IERC20(token).balanceOf(contractAddress);
        require(balance > 0, "no balance");
        IERC20(token).transfer(owner(), balance);
    }

    /**
     * Withdraw the BNB balance.
     */
    function withdrawBNB() external payable onlyOwner {
        uint256 balance = contractAddress.balance;
        require(balance > 0, "no balance");
        payable(owner()).transfer(balance);
    }

    /**
     * Get balance of the specified token.
     *
     * @param token The token address
     */
    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(contractAddress);
    }

    /**
     * Get the execution count.
     */
    function getExecutionCounter() external view returns (uint32) {
        return executionCounter;
    }

    /**
     * Get the total BNB received balance.
     */
    function getBalanceReceived() external view returns (uint256) {
        return balanceReceived;
    }

    /**
     * Receive tokens.
     */
    receive() external payable {
        balanceReceived += msg.value;
    }
}
