import { useState } from "react";
import { Anchor, ArrowRight, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

const LOCAL_API_BASE_URL = "http://localhost:3000";

function getApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return LOCAL_API_BASE_URL;
}

type AnchorAsset = {
  symbol: string;
  identifier: string;
  name: string;
  currency: string;
  balance?: string | null;
};

type AnchorQuote = {
  quoteId: string;
  sourceAmount: string;
  destinationAmount: string;
  exchangeRate: string;
  quoteAssets: { type: string; sourceAsset: string; targetAsset: string };
  expiresAt: string;
};

type AnchorOrder = {
  orderId: string;
  orderType: string;
  isAnchorOrder: boolean;
  withdrawAnchorAccount?: string | null;
  withdrawMemo?: string | null;
  withdrawMemoType?: string | null;
};

type Step = "idle" | "assets" | "quote" | "order" | "done";

export function AnchorSettlement({ taskId }: { taskId: string }) {
  const [step, setStep] = useState<Step>("idle");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<AnchorAsset[]>([]);
  const [quote, setQuote] = useState<AnchorQuote | null>(null);
  const [order, setOrder] = useState<AnchorOrder | null>(null);

  const base = getApiBaseUrl();

  const runFlow = async () => {
    setIsRunning(true);
    setError(null);

    try {
      // Step 1 — List assets
      setStep("assets");
      const assetsRes = await fetch(
        `${base}/anchor/etherfuse/assets?wallet=GDEMO_TASKLOOP_WORKER&blockchain=stellar&currency=mxn`,
      );
      const assetsData = (await assetsRes.json()) as { assets: AnchorAsset[] };
      setAssets(assetsData.assets ?? []);
      await pause(900);

      // Step 2 — Create quote
      setStep("quote");
      const quoteRes = await fetch(`${base}/anchor/etherfuse/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: `taskloop-${taskId}`,
          blockchain: "stellar",
          type: "offramp",
          sourceAsset: "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
          targetAsset: "MXN",
          sourceAmount: "50",
          walletAddress: "GDEMO_TASKLOOP_WORKER",
        }),
      });
      const quoteData = (await quoteRes.json()) as { quote: AnchorQuote };
      setQuote(quoteData.quote);
      await pause(900);

      // Step 3 — Create order
      setStep("order");
      const orderRes = await fetch(`${base}/anchor/etherfuse/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankAccountId: "demo-bank-account-mx",
          quoteId: quoteData.quote.quoteId,
          useAnchor: true,
        }),
      });
      const orderData = (await orderRes.json()) as { order: AnchorOrder };
      setOrder(orderData.order);
      await pause(600);

      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anchor settlement flow failed.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <section className="rounded-xl border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Anchor className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Anchor Settlement</h2>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium bg-warning/15 text-warning-foreground border-warning/40">
            <AlertTriangle className="size-3" />
            mock mode
          </span>
        </div>
        <span className="text-xs text-muted-foreground">Etherfuse off-ramp</span>
      </div>

      <div className="px-5 py-5 space-y-5">
        {step === "idle" && (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Simulate the Anchor off-ramp flow: list rampable assets, create a USDC &rarr; MXN quote, and place an
              order through the Etherfuse adapter.
            </p>
            <button
              type="button"
              onClick={runFlow}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 rounded-md [background-image:var(--gradient-primary)] text-primary-foreground px-4 py-2 text-sm font-medium shadow-[var(--shadow-elegant)] hover:opacity-95 disabled:opacity-60"
            >
              <Anchor className="size-4" />
              Run Anchor settlement
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Pipeline steps */}
        {step !== "idle" && (
          <div className="space-y-4">
            {/* Step 1 — Assets */}
            <StepCard
              number={1}
              title="List rampable assets"
              endpoint="GET /anchor/etherfuse/assets"
              isActive={step === "assets" && isRunning}
              isDone={stepIndex(step) > 0}
            >
              {assets.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {assets.map((a) => (
                    <div
                      key={a.identifier}
                      className="rounded-lg border bg-background px-3 py-2 text-xs space-y-0.5"
                    >
                      <div className="font-semibold">{a.symbol}</div>
                      <div className="text-muted-foreground font-mono text-[10px] break-all">
                        {a.identifier}
                      </div>
                      {a.balance && (
                        <div className="text-muted-foreground">
                          Balance: {a.balance}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </StepCard>

            {/* Step 2 — Quote */}
            <StepCard
              number={2}
              title="Create off-ramp quote"
              endpoint="POST /anchor/etherfuse/quote"
              isActive={step === "quote" && isRunning}
              isDone={stepIndex(step) > 1}
            >
              {quote && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                  <KV label="Source" value={`${quote.sourceAmount} USDC`} />
                  <KV label="Destination" value={`${quote.destinationAmount} MXN`} />
                  <KV label="Rate" value={quote.exchangeRate} />
                  <KV label="Quote ID" value={quote.quoteId.slice(0, 8) + "..."} mono />
                </div>
              )}
            </StepCard>

            {/* Step 3 — Order */}
            <StepCard
              number={3}
              title="Create anchor order"
              endpoint="POST /anchor/etherfuse/order"
              isActive={step === "order" && isRunning}
              isDone={stepIndex(step) > 2}
            >
              {order && (
                <div className="space-y-2 mt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <KV label="Order ID" value={order.orderId.slice(0, 8) + "..."} mono />
                    <KV label="Type" value={order.orderType} />
                    <KV label="Anchor mode" value={order.isAnchorOrder ? "Yes" : "No"} />
                  </div>
                  {order.withdrawAnchorAccount && (
                    <div className="rounded-lg border bg-background px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        Withdraw to Anchor Account
                      </div>
                      <div className="font-mono text-xs break-all">
                        {order.withdrawAnchorAccount}
                      </div>
                    </div>
                  )}
                  {order.withdrawMemo && (
                    <div className="rounded-lg border bg-background px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        Memo ({order.withdrawMemoType})
                      </div>
                      <div className="font-mono text-xs break-all">{order.withdrawMemo}</div>
                    </div>
                  )}
                </div>
              )}
            </StepCard>

            {/* Done */}
            {step === "done" && (
              <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm flex items-center gap-2">
                <CheckCircle2 className="size-4 text-success-foreground" />
                <span>
                  Anchor settlement flow completed.{" "}
                  <span className="text-muted-foreground">
                    In production, the Stellar payment would be sent to the anchor account with the memo above.
                  </span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-3 text-[11px] text-muted-foreground space-y-1">
          <p>
            Provider: <span className="font-medium">Etherfuse</span> &middot; Blockchain:{" "}
            <span className="font-medium">Stellar</span> &middot; Mode:{" "}
            <span className="font-medium text-warning-foreground">mock</span>
          </p>
          <p>
            Mock mode is active because Etherfuse onboarding could not be completed for our region (Brazil).
            The adapter is production-ready and will use real credentials when available.
          </p>
        </div>
      </div>
    </section>
  );
}

function StepCard({
  number,
  title,
  endpoint,
  isActive,
  isDone,
  children,
}: {
  number: number;
  title: string;
  endpoint: string;
  isActive: boolean;
  isDone: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 transition-colors ${
        isActive
          ? "border-primary/40 bg-primary/5"
          : isDone
            ? "border-success/30 bg-success/5"
            : "border-border bg-background"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
            isDone
              ? "bg-success text-success-foreground border-transparent"
              : isActive
                ? "[background-image:var(--gradient-primary)] text-primary-foreground border-transparent"
                : "bg-card text-muted-foreground border-border"
          }`}
        >
          {isDone ? <CheckCircle2 className="size-3" /> : isActive ? <Loader2 className="size-3 animate-spin" /> : number}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium">{title}</span>
          <ArrowRight className="size-3 text-muted-foreground hidden sm:block" />
          <code className="text-[10px] text-muted-foreground font-mono hidden sm:block">{endpoint}</code>
        </div>
      </div>
      {children}
    </div>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function stepIndex(step: Step): number {
  const order: Step[] = ["idle", "assets", "quote", "order", "done"];
  return order.indexOf(step);
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
