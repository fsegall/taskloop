/**
 * Brazilian PIX on/off-ramp demo against the Etherfuse sandbox.
 *
 * Runs as a single Node.js script. Generates a fresh Stellar testnet keypair,
 * registers a customer with Etherfuse, completes programmatic KYC with mocked
 * Brazilian identity data, runs an on-ramp (BRL → TESOURO) using
 * simulateFiatReceived, then an off-ramp (TESOURO → BRL via PIX).
 */

import 'dotenv/config';
import { Keypair } from '@stellar/stellar-sdk';

import { EtherfuseClient } from './lib/anchors/etherfuse/index.ts';
import { AnchorError } from './lib/anchors/types.ts';
import type { KycStatus } from './lib/anchors/types.ts';
import {
    buildTrustlineTransaction,
    checkTrustline,
    getStellarAsset,
} from './lib/wallet/stellar.ts';
import type { StellarNetwork } from './lib/wallet/types.ts';

import { fundWithFriendbot, loadAccount, signAndSubmit } from './stellar.ts';
import { registerPixBankAccount } from './etherfuse-extras.ts';
import { MOCK } from './mock-identity.ts';
import { fail, info, ok, section, step } from './logger.ts';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const ETHERFUSE_API_KEY = required('ETHERFUSE_API_KEY');
const ETHERFUSE_BASE_URL = process.env.ETHERFUSE_BASE_URL || 'https://api.sand.etherfuse.com';
const STELLAR_NETWORK = (process.env.STELLAR_NETWORK || 'testnet') as StellarNetwork;

const ONRAMP_AMOUNT_BRL = '100';
const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 90_000;

