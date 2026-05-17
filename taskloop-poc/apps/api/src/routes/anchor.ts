import { Router } from "express";
import { etherfuseClient } from "../services/etherfuse-adapter";
import type { ApiErrorBody } from "../types";

export const anchorRouter = Router();

anchorRouter.get("/etherfuse/assets", async (req, res) => {
  const wallet = readNonEmptyQuery(req.query.wallet);
  if (!wallet) {
    return res.status(400).json({ error: 'Query param "wallet" is required.' } satisfies ApiErrorBody);
  }

  try {
    const assets = await etherfuseClient.listRampableAssets({
      wallet,
      blockchain: readOptionalBlockchain(req.query.blockchain),
      currency: readOptionalString(req.query.currency),
    });

    return res.json({
      provider: "etherfuse",
      mode: "assets",
      assets,
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : "Etherfuse assets lookup failed.",
    } satisfies ApiErrorBody);
  }
});

anchorRouter.post("/etherfuse/quote", async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const customerId = readRequiredString(body.customerId, "customerId");
  const sourceAsset = readRequiredString(body.sourceAsset, "sourceAsset");
  const sourceAmount = readRequiredString(body.sourceAmount, "sourceAmount");
  const targetAsset = readOptionalString(body.targetAsset) ?? "MXN";
  const quoteType = readOptionalQuoteType(body.type) ?? "offramp";

  if (!customerId || !sourceAsset || !sourceAmount) {
    return res.status(400).json({
      error: 'Fields "customerId", "sourceAsset" and "sourceAmount" are required.',
    } satisfies ApiErrorBody);
  }

  try {
    const quote = await etherfuseClient.createQuote({
      customerId,
      blockchain: readOptionalBlockchain(body.blockchain),
      sourceAmount,
      walletAddress: readOptionalString(body.walletAddress),
      partnerFeeBps: readOptionalNumber(body.partnerFeeBps),
      quoteAssets: {
        type: quoteType,
        sourceAsset,
        targetAsset,
      },
    });

    return res.status(201).json({
      provider: "etherfuse",
      mode: "quote",
      quote,
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : "Etherfuse quote creation failed.",
    } satisfies ApiErrorBody);
  }
});

anchorRouter.post("/etherfuse/order", async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const bankAccountId = readRequiredString(body.bankAccountId, "bankAccountId");
  const quoteId = readRequiredString(body.quoteId, "quoteId");

  if (!bankAccountId || !quoteId) {
    return res.status(400).json({
      error: 'Fields "bankAccountId" and "quoteId" are required.',
    } satisfies ApiErrorBody);
  }

  try {
    const order = await etherfuseClient.createOrder({
      bankAccountId,
      quoteId,
      publicKey: readOptionalString(body.publicKey),
      cryptoWalletId: readOptionalString(body.cryptoWalletId),
      memo: readOptionalString(body.memo),
      useAnchor: readOptionalBoolean(body.useAnchor) ?? true,
    });

    return res.status(201).json({
      provider: "etherfuse",
      mode: "order",
      order,
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : "Etherfuse order creation failed.",
    } satisfies ApiErrorBody);
  }
});

anchorRouter.get("/etherfuse/order/:orderId", async (req, res) => {
  const orderId = req.params.orderId?.trim();
  if (!orderId) {
    return res.status(400).json({ error: 'Param "orderId" is required.' } satisfies ApiErrorBody);
  }

  try {
    const order = await etherfuseClient.getOrder(orderId);
    return res.json({
      provider: "etherfuse",
      mode: "status",
      order,
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : "Etherfuse order lookup failed.",
    } satisfies ApiErrorBody);
  }
});

function readRequiredString(value: unknown, _field: string): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readNonEmptyQuery(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return undefined;
}

function readOptionalQuoteType(value: unknown): "onramp" | "offramp" | "swap" | undefined {
  if (value === "onramp" || value === "offramp" || value === "swap") {
    return value;
  }

  return undefined;
}

function readOptionalBlockchain(value: unknown): "stellar" | "solana" | "base" | "polygon" | "monad" | undefined {
  if (value === "stellar" || value === "solana" || value === "base" || value === "polygon" || value === "monad") {
    return value;
  }

  return undefined;
}

export default anchorRouter;
