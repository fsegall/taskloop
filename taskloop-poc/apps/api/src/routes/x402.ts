import crypto from "crypto";
import dotenv from "dotenv";
import { Router } from "express";
import type { ApiErrorBody } from "../types";

dotenv.config();

const DEFAULT_HORIZON_URL = "https://horizon-testnet.stellar.org";
const DEFAULT_NETWORK = "testnet";
const DEFAULT_PRICE_XLM = "0.1";
const DEFAULT_MEMO_PREFIX = "taskloop-x402";
const DEFAULT_DISTRIBUTION_LIMIT_GRANTED = 100;
const TEXT_MEMO_MAX_BYTES = 28;

export const x402Router = Router();

x402Router.post("/distribution/unlock", async (req, res) => {
  const input = parseDistributionUnlockInput(req.body);
  if ("error" in input) {
    return res.status(400).json({ error: input.error } satisfies ApiErrorBody);
  }

  try {
    const paymentRequest = createDistributionUnlockPaymentRequest(input.accountId);

    if (!input.txHash) {
      return res.status(402).json(buildPaymentRequiredResponse(paymentRequest));
    }

    await verifyPaymentProof({
      txHash: input.txHash,
      destination: paymentRequest.destination,
      amount: paymentRequest.amount,
      memo: paymentRequest.memo,
      horizonUrl: paymentRequest.horizonUrl,
    });

    return res.json({
      premiumUnlocked: true,
      accountId: input.accountId,
      distributionLimitGranted: DEFAULT_DISTRIBUTION_LIMIT_GRANTED,
      txHash: input.txHash,
      payment: paymentRequest,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "x402 payment verification failed.";

    return res.status(402).json({
      error: "Payment required.",
      verificationError: message,
      payment:
        "error" in input
          ? undefined
          : buildPaymentRequiredResponse(createDistributionUnlockPaymentRequest(input.accountId)).payment,
      resource: {
        type: "distribution_unlock",
        distributionLimitGranted: DEFAULT_DISTRIBUTION_LIMIT_GRANTED,
      },
    });
  }
});

interface DistributionUnlockInput {
  accountId: string;
  txHash?: string | undefined;
}

interface DistributionUnlockPaymentRequest {
  amount: string;
  asset: "XLM";
  destination: string;
  memo: string;
  network: "testnet";
  horizonUrl: string;
}

function parseDistributionUnlockInput(body: unknown): DistributionUnlockInput | { error: string } {
  const input = (body ?? {}) as Partial<DistributionUnlockInput>;

  if (!isNonEmptyString(input.accountId)) {
    return { error: 'Field "accountId" is required.' };
  }

  if (input.txHash !== undefined && !isNonEmptyString(input.txHash)) {
    return { error: 'Field "txHash" must be a non-empty string when provided.' };
  }

  return {
    accountId: input.accountId.trim(),
    txHash: cleanOptionalString(input.txHash),
  };
}

function createDistributionUnlockPaymentRequest(accountId: string): DistributionUnlockPaymentRequest {
  const horizonUrl = process.env.STELLAR_HORIZON_URL ?? DEFAULT_HORIZON_URL;
  const network = (process.env.STELLAR_NETWORK ?? DEFAULT_NETWORK).trim().toLowerCase();
  const destination =
    cleanOptionalString(process.env.X402_RECEIVER_PUBLIC) ?? cleanOptionalString(process.env.STELLAR_SOURCE_PUBLIC);

  if (!destination) {
    throw new Error("Missing X402_RECEIVER_PUBLIC or STELLAR_SOURCE_PUBLIC for x402 payment destination.");
  }

  if (network !== "testnet") {
    throw new Error(`Unsupported STELLAR_NETWORK value: ${network}. TaskLoop x402 currently supports only testnet.`);
  }

  return {
    amount: normalizePrice(process.env.X402_PRICE_XLM ?? DEFAULT_PRICE_XLM),
    asset: "XLM",
    destination,
    memo: buildDistributionUnlockMemo(accountId),
    network: "testnet",
    horizonUrl,
  };
}

function buildDistributionUnlockMemo(accountId: string): string {
  const prefix = cleanOptionalString(process.env.X402_MEMO_PREFIX) ?? DEFAULT_MEMO_PREFIX;
  const shortHash = crypto.createHash("sha256").update(accountId).digest("hex").slice(0, 10);
  return trimMemoToTextLimit(`${prefix}-${shortHash}`);
}

function trimMemoToTextLimit(input: string): string {
  let memo = input.trim();

  while (Buffer.from(memo, "utf8").length > TEXT_MEMO_MAX_BYTES) {
    memo = memo.slice(0, -1);
  }

  return memo;
}

function normalizePrice(input: string): string {
  const parsed = Number(input);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid X402_PRICE_XLM value: ${input}.`);
  }

  const fixedAmount = parsed.toFixed(7);
  return fixedAmount.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function buildPaymentRequiredResponse(paymentRequest: DistributionUnlockPaymentRequest) {
  return {
    error: "Payment required.",
    payment: paymentRequest,
    resource: {
      type: "distribution_unlock",
      distributionLimitGranted: DEFAULT_DISTRIBUTION_LIMIT_GRANTED,
    },
  };
}

async function verifyPaymentProof(input: {
  txHash: string;
  destination: string;
  amount: string;
  memo: string;
  horizonUrl: string;
}): Promise<void> {
  const transactionResponse = await fetch(`${input.horizonUrl}/transactions/${encodeURIComponent(input.txHash)}`);
  if (!transactionResponse.ok) {
    throw new Error(`Could not load transaction ${input.txHash} from Horizon.`);
  }

  const transaction = (await transactionResponse.json()) as {
    successful?: boolean;
    memo_type?: string;
    memo?: string;
  };

  if (transaction.successful !== true) {
    throw new Error("Provided txHash does not reference a successful transaction.");
  }

  if (transaction.memo_type !== "text" || transaction.memo !== input.memo) {
    throw new Error("Provided txHash does not contain the expected x402 memo.");
  }

  const operationsResponse = await fetch(
    `${input.horizonUrl}/transactions/${encodeURIComponent(input.txHash)}/operations?limit=200`,
  );
  if (!operationsResponse.ok) {
    throw new Error(`Could not load operations for transaction ${input.txHash} from Horizon.`);
  }

  const operationsPayload = (await operationsResponse.json()) as {
    _embedded?: {
      records?: Array<{
        type?: string;
        to?: string;
        amount?: string;
        asset_type?: string;
      }>;
    };
  };

  const records = operationsPayload._embedded?.records ?? [];
  const paymentOperation = records.find((record) => record.type === "payment" && record.to === input.destination);

  if (!paymentOperation) {
    throw new Error("Provided txHash does not contain a payment to the expected destination.");
  }

  if (paymentOperation.asset_type !== "native") {
    throw new Error("Provided txHash does not pay the expected XLM asset.");
  }

  if (!paymentOperation.amount || Number(paymentOperation.amount) < Number(input.amount)) {
    throw new Error("Provided txHash does not pay the expected minimum XLM amount.");
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export default x402Router;