function required(name: string): string {
    const v = process.env[name];
    if (!v) {
        console.error(`Missing required env var: ${name}. Copy .env.example to .env and fill it in.`);
        process.exit(1);
    }
    return v;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pollUntil<T>(
    label: string,
    fn: () => Promise<T>,
    done: (v: T) => boolean,
    opts: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<T> {
    const interval = opts.intervalMs ?? POLL_INTERVAL_MS;
    const timeout = opts.timeoutMs ?? POLL_TIMEOUT_MS;
    const deadline = Date.now() + timeout;
    let attempt = 0;
    let last: T | undefined;
    while (Date.now() < deadline) {
        attempt += 1;
        last = await fn();
        info(`${label} attempt ${attempt}: ${summarize(last)}`);
        if (done(last)) return last;
        await sleep(interval);
    }
    throw new Error(
        `Timed out after ${timeout}ms waiting for ${label}. Last value: ${summarize(last)}`,
    );
}

function summarize(v: unknown): string {
    if (v === null || v === undefined) return String(v);
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
        const o = v as Record<string, unknown>;
        const keys = ['status', 'id', 'orderId', 'kycStatus'];
        const picked: Record<string, unknown> = {};
        for (const k of keys) if (k in o) picked[k] = o[k];
        if (Object.keys(picked).length > 0) return JSON.stringify(picked);
        return JSON.stringify(v).slice(0, 200);
    }
    return String(v);
}

// -----------------------------------------------------------------------------
// Orchestrator
// -----------------------------------------------------------------------------

let currentStep = 0;

async function main() {
    section('Brazilian PIX on/off-ramp demo (Etherfuse sandbox + Stellar testnet)');
    info(`ETHERFUSE_BASE_URL=${ETHERFUSE_BASE_URL}`);
    info(`STELLAR_NETWORK=${STELLAR_NETWORK}`);

    const client = new EtherfuseClient({
        apiKey: ETHERFUSE_API_KEY,
        baseUrl: ETHERFUSE_BASE_URL,
    });

    // ---------------------------------------------------------------- Stellar
    currentStep = 1;
    step(1, 'Generate Stellar testnet keypair');
    const keypair = Keypair.random();
    const publicKey = keypair.publicKey();
    const secret = keypair.secret();
    ok(`publicKey=${publicKey}`);
    info(`secret=${secret}`);

    currentStep = 2;
    step(2, 'Fund the new account via Friendbot');
    await fundWithFriendbot(publicKey);
    ok('Friendbot returned 200');

    currentStep = 3;
    step(3, 'Verify the account exists on Horizon');
    const account = await loadAccount(publicKey, STELLAR_NETWORK);
    ok(`Account loaded, sequence=${account.sequenceNumber()}`);

    // -------------------------------------------------------------- Etherfuse
    const email = MOCK.email();

    currentStep = 4;
    step(4, 'Create Etherfuse customer');
    const customer = await client.createCustomer({
        email,
        publicKey,
        country: 'BR',
    });
    ok(`customerId=${customer.id}  bankAccountId=${customer.bankAccountId ?? '(none)'}`);
    if (!customer.bankAccountId) {
        throw new Error('Etherfuse did not return a bankAccountId — cannot continue');
    }

    currentStep = 5;
    step(5, 'Get presigned onboarding URL');
    const presignedUrl = await client.getKycUrl(customer.id, publicKey, customer.bankAccountId);
    ok(`presignedUrl length=${presignedUrl.length}`);

    currentStep = 6;
    step(6, 'Submit programmatic KYC identity (Brazilian mock data)');
    // Etherfuse's /ramp/customer/{id}/kyc endpoint actually accepts `email`,
    // `phoneNumber`, and `occupation` inside the `identity` object — these are
    // required for the customer-agreement step downstream — but the typed
    // EtherfuseKycIdentityRequest in the copied library omits them. We pass
    // them via a cast rather than modifying the library.
    const identityPayload = {
        pubkey: publicKey,
        identity: {
            id: publicKey,
            email,
            phoneNumber: MOCK.phone,
            occupation: 'Software Engineer',
            name: { givenName: MOCK.firstName, familyName: MOCK.familyName },
            dateOfBirth: MOCK.dateOfBirth,
            address: {
                street: MOCK.address.street,
                city: MOCK.address.city,
                region: MOCK.address.region,
                postalCode: MOCK.address.postalCode,
                country: MOCK.address.country,
            },
            idNumbers: [{ value: MOCK.cpf, type: 'CPF' }],
        },
    };
    await client.submitKycIdentity(
        customer.id,
        identityPayload as unknown as Parameters<typeof client.submitKycIdentity>[1],
    );
    ok('KYC identity submitted');

    currentStep = 7;
    step(7, 'Upload KYC document images (placeholder)');
    await client.submitKycDocuments(customer.id, {
        pubkey: publicKey,
        documentType: 'document',
        images: [
            { label: 'id_front', image: MOCK.placeholderImage },
            { label: 'id_back', image: MOCK.placeholderImage },
        ],
    });
    ok('ID images uploaded');
    await client.submitKycDocuments(customer.id, {
        pubkey: publicKey,
        documentType: 'selfie',
        images: [{ label: 'selfie', image: MOCK.placeholderImage }],
    });
    ok('Selfie uploaded');

    currentStep = 8;
    step(8, 'Accept all 3 legal agreements');
    await client.acceptAgreements(presignedUrl);
    ok('Agreements accepted (electronic signature, T&C, customer agreement)');

    currentStep = 9;
    step(9, 'Poll KYC status until approved');
    const kyc = await pollUntil<KycStatus>(
        'KYC status',
        () => client.getKycStatus(customer.id, publicKey),
        (s) => s === 'approved',
    );
    ok(`KYC status=${kyc}`);

    // The auto-generated bankAccountId from createCustomer is a placeholder
    // stub that hosted onboarding would normally fill in. The on-ramp endpoint
    // rejects it as "Proxy account not found" until we register the actual PIX
    // details against it via POST /ramp/bank-account. We do that here, before
    // either ramp, so the same bankAccountId can be used for both directions.
    step(9, 'Register PIX bank account (fills in the stub from createCustomer)');
    const bank = await registerPixBankAccount({
        apiKey: ETHERFUSE_API_KEY,
        baseUrl: ETHERFUSE_BASE_URL,
        presignedUrl,
        pixKey: MOCK.pixKey,
        pixKeyType: MOCK.pixKeyType,
        firstName: MOCK.firstName,
        lastName: MOCK.familyName,
        cpf: MOCK.cpf,
    });
    const bankAccountId = bank.accountId;
    ok(`bankAccountId=${bankAccountId}  status=${bank.status}`);

    // ----------------------------------------------------------- Assets/trust
    currentStep = 10;
    step(10, 'Resolve TESOURO asset identifier for testnet via /ramp/assets');
    const assets = await client.getAssets('stellar', 'brl', publicKey);
    info(`Available assets: ${assets.assets.map((a) => `${a.symbol}=${a.identifier}`).join(', ')}`);
    const tesouro = assets.assets.find((a) => a.symbol.toUpperCase() === 'TESOURO');
    if (!tesouro) {
        throw new Error(
            `TESOURO not present in /ramp/assets response. Got: ${assets.assets.map((a) => a.symbol).join(', ')}`,
        );
    }
    const [tesouroCode, tesouroIssuer] = tesouro.identifier.split(':');
    if (!tesouroCode || !tesouroIssuer) {
        throw new Error(`Unexpected TESOURO identifier format: ${tesouro.identifier}`);
    }
    ok(`TESOURO=${tesouroCode}:${tesouroIssuer}`);
    const tesouroAsset = getStellarAsset(tesouroCode, tesouroIssuer);

    currentStep = 11;
    step(11, 'Establish trustline for TESOURO');
    const before = await checkTrustline(publicKey, tesouroAsset, STELLAR_NETWORK);
    if (before.hasTrustline) {
        ok('Trustline already present');
    } else {
        const xdr = await buildTrustlineTransaction({
            sourcePublicKey: publicKey,
            asset: tesouroAsset,
            network: STELLAR_NETWORK,
        });
        const submitted = await signAndSubmit(xdr, keypair, STELLAR_NETWORK);
        ok(`Trustline tx hash=${submitted.hash}`);
    }

    // ------------------------------------------------------------- On-ramp
    currentStep = 12;
    step(12, `Get on-ramp quote (BRL → TESOURO, amount=${ONRAMP_AMOUNT_BRL})`);
    const onQuote = await client.getQuote({
        fromCurrency: 'BRL',
        toCurrency: 'TESOURO',
        fromAmount: ONRAMP_AMOUNT_BRL,
        customerId: customer.id,
        stellarAddress: publicKey,
    });
    ok(
        `quoteId=${onQuote.id}  rate=${onQuote.exchangeRate}  toAmount=${onQuote.toAmount}  fee=${onQuote.fee}  expiresAt=${onQuote.expiresAt}`,
    );

    currentStep = 13;
    step(13, 'Create on-ramp order');
    const onRamp = await client.createOnRamp({
        customerId: customer.id,
        quoteId: onQuote.id,
        stellarAddress: publicKey,
        fromCurrency: 'BRL',
        toCurrency: tesouro.identifier,
        amount: ONRAMP_AMOUNT_BRL,
        bankAccountId,
    });
    ok(`on-ramp orderId=${onRamp.id}`);
    if (onRamp.paymentInstructions?.type === 'pix') {
        info(`PIX key=${onRamp.paymentInstructions.pixKey ?? '(none)'}`);
        info(`PIX code (BR-Code)=${onRamp.paymentInstructions.pixCode.slice(0, 80)}…`);
    } else {
        info(`paymentInstructions=${JSON.stringify(onRamp.paymentInstructions)}`);
    }

    currentStep = 14;
    step(14, 'Simulate fiat received (sandbox endpoint)');
    const simStatus = await client.simulateFiatReceived(onRamp.id);
    if (simStatus !== 200) {
        throw new Error(`simulateFiatReceived returned non-200: ${simStatus}`);
    }
    ok('simulateFiatReceived returned 200');

    currentStep = 15;
    step(15, 'Poll on-ramp order until completed (sandbox can be slow — up to 10 min)');
    const completedOnRamp = await pollUntil(
        'on-ramp status',
        async () => {
            const tx = await client.getOnRampTransaction(onRamp.id);
            if (!tx) throw new Error('on-ramp order not found');
            return tx;
        },
        (tx) => tx.status === 'completed',
        { intervalMs: 10_000, timeoutMs: 600_000 },
    );
    ok(`on-ramp completed  stellarTxHash=${completedOnRamp.stellarTxHash ?? '(none)'}`);

    currentStep = 16;
    step(16, 'Verify TESOURO balance on Stellar');
    const after = await checkTrustline(publicKey, tesouroAsset, STELLAR_NETWORK);
    if (!after.hasTrustline || Number(after.balance) <= 0) {
        throw new Error(
            `Expected positive TESOURO balance after on-ramp. trustline=${after.hasTrustline} balance=${after.balance}`,
        );
    }
    ok(`TESOURO balance=${after.balance}`);

    // ------------------------------------------------------------- Off-ramp
    // Off-ramp half of what we received, rounded down to 2 decimals.
    currentStep = 17;
    const balanceNum = Number(after.balance);
    const offAmount = (Math.floor((balanceNum / 2) * 100) / 100).toFixed(2);
    if (Number(offAmount) <= 0) {
        throw new Error(`Computed off-ramp amount is not positive: balance=${after.balance}`);
    }

    currentStep = 18;
    step(18, `Get off-ramp quote (TESOURO → BRL, amount=${offAmount})`);
    const offQuote = await client.getQuote({
        fromCurrency: 'TESOURO',
        toCurrency: 'BRL',
        fromAmount: offAmount,
        customerId: customer.id,
        stellarAddress: publicKey,
    });
    ok(
        `quoteId=${offQuote.id}  rate=${offQuote.exchangeRate}  toAmount=${offQuote.toAmount}  fee=${offQuote.fee}  expiresAt=${offQuote.expiresAt}`,
    );

    step(18, 'Create off-ramp order');
    const offRamp = await client.createOffRamp({
        customerId: customer.id,
        quoteId: offQuote.id,
        stellarAddress: publicKey,
        fromCurrency: tesouro.identifier,
        toCurrency: 'BRL',
        amount: offAmount,
        fiatAccountId: bankAccountId,
    });
    ok(`off-ramp orderId=${offRamp.id}`);

    currentStep = 19;
    step(19, 'Poll for signable burn transaction (deferred signing)');
    const ready = await pollUntil(
        'off-ramp signableTransaction',
        async () => {
            const tx = await client.getOffRampTransaction(offRamp.id);
            if (!tx) throw new Error('off-ramp order not found');
            return tx;
        },
        (tx) => Boolean(tx.signableTransaction),
        { timeoutMs: 120_000 },
    );
    const xdr = ready.signableTransaction!;
    ok(`signableTransaction received (${xdr.length} chars)`);

    step(19, 'Sign and submit burn transaction');
    const submitted = await signAndSubmit(xdr, keypair, STELLAR_NETWORK);
    ok(`burn tx hash=${submitted.hash}`);

    currentStep = 20;
    step(
        20,
        'Poll off-ramp order until Etherfuse confirms the burn (processing) or completes the payout (completed)',
    );
    // Etherfuse maps the burn-confirmed state to `processing` (their `funded`).
    // In the sandbox the PIX payout to a real Brazilian bank can't actually
    // happen, so the order may sit in `processing` indefinitely. We accept
    // that as the final user-controllable state and give it ~3 minutes to
    // reach `completed` in case the sandbox auto-progresses.
    const finalOffRamp = await pollUntil(
        'off-ramp status',
        async () => {
            const tx = await client.getOffRampTransaction(offRamp.id);
            if (!tx) throw new Error('off-ramp order not found');
            return tx;
        },
        (tx) => tx.status === 'completed' || tx.status === 'processing',
        { timeoutMs: 180_000 },
    );
    if (finalOffRamp.status === 'completed') {
        ok(`off-ramp completed  statusPage=${finalOffRamp.statusPage ?? '(none)'}`);
    } else {
        ok(
            `off-ramp burn confirmed by Etherfuse (status=processing); sandbox PIX payout will not actually settle to a real bank.`,
        );
        info(`statusPage=${finalOffRamp.statusPage ?? '(none)'}`);
    }

    // ---------------------------------------------------------------- Summary
    section('Demo completed successfully');
    info(`publicKey=${publicKey}`);
    info(`secret=${secret}`);
    info(`customerId=${customer.id}`);
    info(`bankAccountId=${bankAccountId}`);
    info(`on-ramp orderId=${onRamp.id}  stellarTxHash=${completedOnRamp.stellarTxHash ?? '-'}`);
    info(`off-ramp orderId=${offRamp.id}  burn txHash=${submitted.hash}  finalStatus=${finalOffRamp.status}`);
}

main().catch((err) => {
    section(`FAILED on step ${currentStep}`);
    if (err instanceof AnchorError) {
        fail(`AnchorError code=${err.code} statusCode=${err.statusCode}`, err);
    } else {
        fail('Unhandled error', err);
    }
    process.exit(1);
});
