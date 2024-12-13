// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {TransferHelper} from "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

/**
 * @title Flash-Loan Arbitrage Contract
 * @notice This is an arbitrage contract that uses AAVE v3 flash loans to make a profit on Uniswap v3.
 */
contract UniswapV3Arbitrage is FlashLoanSimpleReceiverBase, Ownable2Step {
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
        int256 profit
    );

    /**
     * @dev Event emitted when a flash loan error occurs.
     *
     * @param executionId The execution identifier number (counter)
     * @param message The error message
     */
    event FlashloanError(uint32 indexed executionId, string message);

    /**
     * @dev Event emitted when a flash loan is successful.
     *
     * @param executionId The execution identifier number (counter)
     * @param amount The amount of the flash loan
     */
    event FlashLoanSuccess(uint32 indexed executionId, uint256 amount);

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
    struct ArbitrageInfo {
        SwapInfo swap1;
        SwapInfo swap2;
        SwapInfo swap3;
        uint256 extraCost; // in input token
    }

    /**
     * @param addressProvider  The AAVE Pool Address Provider address.
     * @param sRouter          The Uniswap v3 router address.
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
        require(
            amount <= IERC20(asset).balanceOf(_contractAddress),
            "invalid balance"
        );
        ArbitrageInfo memory decoded = abi.decode(params, (ArbitrageInfo));
        uint256 swap1AmountOut;
        uint256 swap2AmountOut;
        uint256 swap3AmountOut;

        ISwapRouter.ExactInputParams memory swapParams = ISwapRouter.ExactInputParams({
            path: abi.encodePacked(
                decoded.swap1.tokenIn,
                decoded.swap1.poolFee,
                decoded.swap2.tokenIn,
                decoded.swap2.poolFee,
                decoded.swap3.tokenIn,
                decoded.swap3.poolFee,
                asset
            ),
            recipient: _contractAddress,
            deadline: block.timestamp,
            amountIn: amount,
            amountOutMinimum: 0
        });

        swap3AmountOut = _swapRouter.exactInput(swapParams);

        uint256 amountOwned = amount + premium;

        int256 profit = int256(
            swap3AmountOut - (amountOwned + decoded.extraCost)
        );

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
        TransferHelper.safeApprove(asset, _poolAddress, amountOwned);
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
        ArbitrageInfo memory data,
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
        {
            emit FlashLoanSuccess(_executionCounter, tokenAIn);
        } catch Error(string memory reason) {
            emit FlashloanError(_executionCounter, reason);
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
        TransferHelper.safeTransferETH(owner(), balance);
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
