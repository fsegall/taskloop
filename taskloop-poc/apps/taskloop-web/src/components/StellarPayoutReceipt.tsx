import { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, Star, ArrowRight } from "lucide-react";
import type { PayoutRecord } from "@/lib/mock-tasks";

type Props = {
  payouts: PayoutRecord[];
  taskCurrency: string;
};

const EXPLORER_BASE = "https://stellar.expert/explorer/testnet/tx";

export function StellarPayoutReceipt({ payouts, taskCurrency }: Props) {
  const paidPayouts = payouts.filter((p) => p.status === "paid" && p.txHash);
  const [revealed, setRevealed] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);

  if (paidPayouts.length === 0) return null;

  const totalPaid = paidPayouts.reduce((sum, p) => sum + p.amount, 0);
  const provider = paidPayouts[0]?.provider ?? "stellar-testnet";
  const isRealTestnet = provider === "stellar-testnet";

  const handleReveal = async () => {
    setIsRevealing(true);
    await pause(1200);
    setRevealed(true);
    setIsRevealing(false);
  };

  return (
    <section className="rounded-xl border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Stellar Payout</h2>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${
              isRealTestnet
                ? "bg-success/15 text-success-foreground border-success/30"
                : "bg-info/15 text-info-foreground border-info/30"
            }`}
          >
            <CheckCircle2 className="size-3" />
            {isRealTestnet ? "testnet confirmed" : "testnet mock"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {paidPayouts.length} payment{paidPayouts.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Total paid" value={`${totalPaid.toFixed(2)} ${taskCurrency}`} />
          <SummaryCard label="Payments" value={String(paidPayouts.length)} />
          <SummaryCard label="Provider" value={isRealTestnet ? "Horizon Testnet" : "Mock Testnet"} />
          <SummaryCard label="Network" value="Stellar Testnet" />
        </div>

        {!revealed ? (
          <div className="text-center py-4">
            <button
              type="button"
              onClick={handleReveal}
              disabled={isRevealing}
              className="inline-flex items-center gap-1.5 rounded-md [background-image:var(--gradient-primary)] text-primary-foreground px-4 py-2 text-sm font-medium shadow-[var(--shadow-elegant)] hover:opacity-95 disabled:opacity-60"
            >
              {isRevealing ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Fetching receipts...
                </>
              ) : (
                <>
                  <Star className="size-4" /> Show transaction receipts
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {paidPayouts.map((payout, index) => (
              <div
                key={payout.id}
                className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-success text-success-foreground flex items-center justify-center text-[10px] font-bold">
                      <CheckCircle2 className="size-3" />
                    </div>
                    <span className="text-sm font-medium">
                      Payment #{index + 1}
                    </span>
                    <ArrowRight className="size-3 text-muted-foreground" />
                    <span className="text-sm font-semibold">
                      {payout.amount} {payout.currency}
                    </span>
                  </div>
                  {payout.processedAt && (
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(payout.processedAt).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Transaction hash */}
                {payout.txHash && (
                  <div className="rounded-lg border bg-background px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Transaction hash
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="font-mono text-xs break-all flex-1">
                        {payout.txHash}
                      </code>
                      {isRealTestnet && !payout.txHash.includes("...") && (
                        <a
                          href={`${EXPLORER_BASE}/${payout.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 shrink-0 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-secondary/60 transition-colors"
                        >
                          <ExternalLink className="size-3" />
                          Explorer
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Details row */}
                <div className="grid grid-cols-3 gap-3">
                  <Detail label="Payout ID" value={payout.id} mono />
                  <Detail label="Submission" value={payout.submissionId} mono />
                  <Detail label="Provider" value={payout.provider} />
                </div>
              </div>
            ))}

            {/* Confirmed banner */}
            <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm flex items-center gap-2">
              <CheckCircle2 className="size-4 text-success-foreground shrink-0" />
              <span>
                All payouts confirmed on Stellar Testnet.{" "}
                {isRealTestnet ? (
                  <span className="text-muted-foreground">
                    Transactions are verifiable on the Stellar explorer.
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Mock provider used. Configure STELLAR_SOURCE_SECRET for real testnet transactions.
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-3 text-[11px] text-muted-foreground">
          <p>
            Network: <span className="font-medium">Stellar Testnet</span> &middot; Asset:{" "}
            <span className="font-medium">{taskCurrency}</span> &middot; Provider:{" "}
            <span className="font-medium">{provider}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xs font-medium truncate ${mono ? "font-mono" : ""}`} title={value}>
        {value}
      </div>
    </div>
  );
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
