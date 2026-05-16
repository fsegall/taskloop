# stellar_testnet_payment.py

import requests
from stellar_sdk import (
    Keypair,
    Server,
    TransactionBuilder,
    Network,
    Asset,
)

HORIZON_URL = "https://horizon-testnet.stellar.org"
FRIENDBOT_URL = "https://friendbot.stellar.org"

server = Server(HORIZON_URL)

def fund_with_friendbot(public_key: str):
    response = requests.get(FRIENDBOT_URL, params={"addr": public_key}, timeout=20)
    response.raise_for_status()
    return response.json()

def main():
    # 1. Generate source and destination accounts
    source = Keypair.random()
    destination = Keypair.random()

    print("SOURCE PUBLIC KEY:", source.public_key)
    print("DESTINATION PUBLIC KEY:", destination.public_key)

    # WARNING:
# Exibindo secret keys apenas para fins de teste/debug na Testnet.
# Nunca exponha chaves privadas em ambientes de produção ou Mainnet.
    # print("SOURCE SECRET:", source.secret)
    # print("DESTINATION SECRET:", destination.secret)

    # 2. Fund both accounts on Stellar Testnet
    print("\nFunding source account...")
    fund_with_friendbot(source.public_key)

    print("Funding destination account...")
    fund_with_friendbot(destination.public_key)

    # 3. Load source account
    source_account = server.load_account(source.public_key)

    # 4. Build payment transaction
    transaction = (
        TransactionBuilder(
            source_account=source_account,
            network_passphrase=Network.TESTNET_NETWORK_PASSPHRASE,
            base_fee=server.fetch_base_fee(),
        )
        .add_text_memo("AILoop Sprint 1")
        .append_payment_op(
            destination=destination.public_key,
            amount="10",
            asset=Asset.native(),  # XLM
        )
        .set_timeout(30)
        .build()
    )

    # 5. Sign and submit
    transaction.sign(source)

    response = server.submit_transaction(transaction)

    print("\n✅ Transaction submitted successfully!")
    print("TRANSACTION HASH:", response["hash"])
    print("SOURCE PUBLIC KEY TO SUBMIT:", source.public_key)
    print("DESTINATION PUBLIC KEY:", destination.public_key)
    print(
        "EXPLORER:",
        f"https://stellar.expert/explorer/testnet/tx/{response['hash']}"
    )

if __name__ == "__main__":
    main()