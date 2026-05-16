import { Asset, Horizon, Keypair, Memo, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import process from "process";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_HORIZON_URL = "https://horizon-testnet.stellar.org";
const FRIENDBOT_URL = "https://friendbot.stellar.org";
const DEFAULT_AMOUNT = 1;
const DEFAULT_MEMO = "TaskLoop demo payout";
const TEXT_MEMO_MAX_BYTES = 28;

async function main(): Promise<void> {
  const network = (process.env.STELLAR_NETWORK ?? "testnet").trim().toLowerCase();
  if (network !== "testnet") {
    throw new Error(`Unsupported STELLAR_NETWORK value: ${network}. This demo script currently supports only testnet.`);
  }

  const horizonUrl = process.env.STELLAR_HORIZON_URL ?? DEFAULT_HORIZON_URL;
  const sourceSecret = process.env.STELLAR_SOURCE_SECRET?.trim();
  const sourcePublic = process.env.STELLAR_SOURCE_PUBLIC?.trim();

  if (!sourceSecret || !sourcePublic) {
    throw new Error("Missing STELLAR_SOURCE_SECRET or STELLAR_SOURCE_PUBLIC in the environment.");
  }

  const sourceKeypair = Keypair.fromSecret(sourceSecret);
  if (sourceKeypair.publicKey() !== sourcePublic) {
    throw new Error("STELLAR_SOURCE_PUBLIC does not match STELLAR_SOURCE_SECRET.");
  }

  const amount = resolveAmount(process.argv[2]);
  const memo = normalizeTextMemo(process.argv[3] ?? DEFAULT_MEMO);
  const server = new Horizon.Server(horizonUrl);
  const destinationKeypair = Keypair.random();

  console.log("TaskLoop Stellar Testnet demo");
  console.log("HORIZON URL:", horizonUrl);
  console.log("SOURCE PUBLIC KEY:", sourcePublic);
  console.log("DESTINATION PUBLIC KEY:", destinationKeypair.publicKey());
  console.log("AMOUNT:", amount);
  console.log("MEMO:", memo);

  await ensureFundedOnTestnet(server, sourcePublic, "source");
  await fundWithFriendbot(destinationKeypair.publicKey(), "destination");

  const sourceAccount = await server.loadAccount(sourcePublic);
  const baseFee = await server.fetchBaseFee();
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: baseFee.toString(),
    networkPassphrase: Networks.TESTNET,
  })
    .addMemo(Memo.text(memo))
    .addOperation(
      Operation.payment({
        destination: destinationKeypair.publicKey(),
        amount: formatStellarAmount(amount),
        asset: Asset.native(),
      }),
    )
    .setTimeout(30)
    .build();

  transaction.sign(sourceKeypair);

  const response = await server.submitTransaction(transaction);

  console.log("\n✅ Transaction submitted successfully!");
  console.log("TRANSACTION HASH:", response.hash);
  console.log("EXPLORER:", `https://stellar.expert/explorer/testnet/tx/${response.hash}`);
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

function resolveAmount(input: string | undefined): number {
  if (!input) {
    return DEFAULT_AMOUNT;
  }

  const amount = Number(input);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid amount provided: ${input}. Use a number greater than zero.`);
  }

  return amount;
}

function formatStellarAmount(amount: number): string {
  const fixedAmount = amount.toFixed(7);
  return fixedAmount.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function normalizeTextMemo(memo: string): string {
  const normalized = memo.trim() || DEFAULT_MEMO;

  if (Buffer.from(normalized, "utf8").length <= TEXT_MEMO_MAX_BYTES) {
    return normalized;
  }

  let truncated = normalized;
  while (Buffer.from(truncated, "utf8").length > TEXT_MEMO_MAX_BYTES) {
    truncated = truncated.slice(0, -1);
  }

  return truncated;
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { response?: { status?: number } };
  return maybeError.response?.status === 404;
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown demo payout error.";
  console.error("\n❌ Demo payout failed:", message);
  process.exitCode = 1;
});
