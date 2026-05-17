import axios, { AxiosError, type AxiosInstance } from "axios";
import dotenv from "dotenv";
import { randomUUID } from "crypto";

dotenv.config();

const DEFAULT_BASE_URL = "https://api.sand.etherfuse.com";
const DEFAULT_BLOCKCHAIN = "stellar";
const DEFAULT_CURRENCY = "mxn";

type EtherfuseBlockchain = "stellar" | "solana" | "base" | "polygon" | "monad";
type EtherfuseOrderStatus = "created" | "funded" | "completed" | "finalized" | "failed" | "refunded" | "canceled";

type EtherfuseQuoteAssets = {
  type: "onramp" | "offramp" | "swap";
  sourceAsset: string;
  targetAsset: string;
};

export interface EtherfuseRampableAsset {
  symbol: string;
  identifier: string;
  name: string;
  currency: string;
  balance?: string | null;
  image?: string | null;
}

export interface EtherfuseListAssetsInput {
  wallet: string;
  blockchain?: EtherfuseBlockchain | undefined;
  currency?: string | undefined;
}

export interface EtherfuseQuoteInput {
  quoteId?: string | undefined;
  customerId: string;
  blockchain?: EtherfuseBlockchain | undefined;
  quoteAssets: EtherfuseQuoteAssets;
  sourceAmount: string;
  walletAddress?: string | undefined;
  partnerFeeBps?: number | undefined;
}

export interface EtherfuseQuote {
  quoteId: string;
  blockchain: EtherfuseBlockchain;
  quoteAssets: EtherfuseQuoteAssets;
  sourceAmount: string;
  destinationAmount: string;
  destinationAmountAfterFee?: string | null | undefined;
  exchangeRate: string;
  etherfuseMidMarketRate?: string | null | undefined;
  feeBps?: string | null | undefined;
  feeAmount?: string | null | undefined;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  raw: unknown;
}

export interface EtherfuseCreateOrderInput {
  orderId?: string | undefined;
  bankAccountId: string;
  quoteId: string;
  publicKey?: string | undefined;
  cryptoWalletId?: string | undefined;
  memo?: string | undefined;
  useAnchor?: boolean | undefined;
}

export interface EtherfuseOrderReceipt {
  orderId: string;
  orderType: "onramp" | "offramp";
  isAnchorOrder: boolean;
  depositClabe?: string | null | undefined;
  depositAmount?: number | null | undefined;
  depositBankName?: string | null | undefined;
  depositAccountHolder?: string | null | undefined;
  withdrawAnchorAccount?: string | null | undefined;
  withdrawMemo?: string | null | undefined;
  withdrawMemoType?: string | null | undefined;
  raw: unknown;
}

export interface EtherfuseOrderDetails {
  orderId: string;
  customerId?: string | null | undefined;
  status: EtherfuseOrderStatus;
  orderType: "onramp" | "offramp";
  isAnchorOrder: boolean;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
  completedAt?: string | null | undefined;
  amountInFiat?: number | null | undefined;
  amountInTokens?: number | null | undefined;
  confirmedTxSignature?: string | null | undefined;
  walletId?: string | null | undefined;
  bankAccountId?: string | null | undefined;
  withdrawAnchorAccount?: string | null | undefined;
  withdrawMemo?: string | null | undefined;
  withdrawMemoType?: string | null | undefined;
  statusPage?: string | null | undefined;
  sourceAsset?: string | null | undefined;
  targetAsset?: string | null | undefined;
  raw: unknown;
}

export interface EtherfuseClient {
  listRampableAssets(input: EtherfuseListAssetsInput): Promise<EtherfuseRampableAsset[]>;
  createQuote(input: EtherfuseQuoteInput): Promise<EtherfuseQuote>;
  createOrder(input: EtherfuseCreateOrderInput): Promise<EtherfuseOrderReceipt>;
  getOrder(orderId: string): Promise<EtherfuseOrderDetails>;
}

interface RuntimeConfig {
  baseUrl: string;
  apiKey?: string | undefined;
  useMock: boolean;
}

