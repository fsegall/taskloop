import {
  Asset,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import dotenv from "dotenv";
import type { PayoutExecutionResult, StellarPayoutRequest } from "../types";

dotenv.config();

const DEFAULT_HORIZON_URL = "https://horizon-testnet.stellar.org";
const DEFAULT_NETWORK = "testnet";
const TEXT_MEMO_MAX_BYTES = 28;

export interface StellarClient {
  sendPayment(request: StellarPayoutRequest): Promise<PayoutExecutionResult>;
}

interface StellarRuntimeConfig {
  horizonUrl: string;
  network: string;
  networkPassphrase: string;
  sourcePublic?: string | undefined;
  sourceSecret?: string | undefined;
  useMock: boolean;
}

function createMockTxHash(): string {
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`;
}

class MockStellarTestnetClient implements StellarClient {
  async sendPayment(_request: StellarPayoutRequest): Promise<PayoutExecutionResult> {
    return {
      provider: "stellar-testnet-mock",
      status: "paid",
      txHash: createMockTxHash(),
      processedAt: new Date().toISOString(),
    };
  }
}

class HorizonStellarTestnetClient implements StellarClient {
  constructor(private readonly runtimeConfig: StellarRuntimeConfig) {}

  async sendPayment(request: StellarPayoutRequest): Promise<PayoutExecutionResult> {
    if (!request.destination) {
      throw new Error("Submission walletAddress is required for Stellar payout.");
    }

    if (request.currency !== "XLM") {
      throw new Error(`TaskLoop POC currently supports only XLM payouts. Received currency: ${request.currency}.`);
    }

    const sourcePublic = this.runtimeConfig.sourcePublic;
    const sourceSecret = this.runtimeConfig.sourceSecret;

    if (!sourcePublic || !sourceSecret) {
      throw new Error("Missing STELLAR_SOURCE_PUBLIC or STELLAR_SOURCE_SECRET for real Stellar payout.");
    }

    try {
      const sourceKeypair = Keypair.fromSecret(sourceSecret);

      if (sourceKeypair.publicKey() !== sourcePublic) {
        throw new Error("STELLAR_SOURCE_PUBLIC does not match STELLAR_SOURCE_SECRET.");
      }

      const server = new Horizon.Server(this.runtimeConfig.horizonUrl);
      const sourceAccount = await server.loadAccount(sourcePublic);
      const baseFee = await server.fetchBaseFee();
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: baseFee.toString(),
        networkPassphrase: this.runtimeConfig.networkPassphrase,
      })
        .addMemo(Memo.text(normalizeTextMemo(request.memo)))
        .addOperation(
          Operation.payment({
            destination: request.destination,
            amount: formatStellarAmount(request.amount),
            asset: Asset.native(),
          }),
        )
        .setTimeout(30)
        .build();

      transaction.sign(sourceKeypair);

      const response = await server.submitTransaction(transaction);

      return {
        provider: "stellar-testnet",
        status: "paid",
        txHash: response.hash,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(extractStellarErrorMessage(error));
    }
  }
}

function getRuntimeConfig(): StellarRuntimeConfig {
  const network = (process.env.STELLAR_NETWORK ?? DEFAULT_NETWORK).trim().toLowerCase();
  const useMock = process.env.STELLAR_USE_MOCK === "true";

  return {
    horizonUrl: process.env.STELLAR_HORIZON_URL ?? DEFAULT_HORIZON_URL,
    network,
    networkPassphrase: resolveNetworkPassphrase(network),
    sourcePublic: process.env.STELLAR_SOURCE_PUBLIC?.trim(),
    sourceSecret: process.env.STELLAR_SOURCE_SECRET?.trim(),
    useMock,
  };
}

function resolveNetworkPassphrase(network: string): string {
  if (network === "testnet") {
    return Networks.TESTNET;
  }

  throw new Error(`Unsupported STELLAR_NETWORK value: ${network}. TaskLoop POC currently supports only testnet.`);
}

function formatStellarAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Stellar payout amount must be greater than zero.");
  }

  const fixedAmount = amount.toFixed(7);
  return fixedAmount.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function normalizeTextMemo(memo: string): string {
  const normalized = memo.trim() || "TaskLoop payout";

  if (Buffer.from(normalized, "utf8").length <= TEXT_MEMO_MAX_BYTES) {
    return normalized;
  }

  let truncated = normalized;
  while (Buffer.from(truncated, "utf8").length > TEXT_MEMO_MAX_BYTES) {
    truncated = truncated.slice(0, -1);
  }

  return truncated;
}

function extractStellarErrorMessage(error: unknown): string {
  const fallbackMessage = "Stellar payout failed while communicating with Horizon Testnet.";

  if (!error || typeof error !== "object") {
    return fallbackMessage;
  }

  const horizonError = error as {
    response?: {
      status?: number;
      data?: {
        title?: string;
        detail?: string;
        extras?: {
          result_codes?: {
            transaction?: string;
            operations?: string[];
          };
        };
      };
    };
    message?: string;
  };

  const resultCodes = horizonError.response?.data?.extras?.result_codes;
  const detail = horizonError.response?.data?.detail;
  const title = horizonError.response?.data?.title;

  if (resultCodes) {
    const operationCodes = resultCodes.operations?.join(", ") ?? "unknown_operation_code";
    return `Stellar payout failed: ${resultCodes.transaction ?? "unknown_transaction_code"} (${operationCodes}).`;
  }

  if (detail || title) {
    return `Stellar payout failed: ${[title, detail].filter(Boolean).join(" - ")}.`;
  }

  if (typeof horizonError.message === "string" && horizonError.message.trim().length > 0) {
    return `Stellar payout failed: ${horizonError.message}`;
  }

  return fallbackMessage;
}

function createStellarClient(): StellarClient {
  const runtimeConfig = getRuntimeConfig();

  if (runtimeConfig.useMock) {
    console.warn("STELLAR_USE_MOCK=true detected. Using mock Stellar client.");
    return new MockStellarTestnetClient();
  }

  if (!runtimeConfig.sourcePublic || !runtimeConfig.sourceSecret) {
    console.warn("Stellar source keys are missing. Falling back to mock Stellar client until env vars are configured.");
    return new MockStellarTestnetClient();
  }

  return new HorizonStellarTestnetClient(runtimeConfig);
}

export const stellarClient: StellarClient = createStellarClient();
