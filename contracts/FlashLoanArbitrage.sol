// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ISwapRouter} from "@pancakeswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {TransferHelper} from "@pancakeswap/v3-periphery/contracts/libraries/TransferHelper.sol";

/**
 * @title Flash-Loan Arbitrage Contract
 * @notice This is an arbitrage contract that uses AAVE v3 flash loans to make a profit on PancakeSwap v3.
 */
contract FlashLoanArbitrage is FlashLoanSimpleReceiverBase, Ownable2Step {
    uint256 private _balanceReceived;
    uint32 private _executionCounter;
    address internal immutable _poolAddress = address(POOL);
    address internal immutable _contractAddress = address(this);
    ISwapRouter internal immutable _swapRouter;
    address internal immutable _swapRouterAddress;

    /**
     * @dev Event emitted when the arbitrage is concluded, regardless of success or failure.
     *
     * @param executionId The execution identifier number (counter)
     * @param inputAmount The amount borrowed
     * @param swap1AmountOut Amount of the output token for swap 1
     * @param swap2AmountOut Amount of the output token for swap 2
     * @param swap3AmountOut Amount of the output token for swap 3
     * @param profit The profit made from the arbitrage
     */
    event ArbitrageConcluded(
        uint32 indexed executionId,
        uint256 inputAmount,
        uint256 swap1AmountOut,
        uint256 swap2AmountOut,
        uint256 swap3AmountOut,
        uint256 profit
    );

    /**
     * @dev Event emitted when a flash loan error occurs.
     *
     * @param executionId The execution identifier number (counter)
     * @param message The error message
     */
    event FlashloanError(uint32 indexed executionId, string message);

    /**
     * @dev Event emitted when a swap is executed.
     * @param executionId The execution identifier number (counter)
     * @param tokenIn The input token address
     * @param tokenOut The output token address
     * @param amount0Delta The amount of token0 that was sent (negative) or must be received (positive) by the pool by the end of the swap.
     * @param amount1Delta The amount of token1 that was sent (negative) or must be received (positive) by the pool by the end of the swap.
     */
    event SwapExecuted(
        uint32 indexed executionId,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amount0Delta,
        uint256 amount1Delta
    );

    /**
     * @dev Event emitted when a swap error occurs.
     *
     * @param executionId The execution identifier number (counter)
     * @param message The error message
     */
    event SwapError(uint32 indexed executionId, string message);

    /**
     * @dev Event emitted when a token is withdrawn from the contract.
     */
    event TokenWithdrawn(
        address indexed token,
        address indexed toAccount,
        uint256 balance
    );

    /**
     * @dev Event emitted when the native token is withdrawn from the contract.
     */
    event NativeTokenWithdrawn(address indexed toAccount, uint256 balance);

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
        _swapRouterAddress = sRouter;
        _swapRouter = ISwapRouter(_swapRouterAddress);
    }

    /**
     * @param swapInfo  The swap information
     * @param amountIn  The amount of input tokens
     */
    function _swapTokens(
        SwapInfo memory swapInfo,
        uint256 amountIn
    ) internal returns (uint256 amountOut) {
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: swapInfo.tokenIn,
                tokenOut: swapInfo.tokenOut,
                fee: swapInfo.poolFee,
                recipient: _contractAddress,
                deadline: block.timestamp + 30, // 30 seconds after the swap is requested
                amountIn: amountIn,
                amountOutMinimum: 0, // Not needed, reverts if no profit
                sqrtPriceLimitX96: 0 // No price limit
            });

        // Approve the swap router to spend the input token
        TransferHelper.safeApprove(
            swapInfo.tokenIn,
            _swapRouterAddress,
            0
        );
        TransferHelper.safeApprove(
            swapInfo.tokenIn,
            _swapRouterAddress,
            amountIn
        );

        try _swapRouter.exactInputSingle(params) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch Error(string memory reason) {
            emit SwapError(_executionCounter, reason);
            revert(reason);
        }
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
        // require(msg.sender == _poolAddress, "malicious callback");
        require(
            amount < IERC20(asset).balanceOf(_contractAddress),
            "invalid balance"
        );

        ArbitInfo memory decoded = abi.decode(params, (ArbitInfo));
        uint256 swap1AmountOut = _swapTokens(decoded.swap1, amount);
        uint256 swap2AmountOut = _swapTokens(decoded.swap2, swap1AmountOut);
        uint256 swap3AmountOut = _swapTokens(decoded.swap3, swap2AmountOut);
        uint256 amountOwed = amount + premium;
        uint256 profit = swap3AmountOut - (amountOwed + decoded.extraCost);

        require(profit > 0, "not profitable");

        emit ArbitrageConcluded(
            _executionCounter,
            amount,
            swap1AmountOut,
            swap2AmountOut,
            swap3AmountOut,
            profit
        );

        TransferHelper.safeApprove(asset, _poolAddress, 0);
        TransferHelper.safeApprove(asset, _poolAddress, amountOwed);
        isSuccess = true;
    }

    /**
     * @dev Initiates a flash loan operation.
     *
     * Starts the process of borrowing assets via a flash loan, which must be
     * repaid within the same transaction block.
     *
     * @param data The arbitrage information.
     * @param tokenAIn The amount of the input token to borrow.
     */
    function initiateFlashLoan(
        ArbitInfo memory data,
        uint256 tokenAIn
    ) public payable onlyOwner {
        _executionCounter++;

        try
            POOL.flashLoanSimple(
                _contractAddress, // The receiver address
                data.swap1.tokenIn, // The asset to be borrowed
                tokenAIn, // The amount to be borrowed
                abi.encode(data), // The arbitrage data
                0
            )
        {} catch Error(string memory reason) {
            emit FlashloanError(_executionCounter, reason);
            revert(reason);
        }
    }

    function withdraw(address token) external payable onlyOwner {
        uint256 balance = IERC20(token).balanceOf(_contractAddress);
        require(balance != 0, "insufficient balance");
        TransferHelper.safeTransfer(token, owner(), balance);
        emit TokenWithdrawn(token, owner(), balance);
    }

    function withdrawNative() external payable onlyOwner {
        uint256 balance = _contractAddress.balance;
        require(balance != 0, "insufficient balance");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
        emit NativeTokenWithdrawn(owner(), balance);
    }

    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(_contractAddress);
    }

    function getExecutionCounter() external view returns (uint32) {
        return _executionCounter;
    }

    function getBalanceReceived() external view returns (uint256) {
        return _balanceReceived;
    }

    receive() external payable {
        _balanceReceived = _balanceReceived + msg.value;
    }
}