class MockEtherfuseClient implements EtherfuseClient {
  async listRampableAssets(input: EtherfuseListAssetsInput): Promise<EtherfuseRampableAsset[]> {
    return [
      {
        symbol: "USDC",
        identifier: "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
        name: "USD Coin",
        currency: "usd",
        balance: input.wallet ? "100.00" : null,
      },
      {
        symbol: "CETES",
        identifier: "CETES:GCRYUGD5NVARGXT56XEZI5CIFCQETYHAPQQTHO203IQZTHDHH4LATMYWC",
        name: "CETES",
        currency: "mxn",
        balance: input.wallet ? "50.00" : null,
      },
    ];
  }

  async createQuote(input: EtherfuseQuoteInput): Promise<EtherfuseQuote> {
    const now = new Date().toISOString();

    return {
      quoteId: input.quoteId ?? randomUUID(),
      blockchain: input.blockchain ?? DEFAULT_BLOCKCHAIN,
      quoteAssets: input.quoteAssets,
      sourceAmount: input.sourceAmount,
      destinationAmount: input.sourceAmount,
      destinationAmountAfterFee: input.sourceAmount,
      exchangeRate: "1",
      etherfuseMidMarketRate: "1",
      feeBps: "0",
      feeAmount: "0",
      expiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
      raw: { mocked: true },
    };
  }

  async createOrder(input: EtherfuseCreateOrderInput): Promise<EtherfuseOrderReceipt> {
    const orderId = input.orderId ?? randomUUID();

    return {
      orderId,
      orderType: "offramp",
      isAnchorOrder: input.useAnchor !== false,
      withdrawAnchorAccount: input.useAnchor === false ? null : "GABPM7AXXSE27X3NIN5IVSFCW5AWQLF3RFGUZCW3USNFRZCHLU6CC3SN",
      withdrawMemo: input.useAnchor === false ? null : Buffer.from(`mock-anchor-${orderId}`).toString("base64"),
      withdrawMemoType: input.useAnchor === false ? null : "hash",
      raw: { mocked: true },
    };
  }

  async getOrder(orderId: string): Promise<EtherfuseOrderDetails> {
    const now = new Date().toISOString();

    return {
      orderId,
      status: "created",
      orderType: "offramp",
      isAnchorOrder: true,
      createdAt: now,
      updatedAt: now,
      withdrawAnchorAccount: "GABPM7AXXSE27X3NIN5IVSFCW5AWQLF3RFGUZCW3USNFRZCHLU6CC3SN",
      withdrawMemo: Buffer.from(`mock-anchor-${orderId}`).toString("base64"),
      withdrawMemoType: "hash",
      statusPage: `https://devnet.etherfuse.com/ramp/order/${orderId}`,
      sourceAsset: "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      targetAsset: "MXN",
      raw: { mocked: true },
    };
  }
}

class ApiEtherfuseClient implements EtherfuseClient {
  private readonly http: AxiosInstance;

  constructor(config: RuntimeConfig) {
    this.http = axios.create({
      baseURL: config.baseUrl,
      timeout: 20_000,
      headers: {
        Authorization: config.apiKey ?? "",
        "Content-Type": "application/json",
      },
    });
  }

  async listRampableAssets(input: EtherfuseListAssetsInput): Promise<EtherfuseRampableAsset[]> {
    const response = await this.http.get<{ assets?: EtherfuseRampableAsset[] }>("/ramp/assets", {
      params: {
        blockchain: input.blockchain ?? DEFAULT_BLOCKCHAIN,
        currency: input.currency ?? DEFAULT_CURRENCY,
        wallet: input.wallet,
      },
    });

    return response.data.assets ?? [];
  }

