export default [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "addressProvider",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "swapRouter",
				"type": "address"
			}
		],
		"stateMutability": "payable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "OwnableInvalidOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "OwnableUnauthorizedAccount",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"components": [
					{
						"components": [
							{
								"internalType": "address",
								"name": "router",
								"type": "address"
							},
							{
								"internalType": "address",
								"name": "tokenIn",
								"type": "address"
							},
							{
								"internalType": "address",
								"name": "tokenOut",
								"type": "address"
							},
							{
								"internalType": "uint24",
								"name": "poolFee",
								"type": "uint24"
							},
							{
								"internalType": "uint256",
								"name": "amountOutMinimum",
								"type": "uint256"
							}
						],
						"internalType": "struct FlashLoanArbitrage.SwapInfo",
						"name": "swap1",
						"type": "tuple"
					},
					{
						"components": [
							{
								"internalType": "address",
								"name": "router",
								"type": "address"
							},
							{
								"internalType": "address",
								"name": "tokenIn",
								"type": "address"
							},
							{
								"internalType": "address",
								"name": "tokenOut",
								"type": "address"
							},
							{
								"internalType": "uint24",
								"name": "poolFee",
								"type": "uint24"
							},
							{
								"internalType": "uint256",
								"name": "amountOutMinimum",
								"type": "uint256"
							}
						],
						"internalType": "struct FlashLoanArbitrage.SwapInfo",
						"name": "swap2",
						"type": "tuple"
					},
					{
						"components": [
							{
								"internalType": "address",
								"name": "router",
								"type": "address"
							},
							{
								"internalType": "address",
								"name": "tokenIn",
								"type": "address"
							},
							{
								"internalType": "address",
								"name": "tokenOut",
								"type": "address"
							},
							{
								"internalType": "uint24",
								"name": "poolFee",
								"type": "uint24"
							},
							{
								"internalType": "uint256",
								"name": "amountOutMinimum",
								"type": "uint256"
							}
						],
						"internalType": "struct FlashLoanArbitrage.SwapInfo",
						"name": "swap3",
						"type": "tuple"
					},
					{
						"internalType": "uint256",
						"name": "estimatedGasCost",
						"type": "uint256"
					}
				],
				"indexed": true,
				"internalType": "struct FlashLoanArbitrage.ArbitInfo",
				"name": "data",
				"type": "tuple"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "amountToBorrow",
				"type": "uint256"
			}
		],
		"name": "ArbitrageStart",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferStarted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "router",
						"type": "address"
					},
					{
						"internalType": "address",
						"name": "tokenIn",
						"type": "address"
					},
					{
						"internalType": "address",
						"name": "tokenOut",
						"type": "address"
					},
					{
						"internalType": "uint24",
						"name": "poolFee",
						"type": "uint24"
					},
					{
						"internalType": "uint256",
						"name": "amountOutMinimum",
						"type": "uint256"
					}
				],
				"indexed": true,
				"internalType": "struct FlashLoanArbitrage.SwapInfo",
				"name": "swapInfo",
				"type": "tuple"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "amountIn",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "amountOut",
				"type": "uint256"
			}
		],
		"name": "Swap",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "ADDRESSES_PROVIDER",
		"outputs": [
			{
				"internalType": "contract IPoolAddressesProvider",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "POOL",
		"outputs": [
			{
				"internalType": "contract IPool",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "acceptOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "asset",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "premium",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "bytes",
				"name": "params",
				"type": "bytes"
			}
		],
		"name": "executeOperation",
		"outputs": [
			{
				"internalType": "bool",
				"name": "isSucess",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			}
		],
		"name": "getBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"components": [
					{
						"components": [
							{
								"internalType": "address",
								"name": "router",
								"type": "address"
							},
							{
								"internalType": "address",
								"name": "tokenIn",
								"type": "address"
							},
							{
								"internalType": "address",
								"name": "tokenOut",
								"type": "address"
							},
							{
								"internalType": "uint24",
								"name": "poolFee",
								"type": "uint24"
							},
							{
								"internalType": "uint256",
								"name": "amountOutMinimum",
								"type": "uint256"
							}
						],
						"internalType": "struct FlashLoanArbitrage.SwapInfo",
						"name": "swap1",
						"type": "tuple"
					},
					{
						"components": [
							{
								"internalType": "address",
								"name": "router",
								"type": "address"
							},
							{
								"internalType": "address",
								"name": "tokenIn",
								"type": "address"
							},
							{
								"internalType": "address",
								"name": "tokenOut",
								"type": "address"
							},
							{
								"internalType": "uint24",
								"name": "poolFee",
								"type": "uint24"
							},
							{
								"internalType": "uint256",
								"name": "amountOutMinimum",
								"type": "uint256"
							}
						],
						"internalType": "struct FlashLoanArbitrage.SwapInfo",
						"name": "swap2",
						"type": "tuple"
					},
					{
						"components": [
							{
								"internalType": "address",
								"name": "router",
								"type": "address"
							},
							{
								"internalType": "address",
								"name": "tokenIn",
								"type": "address"
							},
							{
								"internalType": "address",
								"name": "tokenOut",
								"type": "address"
							},
							{
								"internalType": "uint24",
								"name": "poolFee",
								"type": "uint24"
							},
							{
								"internalType": "uint256",
								"name": "amountOutMinimum",
								"type": "uint256"
							}
						],
						"internalType": "struct FlashLoanArbitrage.SwapInfo",
						"name": "swap3",
						"type": "tuple"
					},
					{
						"internalType": "uint256",
						"name": "estimatedGasCost",
						"type": "uint256"
					}
				],
				"internalType": "struct FlashLoanArbitrage.ArbitInfo",
				"name": "data",
				"type": "tuple"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "initiateFlashLoan",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "pendingOwner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			}
		],
		"name": "withdraw",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "withdrawBNB",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	}
]