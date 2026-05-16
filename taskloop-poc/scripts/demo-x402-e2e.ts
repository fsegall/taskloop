import { Asset, Horizon, Keypair, Memo, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import process from "process";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_API_BASE_URL = "http://localhost:3000";
const DEFAULT_HORIZON_URL = "https://horizon-testnet.stellar.org";
const DEFAULT_ACCOUNT_ID = "demo-client-001";
const FRIENDBOT_URL = "https://friendbot.stellar.org";
const TEXT_MEMO_MAX_BYTES = 28;

type PaymentInstructions = {
  amount: string;
  asset: string;
  destination: string;
  memo: string;
  network: string;
  horizonUrl: string;
};

type UnlockRequest = {
  accountId: string;
  txHash?: string;
};

async function main(): Promise<void> {
  const [commandOrAccountId, ...restArgs] = process.argv.slice(2);

  if (commandOrAccountId === "pay") {
    await runPayOnlyMode(restArgs);
    return;
  }

  await runFullE2E(commandOrAccountId ?? DEFAULT_ACCOUNT_ID);
}

async function runFullE2E(accountId: string): Promise<void> {
  const apiBaseUrl = process.env.TASKLOOP_API_URL ?? DEFAULT_API_BASE_URL;

  console.log("TaskLoop x402 automated E2E demo");
  console.log("API BASE URL:", apiBaseUrl);
  console.log("ACCOUNT ID:", accountId);

  const firstAttempt = await requestDistributionUnlock(apiBaseUrl, { accountId });
  printApiResponse("Initial unlock request", firstAttempt.status, firstAttempt.payload);

  if (firstAttempt.status !== 402) {
    throw new Error(`Expected HTTP 402 on initial unlock request, but received ${firstAttempt.status}.`);
  }

  const payment = extractPaymentInstructions(firstAttempt.payload);
  const txHash = await sendXlmPayment({
    amount: payment.amount,
    destination: payment.destination,
    memo: payment.memo,
    horizonUrl: payment.horizonUrl,
  });

  console.log("\nReplaying unlock request with txHash proof...");

  const secondAttempt = await requestDistributionUnlock(apiBaseUrl, { accountId, txHash });
  printApiResponse("Verified unlock request", secondAttempt.status, secondAttempt.payload);

  if (secondAttempt.status !== 200) {
    throw new Error(`Expected HTTP 200 after submitting txHash proof, but received ${secondAttempt.status}.`);
  }

  console.log("\n✅ x402 E2E flow completed successfully.");
}

async function runPayOnlyMode(args: string[]): Promise<void> {
  const [amount, destination, memo] = args;

  if (!amount || !destination || !memo) {
    throw new Error(
      'Usage: npm run demo:x402:e2e -- pay <amount> <destination> <memo>. Example: npm run demo:x402:e2e -- pay 0.1 G... "taskloop-x402-abc123"',
    );
  }

  console.log("TaskLoop x402 payment helper");
  console.log("AMOUNT:", amount);
  console.log("DESTINATION:", destination);
  console.log("MEMO:", memo);

  await sendXlmPayment({
    amount,
    destination,
    memo,
    horizonUrl: process.env.STELLAR_HORIZON_URL ?? DEFAULT_HORIZON_URL,
  });
}

async function requestDistributionUnlock(
  apiBaseUrl: string,
  input: UnlockRequest,
): Promise<{ status: number; payload: unknown }> {
  const response = await fetch(`${apiBaseUrl}/x402/distribution/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as unknown;
  return {
    status: response.status,
    payload,
  };
}

async function sendXlmPayment(input: {
  amount: string;
  destination: string;
  memo: string;
  horizonUrl: string;
}): Promise<string> {
  const payer = loadPayerKeypair();
  const network = (process.env.STELLAR_NETWORK ?? "testnet").trim().toLowerCase();

  if (network !== "testnet") {
    throw new Error(`Unsupported STELLAR_NETWORK value: ${network}. This demo script currently supports only testnet.`);
  }

  assertValidAmount(input.amount);
  assertValidMemo(input.memo);

  const server = new Horizon.Server(input.horizonUrl);
  await ensureFundedOnTestnet(server, payer.publicKey(), "x402 client");

  const sourceAccount = await server.loadAccount(payer.publicKey());
  const baseFee = await server.fetchBaseFee();
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: baseFee.toString(),
    networkPassphrase: Networks.TESTNET,
  })
    .addMemo(Memo.text(input.memo))
    .addOperation(
      Operation.payment({
        destination: input.destination,
        amount: input.amount,
        asset: Asset.native(),
      }),
    )
    .setTimeout(30)
    .build();

  transaction.sign(payer);

  console.log("\nSubmitting Stellar Testnet payment...");
  console.log("PAYER PUBLIC KEY:", payer.publicKey());
  console.log("DESTINATION:", input.destination);
  console.log("AMOUNT:", input.amount);
  console.log("MEMO:", input.memo);

  const response = await server.submitTransaction(transaction);

  console.log("\n✅ Payment submitted successfully.");
  console.log("TRANSACTION HASH:", response.hash);
  console.log("EXPLORER:", `https://stellar.expert/explorer/testnet/tx/${response.hash}`);

  return response.hash;
}

function loadPayerKeypair(): Keypair {
  const secret = process.env.X402_CLIENT_SECRET?.trim();
  const publicKey = process.env.X402_CLIENT_PUBLIC?.trim();

  if (!secret) {
    throw new Error("Missing X402_CLIENT_SECRET in the environment.");
  }

  const keypair = Keypair.fromSecret(secret);

  if (publicKey && keypair.publicKey() !== publicKey) {
    throw new Error("X402_CLIENT_PUBLIC does not match X402_CLIENT_SECRET.");
  }

  return keypair;
}

function extractPaymentInstructions(payload: unknown): PaymentInstructions {
  const payment = (payload as { payment?: Partial<PaymentInstructions> } | null)?.payment;

  if (!payment) {
    throw new Error("x402 response did not include payment instructions.");
  }

  const amount = requireNonEmptyString(payment.amount, "payment.amount");
  const asset = requireNonEmptyString(payment.asset, "payment.asset");
  const destination = requireNonEmptyString(payment.destination, "payment.destination");
  const memo = requireNonEmptyString(payment.memo, "payment.memo");
  const network = requireNonEmptyString(payment.network, "payment.network");
  const horizonUrl = requireNonEmptyString(payment.horizonUrl, "payment.horizonUrl");

  if (asset !== "XLM") {
    throw new Error(`Unsupported x402 asset returned by API: ${asset}.`);
  }

  if (network.toLowerCase() !== "testnet") {
    throw new Error(`Unsupported x402 network returned by API: ${network}.`);
  }

  return {
    amount,
    asset,
    destination,
    memo,
    network,
    horizonUrl,
  };
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Field ${fieldName} is missing or invalid in the x402 response.`);
  }

  return value.trim();
}

function assertValidAmount(amount: string): void {
  const parsed = Number(amount);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid XLM amount provided: ${amount}.`);
  }
}

