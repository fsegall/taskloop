import dotenv from "dotenv";
import { randomUUID } from "crypto";

dotenv.config();

const DEFAULT_API_BASE_URL = "http://localhost:3000";

async function main(): Promise<void> {
  const apiBaseUrl = process.env.TASKLOOP_API_URL ?? DEFAULT_API_BASE_URL;

  console.log("TaskLoop — Anchor/Etherfuse E2E flow");
  console.log("API:", apiBaseUrl);
  console.log("");

  // 1. List rampable assets
  console.log("═══ 1. List rampable assets ═══");
  const assetsRes = await fetch(
    `${apiBaseUrl}/anchor/etherfuse/assets?wallet=GDEMO_TASKLOOP_WORKER&blockchain=stellar&currency=mxn`,
  );
  const assetsEnvelope = (await assetsRes.json()) as Record<string, unknown>;
  const provider = assetsEnvelope.provider ?? "etherfuse";
  const assets = (assetsEnvelope.assets as Array<{ symbol: string; identifier: string; name: string; balance?: string | null }>) ?? [];
  console.log("Provider:", provider);
  console.log("Assets:", assets.length);
  for (const asset of assets) {
    const balance = asset.balance ? ` | balance: ${asset.balance}` : "";
    console.log(`  ${asset.symbol} - ${asset.name}${balance}`);
  }

  // 2. Create quote — use UUID real para customerId
  console.log("\n═══ 2. Create off-ramp quote ═══");
  const customerId = randomUUID();
  console.log("Customer ID:", customerId);

  const quotePayload = {
    customerId,
    blockchain: "stellar",
    type: "offramp",
    sourceAsset: "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    targetAsset: "MXN",
    sourceAmount: "50",
    walletAddress: "GDEMO_TASKLOOP_WORKER",
  };
  console.log("Quote request:", JSON.stringify(quotePayload, null, 2));

  const quoteRes = await fetch(`${apiBaseUrl}/anchor/etherfuse/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(quotePayload),
  });

  const quoteResponseText = await quoteRes.text();
  console.log("Quote response status:", quoteRes.status);
  console.log("Quote response body:", quoteResponseText);

  const quoteEnvelope = JSON.parse(quoteResponseText) as Record<string, unknown>;
  if (quoteEnvelope.error) {
    throw new Error(`Quote API error: ${quoteEnvelope.error}`);
  }

  const quote = quoteEnvelope.quote as {
    quoteId: string;
    sourceAmount: string;
    destinationAmount: string;
    exchangeRate: string;
    expiresAt: string;
    quoteAssets?: { type: string; sourceAsset: string; targetAsset: string };
  };
  console.log("Source:", quote.sourceAmount, "USDC");
  console.log("Destination:", quote.destinationAmount, "MXN");
  console.log("Exchange rate:", quote.exchangeRate);
  console.log("Quote ID:", quote.quoteId);
  console.log("Expires:", quote.expiresAt);

  // 3. Create order
  console.log("\n═══ 3. Create anchor order ═══");
  const orderRes = await fetch(`${apiBaseUrl}/anchor/etherfuse/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bankAccountId: "demo-bank-account-mx",
      quoteId: quote.quoteId,
      useAnchor: true,
    }),
  });
  const orderEnvelope = (await orderRes.json()) as Record<string, unknown>;
  if (orderEnvelope.error) {
    throw new Error(`Order API error: ${orderEnvelope.error}`);
  }
  const order = orderEnvelope.order as {
    orderId: string;
    orderType: string;
    isAnchorOrder: boolean;
    withdrawAnchorAccount?: string | null;
    withdrawMemo?: string | null;
    withdrawMemoType?: string | null;
  };
  console.log("Order ID:", order.orderId);
  console.log("Type:", order.orderType);
  console.log("Anchor mode:", order.isAnchorOrder ? "Yes" : "No");

  if (order.withdrawAnchorAccount) {
    console.log("\nWithdraw to Anchor Account:");
    console.log(" ", order.withdrawAnchorAccount);
  }
  if (order.withdrawMemo) {
    console.log("Memo (", order.withdrawMemoType, "):");
    console.log(" ", order.withdrawMemo);
  }

  // 4. Check order status
  console.log("\n═══ 4. Check order status ═══");
  const statusRes = await fetch(`${apiBaseUrl}/anchor/etherfuse/order/${order.orderId}`);
  const statusEnvelope = (await statusRes.json()) as Record<string, unknown>;
  if (statusEnvelope.error) {
    throw new Error(`Status API error: ${statusEnvelope.error}`);
  }
  const statusOrder = statusEnvelope.order as { status?: string };
  console.log("Order status:", statusOrder.status ?? "N/A");

  console.log("\n═══ Anchor flow complete ═══");
  console.log("In production, the Stellar payment would be sent to the anchor account above.");
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown anchor E2E demo error.";
  console.error("\n❌ Demo failed:", message);
  process.exitCode = 1;
});