  async createQuote(input: EtherfuseQuoteInput): Promise<EtherfuseQuote> {
    const response = await this.http.post("/ramp/quote", {
      quoteId: input.quoteId ?? randomUUID(),
      customerId: input.customerId,
      blockchain: input.blockchain ?? DEFAULT_BLOCKCHAIN,
      quoteAssets: input.quoteAssets,
      sourceAmount: input.sourceAmount,
      walletAddress: input.walletAddress,
      partnerFeeBps: input.partnerFeeBps,
    });

    const data = asRecord(response.data);
    return {
      quoteId: requiredString(data.quoteId, "quoteId"),
      blockchain: requiredBlockchain(data.blockchain),
      quoteAssets: requiredQuoteAssets(data.quoteAssets),
      sourceAmount: requiredString(data.sourceAmount, "sourceAmount"),
      destinationAmount: requiredString(data.destinationAmount, "destinationAmount"),
      destinationAmountAfterFee: optionalString(data.destinationAmountAfterFee),
      exchangeRate: requiredString(data.exchangeRate, "exchangeRate"),
      etherfuseMidMarketRate: optionalString(data.etherfuseMidMarketRate),
      feeBps: optionalString(data.feeBps),
      feeAmount: optionalString(data.feeAmount),
      expiresAt: requiredString(data.expiresAt, "expiresAt"),
      createdAt: requiredString(data.createdAt, "createdAt"),
      updatedAt: requiredString(data.updatedAt, "updatedAt"),
      raw: response.data,
    };
  }

  async createOrder(input: EtherfuseCreateOrderInput): Promise<EtherfuseOrderReceipt> {
    const response = await this.http.post("/ramp/order", {
      orderId: input.orderId ?? randomUUID(),
      bankAccountId: input.bankAccountId,
      quoteId: input.quoteId,
      publicKey: input.publicKey,
      cryptoWalletId: input.cryptoWalletId,
      memo: input.memo,
      useAnchor: input.useAnchor ?? true,
    });

    return normalizeOrderReceipt(response.data);
  }

  async getOrder(orderId: string): Promise<EtherfuseOrderDetails> {
    const response = await this.http.get(`/ramp/order/${encodeURIComponent(orderId)}`);
    const data = asRecord(response.data);

    return {
      orderId: requiredString(data.orderId, "orderId"),
      customerId: optionalString(data.customerId),
      status: requiredOrderStatus(data.status),
      orderType: requiredOrderType(data.orderType),
      isAnchorOrder: Boolean(data.isAnchorOrder),
      createdAt: optionalString(data.createdAt),
      updatedAt: optionalString(data.updatedAt),
      completedAt: optionalString(data.completedAt),
      amountInFiat: optionalNumber(data.amountInFiat),
      amountInTokens: optionalNumber(data.amountInTokens),
      confirmedTxSignature: optionalString(data.confirmedTxSignature),
      walletId: optionalString(data.walletId),
      bankAccountId: optionalString(data.bankAccountId),
      withdrawAnchorAccount: optionalString(data.withdrawAnchorAccount),
      withdrawMemo: optionalString(data.withdrawMemo),
      withdrawMemoType: optionalString(data.withdrawMemoType),
      statusPage: optionalString(data.statusPage),
      sourceAsset: optionalString(data.sourceAsset),
      targetAsset: optionalString(data.targetAsset),
      raw: response.data,
    };
  }
}

function normalizeOrderReceipt(payload: unknown): EtherfuseOrderReceipt {
  const root = asRecord(payload);
  const onramp = root.onramp;
  const offramp = root.offramp;

  if (onramp) {
    const data = asRecord(onramp);
    return {
      orderId: requiredString(data.orderId, "onramp.orderId"),
      orderType: "onramp",
      isAnchorOrder: false,
      depositClabe: optionalString(data.depositClabe),
      depositAmount: optionalNumber(data.depositAmount),
      depositBankName: optionalString(data.depositBankName),
      depositAccountHolder: optionalString(data.depositAccountHolder),
      raw: payload,
    };
  }

  if (offramp) {
    const data = asRecord(offramp);
    return {
      orderId: requiredString(data.orderId, "offramp.orderId"),
      orderType: "offramp",
      isAnchorOrder: Boolean(data.withdrawAnchorAccount || data.withdrawMemo),
      withdrawAnchorAccount: optionalString(data.withdrawAnchorAccount),
      withdrawMemo: optionalString(data.withdrawMemo),
      withdrawMemoType: optionalString(data.withdrawMemoType),
      raw: payload,
    };
  }

  throw new Error("Etherfuse order response is missing onramp/offramp data.");
}

