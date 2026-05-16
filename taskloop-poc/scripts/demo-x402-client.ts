import dotenv from "dotenv";

dotenv.config();

const DEFAULT_API_BASE_URL = "http://localhost:3000";
const DEFAULT_ACCOUNT_ID = "demo-client-001";

async function main(): Promise<void> {
  const apiBaseUrl = process.env.TASKLOOP_API_URL ?? DEFAULT_API_BASE_URL;
  const accountId = process.argv[2] ?? DEFAULT_ACCOUNT_ID;
  const txHash = process.argv[3];

  const response = await fetch(`${apiBaseUrl}/x402/distribution/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accountId, txHash }),
  });

  const payload = (await response.json()) as Record<string, unknown>;

  console.log(`HTTP ${response.status}`);
  console.log(JSON.stringify(payload, null, 2));

  if (response.status === 402) {
    console.log("\nNext step: make the Stellar Testnet payment above and rerun this script with the txHash.");
    console.log(`Example: npm run demo:x402 -- ${accountId} YOUR_TX_HASH_HERE`);
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown x402 demo client error.";
  console.error("\n❌ x402 demo client failed:", message);
  process.exitCode = 1;
});

export {};