function assertValidMemo(memo: string): void {
  const length = Buffer.from(memo, "utf8").length;

  if (length > TEXT_MEMO_MAX_BYTES) {
    throw new Error(`Memo exceeds the Stellar text memo limit of ${TEXT_MEMO_MAX_BYTES} bytes.`);
  }
}

async function ensureFundedOnTestnet(server: Horizon.Server, publicKey: string, label: string): Promise<void> {
  try {
    await server.loadAccount(publicKey);
    console.log(`Existing ${label} account found on Testnet.`);
  } catch (error) {
    if (isNotFoundError(error)) {
      await fundWithFriendbot(publicKey, label);
      return;
    }

    throw error;
  }
}

async function fundWithFriendbot(publicKey: string, label: string): Promise<void> {
  console.log(`Funding ${label} account with Friendbot...`);

  const response = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Friendbot funding failed for ${label} account: ${body}`);
  }

  console.log(`Friendbot funded ${label} account.`);
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { response?: { status?: number } };
  return maybeError.response?.status === 404;
}

function printApiResponse(label: string, status: number, payload: unknown): void {
  console.log(`\n${label}`);
  console.log(`HTTP ${status}`);
  console.log(JSON.stringify(payload, null, 2));
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown x402 E2E demo error.";
  console.error("\n❌ x402 E2E demo failed:", message);
  process.exitCode = 1;
});
