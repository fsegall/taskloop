/**
 * Stellar testnet helpers used by the demo:
 *   - Friendbot funding for a freshly generated account
 *   - Sign + submit helpers using a local Keypair
 */

import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk';
import type { Horizon } from '@stellar/stellar-sdk';
import {
    getHorizonServer,
    getNetworkPassphrase,
    submitTransaction,
} from './lib/wallet/stellar.ts';
import type { StellarNetwork } from './lib/wallet/types.ts';

export async function fundWithFriendbot(publicKey: string): Promise<void> {
    const url = `https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`;
    console.log(`[Friendbot] GET ${url}`);
    const res = await fetch(url);
    const text = await res.text();
    console.log(`[Friendbot] Response (${res.status}):`, text.slice(0, 300));
    if (!res.ok) {
        throw new Error(`Friendbot failed (${res.status}): ${text}`);
    }
}

export async function loadAccount(publicKey: string, network: StellarNetwork) {
    const server = getHorizonServer(network);
    return server.loadAccount(publicKey);
}

export function signXdr(
    xdr: string,
    keypair: Keypair,
    network: StellarNetwork,
): string {
    const passphrase = getNetworkPassphrase(network);
    const tx = TransactionBuilder.fromXDR(xdr, passphrase);
    tx.sign(keypair);
    return tx.toXDR();
}

export async function signAndSubmit(
    xdr: string,
    keypair: Keypair,
    network: StellarNetwork,
): Promise<Horizon.HorizonApi.SubmitTransactionResponse> {
    const signed = signXdr(xdr, keypair, network);
    return submitTransaction(signed, network);
}
