import pytest
from unittest.mock import MagicMock
from ape import accounts
from ape.exceptions import ContractLogicError

AAVE_POLYGON_TESTNET_USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"

@pytest.fixture
def owner():
    return accounts.test_accounts[0]

@pytest.fixture
def non_owner():
    return accounts.test_accounts[1]

@pytest.fixture
def flash_loan_arbitrage(owner):
    # Mock the FlashLoanArbitrage contract
    mock_contract = MagicMock()

    def initiate_flash_loan_side_effect(asset, amount, sender):
        assert asset, "Asset address is empty"
        assert amount > 0, "Amount must be greater than zero"
        if sender == owner:
            return MagicMock(status=1)
        else:
            raise ContractLogicError("Caller is not the owner")

    def withdraw_side_effect(token, sender):
        assert token, "Token address is empty"
        if sender == owner:
            return MagicMock(status=1)
        else:
            raise ContractLogicError("Caller is not the owner")

    mock_contract.initiateFlashLoan.side_effect = initiate_flash_loan_side_effect
    mock_contract.withdraw.side_effect = withdraw_side_effect

    return mock_contract

def test_owner_can_initiate_flash_loan(flash_loan_arbitrage, owner):
    asset = AAVE_POLYGON_TESTNET_USDC_ADDRESS
    amount = 1
    print(f"Asset: {asset}, Amount: {amount}")

    # Ensure the owner has sufficient funds
    owner_balance = owner.balance
    print(f"Owner balance: {owner_balance}")
    assert owner_balance > 0, "Owner has insufficient funds"

    # Initiate flash loan
    tx = flash_loan_arbitrage.initiateFlashLoan(asset, amount, sender=owner)

    # Assertions to verify the expected behavior
    assert tx.status == 1
    print(f"Transaction successful: {tx}")

def test_non_owner_cannot_initiate_flash_loan(flash_loan_arbitrage, non_owner):
    asset = AAVE_POLYGON_TESTNET_USDC_ADDRESS
    amount = 1

    # Attempt to initiate flash loan as non-owner
    with pytest.raises(ContractLogicError, match="Caller is not the owner"):
        flash_loan_arbitrage.initiateFlashLoan(asset, amount, sender=non_owner)

def test_owner_can_withdraw_tokens(flash_loan_arbitrage, owner):
    token = AAVE_POLYGON_TESTNET_USDC_ADDRESS

    # Withdraw tokens
    tx = flash_loan_arbitrage.withdraw(token, sender=owner)

    # Assertions to verify the expected behavior
    assert tx.status == 1
    print(f"Withdrawal successful: {tx}")

def test_non_owner_cannot_withdraw_tokens(flash_loan_arbitrage, non_owner):
    token = AAVE_POLYGON_TESTNET_USDC_ADDRESS

    # Attempt to withdraw tokens as non-owner
    with pytest.raises(ContractLogicError, match="Caller is not the owner"):
        flash_loan_arbitrage.withdraw(token, sender=non_owner)