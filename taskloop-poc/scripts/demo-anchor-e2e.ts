import dotenv from "dotenv";

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
  const assetsData = (await assetsRes.json()) as {
    provider: string;
    assets: Array<{ symbol: string; identifier: string; name: string; balance?: string | null }>;
  };
  console.log("Provider:", assetsData.provider);
  console.log("Assets:", assetsData.assets.length);
  for (const asset of assetsData.assets) {
    const balance = asset.balance ? ` | balance: ${asset.balance}` : "";
    console.log(`  ${asset.symbol} - ${asset.name}${balance}`);
  }

  // 2. Create quote
  console.log("\n═══ 2. Create off-ramp quote ═══");
  const quoteRes = await fetch(`${apiBaseUrl}/anchor/etherfuse/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerId: `taskloop-demo-${Date.now()}`,
      blockchain: "stellar",
      type: "offramp",
      sourceAsset: "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      targetAsset: "MXN",
      sourceAmount: "50",
      walletAddress: "GDEMO_TASKLOOP_WORKER",
    }),
  });
  const quoteData = (await quoteRes.json()) as {
    provider: string;
    quote: {
      quoteId: string;
      sourceAmount: string;
      destinationAmount: string;
      exchangeRate: string;
      expiresAt: string;
      quoteAssets?: { type: string; sourceAsset: string; targetAsset: string };
    };
  };
  const quote = quoteData.quote;
  console.log("Provider:", quoteData.provider);
  console.log(`Source: ${quote.sourceAmount} USDC`);
  console.log(`Destination: ${quote.destinationAmount} MXN`);
  console.log(`Exchange rate: ${quote.exchangeRate}`);
  console.log(`Quote ID: ${quote.quoteId}`);
  console.log(`Expires: ${quote.expiresAt}`);

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
  const orderData = (await orderRes.json()) as {
    provider: string;
    order: {
      orderId: string;
      orderType: string;
      isAnchorOrder: boolean;
      withdrawAnchorAccount?: string | null;
      withdrawMemo?: string | null;
      withdrawMemoType?: string | null;
    };
  };
  const order = orderData.order;
  console.log("Provider:", orderData.provider);
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
  const statusData = (await statusRes.json()) as {
    provider: string;
    order: { status?: string };
  };
  console.log("Order status:", statusData.order.status ?? "N/A");

  console.log("\n═══ Anchor flow complete ═══");
  console.log("In production, the Stellar payment would be sent to the anchor account above.");
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown anchor E2E demo error.";
  console.error("\n❌ Demo failed:", message);
  process.exitCode = 1;
});