function getRuntimeConfig(): RuntimeConfig {
  return {
    baseUrl: process.env.ETHERFUSE_BASE_URL?.trim() || DEFAULT_BASE_URL,
    apiKey: process.env.ETHERFUSE_API_KEY?.trim(),
    useMock: process.env.ETHERFUSE_USE_MOCK === "true",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new Error("Etherfuse response is invalid.");
  }

  return value as Record<string, unknown>;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Etherfuse field ${field} is missing or invalid.`);
  }

  return value.trim();
}

function optionalString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }

  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function optionalNumber(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }

  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function requiredBlockchain(value: unknown): EtherfuseBlockchain {
  const blockchain = requiredString(value, "blockchain");

  if (["stellar", "solana", "base", "polygon", "monad"].includes(blockchain)) {
    return blockchain as EtherfuseBlockchain;
  }

  throw new Error(`Unsupported Etherfuse blockchain: ${blockchain}.`);
}

function requiredOrderType(value: unknown): "onramp" | "offramp" {
  const orderType = requiredString(value, "orderType");

  if (orderType === "onramp" || orderType === "offramp") {
    return orderType;
  }

  throw new Error(`Unsupported Etherfuse orderType: ${orderType}.`);
}

function requiredOrderStatus(value: unknown): EtherfuseOrderStatus {
  const status = requiredString(value, "status");

  if (["created", "funded", "completed", "finalized", "failed", "refunded", "canceled"].includes(status)) {
    return status as EtherfuseOrderStatus;
  }

  throw new Error(`Unsupported Etherfuse order status: ${status}.`);
}

function requiredQuoteAssets(value: unknown): EtherfuseQuoteAssets {
  const data = asRecord(value);
  return {
    type: requiredQuoteType(data.type),
    sourceAsset: requiredString(data.sourceAsset, "quoteAssets.sourceAsset"),
    targetAsset: requiredString(data.targetAsset, "quoteAssets.targetAsset"),
  };
}

function requiredQuoteType(value: unknown): EtherfuseQuoteAssets["type"] {
  const quoteType = requiredString(value, "quoteAssets.type");

  if (quoteType === "onramp" || quoteType === "offramp" || quoteType === "swap") {
    return quoteType;
  }

  throw new Error(`Unsupported Etherfuse quote type: ${quoteType}.`);
}

function extractEtherfuseError(error: unknown): string {
  if (!(error instanceof AxiosError)) {
    return error instanceof Error ? error.message : "Unknown Etherfuse error.";
  }

  const payload = error.response?.data;
  if (payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string") {
    return `Etherfuse API error: ${(payload as { error: string }).error}`;
  }

  if (typeof error.message === "string" && error.message.trim().length > 0) {
    return `Etherfuse API error: ${error.message}`;
  }

  return "Etherfuse API request failed.";
}

class SafeEtherfuseClient implements EtherfuseClient {
  constructor(private readonly inner: EtherfuseClient) {}

  async listRampableAssets(input: EtherfuseListAssetsInput): Promise<EtherfuseRampableAsset[]> {
    try {
      return await this.inner.listRampableAssets(input);
    } catch (error) {
      throw new Error(extractEtherfuseError(error));
    }
  }

  async createQuote(input: EtherfuseQuoteInput): Promise<EtherfuseQuote> {
    try {
      return await this.inner.createQuote(input);
    } catch (error) {
      throw new Error(extractEtherfuseError(error));
    }
  }

  async createOrder(input: EtherfuseCreateOrderInput): Promise<EtherfuseOrderReceipt> {
    try {
      return await this.inner.createOrder(input);
    } catch (error) {
      throw new Error(extractEtherfuseError(error));
    }
  }

  async getOrder(orderId: string): Promise<EtherfuseOrderDetails> {
    try {
      return await this.inner.getOrder(orderId);
    } catch (error) {
      throw new Error(extractEtherfuseError(error));
    }
  }
}

function createEtherfuseClient(): EtherfuseClient {
  const config = getRuntimeConfig();

  if (config.useMock) {
    console.warn("ETHERFUSE_USE_MOCK=true detected. Using mock Etherfuse client.");
    return new SafeEtherfuseClient(new MockEtherfuseClient());
  }

  if (!config.apiKey) {
    console.warn("ETHERFUSE_API_KEY is missing. Falling back to mock Etherfuse client.");
    return new SafeEtherfuseClient(new MockEtherfuseClient());
  }

  return new SafeEtherfuseClient(new ApiEtherfuseClient(config));
}

export const etherfuseClient: EtherfuseClient = createEtherfuseClient();
