from ape import project, accounts, networks
from argparse import ArgumentParser

############################################
# Deploy the contract to the Polygon network
# using the Alchemy provider.
############################################


def deploy_mainnet(account, provider):
    """"
    Deploy the contract to the mainnet.
    """
    # Connect to the Polygon network
    with networks.polygon.mainnet.use_provider(provider):
        # Deploy the contract
        contract = project.FlashLoanArbitrage.deploy(
            "0x...AddressProvider",  # Replace with actual address
            sender=account
        )
        print(f"Contract deployed at {contract.address}")

def deploy_testnet(account, provider):
    """"
    Deploy the contract to the testnet.
    """
    # Connect to the Polygon network
    with networks.polygon.testnet.use_provider(provider):
        # Deploy the contract
        contract = project.FlashLoanArbitrage.deploy(
            "0x...AddressProvider",  # Replace with actual address
            sender=account
        )
        print(f"Contract deployed at {contract.address}")

def main():
    # Required arguments to the deploy script: ["account"]
    # Optional arguments to the deploy script: ["provider", "test"]
    parser = ArgumentParser()
    parser.add_argument("account", help="The account to deploy the contract from", type=str, required=True)
    parser.add_argument("--provider", help="The provider to use for the deployment", type=str, default="alchemy")
    parser.add_argument("--test", help="Deploy the contract to the testnet", action="store_true", default=True)
    
    args = parser.parse_args()

    # Load the account
    account = accounts.load(args.account)

    # If the test flag is set, deploy to the testnet, otherwise deploy to the mainnet.
    if args.test:
        deploy_testnet(account, args.provider)
    else:
        deploy_mainnet(account, args.provider)