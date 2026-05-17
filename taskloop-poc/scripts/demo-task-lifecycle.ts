import dotenv from "dotenv";

dotenv.config();

const DEFAULT_API_BASE_URL = "http://localhost:3000";
const DEFAULT_WALLET = "GDUIPC7QY3EPLAHSQRFHWZKAK6GDPRUQKH7PKMXWPVTDF2SVKMFJOD74";

async function main(): Promise<void> {
  const apiBaseUrl = process.env.TASKLOOP_API_URL ?? DEFAULT_API_BASE_URL;
  const walletAddress = process.argv[2] ?? DEFAULT_WALLET;

  console.log("TaskLoop — Full task lifecycle E2E");
  console.log("API:", apiBaseUrl);
  console.log("Wallet:", walletAddress);

  // 1. Create task
  console.log("\n═══ 1. Create task ═══");
  const createRes = await fetch(`${apiBaseUrl}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Classify product images",
      instructions: "Tag the primary color, category, and whether the background is clean white.",
      reward: 0.5,
      currency: "XLM",
      required: 1,
    }),
  });
  const createData = (await createRes.json()) as { task: { id: string } };
  const taskId = createData.task.id;
  console.log("Task ID:", taskId);

  // 2. Send to Telegram
  console.log("\n═══ 2. Send to Telegram ═══");
  const sendRes = await fetch(`${apiBaseUrl}/tasks/${taskId}/send`, { method: "POST" });
  const sendData = (await sendRes.json()) as { task: { status: string; telegramDelivered: number } };
  console.log("Status:", sendData.task.status);
  console.log("Delivered:", sendData.task.telegramDelivered);

  // 3. Submit
  console.log("\n═══ 3. Submit response ═══");
  const submitRes = await fetch(`${apiBaseUrl}/tasks/${taskId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user: "Demo Worker",
      handle: "@demo",
      walletAddress,
      response: "Color: blue. Category: electronics. Background: clean.",
    }),
  });
  const submitData = (await submitRes.json()) as {
    task: { status: string };
    submission: { id: string };
  };
  console.log("Task status:", submitData.task.status);
  console.log("Submission ID:", submitData.submission.id);

  // 4. Approve & pay
  console.log("\n═══ 4. Validate & pay ═══");
  const approveRes = await fetch(`${apiBaseUrl}/tasks/${taskId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const approveData = (await approveRes.json()) as {
    task: { status: string; payouts?: Array<{ txHash?: string; status: string; amount: number; currency: string }> };
    validation: { approved: boolean; score: number; reason: string };
    payout?: { txHash?: string; status: string; amount: number; currency: string };
    payoutError?: string;
  };

  console.log("Task status:", approveData.task.status);
  console.log("Validation:", approveData.validation.approved ? "✅ approved" : "❌ rejected", `(score: ${approveData.validation.score})`);
  console.log("Reason:", approveData.validation.reason);

  const payout = approveData.payout ?? approveData.task.payouts?.[0];
  if (payout) {
    console.log(`\nPayout: ${payout.status} | ${payout.amount} ${payout.currency}`);
    if (payout.txHash) {
      console.log("txHash:", payout.txHash);
      console.log("Explorer:", `https://stellar.expert/explorer/testnet/tx/${payout.txHash}`);
    }
  }

  if (approveData.payoutError) {
    console.warn("\n⚠️  Payout error:", approveData.payoutError);
  }

  // 5. Fetch final task to confirm payouts
  console.log("\n═══ 5. Final task confirmation ═══");
  const finalRes = await fetch(`${apiBaseUrl}/tasks/${taskId}`);
  const finalData = (await finalRes.json()) as {
    task: { status: string; payouts: Array<{ txHash?: string; status: string; amount: number }>; submissions: Array<{ validation: string; payout: string }> };
  };
  console.log("Final status:", finalData.task.status);
  console.log("Submissions:", finalData.task.submissions.length, `(payout: ${finalData.task.submissions.filter((s) => s.payout === "paid").length} paid)`);
  console.log("Payouts:", finalData.task.payouts.length);

  if (finalData.task.payouts.length > 0) {
    const p = finalData.task.payouts[0];
    if (p.txHash) {
      console.log("\n✅ Stellar payment confirmed!");
      console.log("Open in explorer:", `https://stellar.expert/explorer/testnet/tx/${p.txHash}`);
    }
  }

  console.log("\n═══ Lifecycle complete ═══");
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown lifecycle demo error.";
  console.error("\n❌ Demo failed:", message);
  process.exitCode = 1;
});
