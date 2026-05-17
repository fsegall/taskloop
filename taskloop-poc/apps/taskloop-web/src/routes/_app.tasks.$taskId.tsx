import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusFlow } from "@/components/StatusFlow";
import { approveTask, getTask, loadTask, payoutTask, sendTask, submitTask, useTasks, useTasksMeta } from "@/lib/tasks-store";
import { ArrowLeft, Send, ShieldCheck, ExternalLink, Wallet, RefreshCw, MessageSquarePlus } from "lucide-react";
import { AnchorSettlement } from "@/components/AnchorSettlement";
import { StellarPayoutReceipt } from "@/components/StellarPayoutReceipt";

export const Route = createFileRoute("/_app/tasks/$taskId")({
  component: TaskDetail,
});

function TaskDetail() {
  const { taskId } = Route.useParams();
  useTasks();
  const { isLoading, error } = useTasksMeta();
  const [actionLabel, setActionLabel] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const task = getTask(taskId);

  useEffect(() => {
    let isMounted = true;

    void loadTask(taskId).finally(() => {
      if (isMounted) {
        setHasAttemptedLoad(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [taskId]);

  if (!task && !hasAttemptedLoad) {
    return <div className="p-8 text-sm text-muted-foreground">Loading task...</div>;
  }

  if (!task) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-semibold">Task not found</h1>
        <Link to="/" className="text-sm text-primary mt-3 inline-block">Back to dashboard</Link>
      </div>
    );
  }

  const runAction = async (label: string, action: () => Promise<unknown>) => {
    setActionLabel(label);
    setActionError(null);

    try {
      await action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to ${label.toLowerCase()}.`);
    } finally {
      setActionLabel(null);
    }
  };

  const primaryAction = getPrimaryAction(taskId, task.status, task.title, task.submissions);

  return (
    <div className="space-y-8">
      <div>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground">{task.id}</span>
              <StatusBadge status={task.status} />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mt-2">{task.title}</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{task.instructions}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] min-w-[180px]">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Reward</div>
            <div className="text-2xl font-semibold">
              {task.reward} <span className="text-sm text-muted-foreground">{task.currency}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              × {task.required} responses
            </div>
          </div>
        </div>
      </div>

      <section className="flex flex-wrap items-center gap-2">
        {primaryAction && (
          <button
            type="button"
            onClick={() => runAction(primaryAction.label, primaryAction.action)}
            disabled={Boolean(actionLabel)}
            className="inline-flex items-center gap-1.5 rounded-md [background-image:var(--gradient-primary)] text-primary-foreground px-3 py-2 text-sm font-medium shadow-[var(--shadow-elegant)] hover:opacity-95 disabled:opacity-60"
          >
            {primaryAction.icon}
            {actionLabel === primaryAction.label ? `${primaryAction.label}...` : primaryAction.label}
          </button>
        )}
        <button
          type="button"
          onClick={() => runAction("Refreshing task", () => loadTask(taskId))}
          disabled={Boolean(actionLabel)}
          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-secondary/60 disabled:opacity-60"
        >
          <RefreshCw className="size-4" /> Refresh
        </button>
      </section>

      {(error || actionError) && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError ?? error}
        </div>
      )}

      <section className="rounded-xl border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-sm font-medium">Lifecycle</h2>
          <span className="text-xs text-muted-foreground">
            {isLoading ? "Syncing with API..." : primaryAction?.hint ?? "Task is fully processed."}
          </span>
        </div>
        <StatusFlow current={task.status} />
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <InfoCard
          icon={<Send className="size-4" />}
          label="Telegram delivery"
          value={`${task.telegramDelivered} / ${task.required}`}
          tone={task.telegramDelivered === task.required ? "success" : "info"}
        />
        <InfoCard
          icon={<ShieldCheck className="size-4" />}
          label="Approved"
          value={`${task.submissions.filter((s) => s.validation === "approved").length}`}
          tone="success"
        />
        <InfoCard
          icon={<Wallet className="size-4" />}
          label="Paid out"
          value={`${task.submissions.filter((s) => s.payout === "paid").length}`}
          tone="success"
        />
      </section>

      {task.status === "paid" && (
        <StellarPayoutReceipt payouts={task.payouts} taskCurrency={task.currency} />
      )}

      {task.status === "paid" && <AnchorSettlement taskId={task.id} />}

      <section className="rounded-xl border bg-card shadow-[var(--shadow-card)] overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-medium">Submissions</h2>
          <span className="text-xs text-muted-foreground">{task.submissions.length}</span>
        </div>
        {task.submissions.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No submissions yet. Use the action button above to simulate the next step.
          </div>
        ) : (
          <ul className="divide-y">
            {task.submissions.map((submission) => (
              <li key={submission.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{submission.user}</span>
                      {submission.handle && <span className="text-xs text-muted-foreground">{submission.handle}</span>}
                    </div>
                    <p className="mt-1 text-sm text-foreground/90">{submission.response}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <Pill tone={submission.validation === "approved" ? "success" : submission.validation === "rejected" ? "danger" : "warning"}>
                        Validation: {submission.validation}
                      </Pill>
                      <Pill tone={submission.payout === "paid" ? "success" : submission.payout === "processing" ? "info" : "muted"}>
                        Payout: {submission.payout}
                      </Pill>
                      {submission.txHash && (
                        <a
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-mono"
                          href={`https://stellar.expert/explorer/public/tx/${submission.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          tx {submission.txHash} <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function getPrimaryAction(
  taskId: string,
  status: "created" | "sent" | "submitted" | "approved" | "paid",
  title: string,
  submissions: Array<{ id: string; validation: "pending" | "approved" | "rejected"; payout: "pending" | "processing" | "paid" }>,
) {
  if (status === "created") {
    return {
      label: "Send to Telegram",
      hint: "Prepare distribution with the task agent and simulate Telegram delivery.",
      icon: <Send className="size-4" />,
      action: () => sendTask(taskId),
    };
  }

  if (status === "sent") {
    return {
      label: "Simulate submission",
      hint: "Create a demo worker response to move the task into submitted status.",
      icon: <MessageSquarePlus className="size-4" />,
      action: () =>
        submitTask(taskId, {
          user: "Demo worker",
          handle: "@taskloop_demo",
          walletAddress: "GBDEMO123TASKLOOP",
          response: `Task completed for \"${title}\". Category identified and main color confirmed.`,
        }),
    };
  }

  if (status === "submitted") {
    const pendingSubmission = submissions.find((submission) => submission.validation === "pending");
    return {
      label: "Validate & pay",
      hint: pendingSubmission
        ? "Send the latest pending submission to the validation agent. If approved, payout runs automatically."
        : "No pending submission is available for validation.",
      icon: <ShieldCheck className="size-4" />,
      action: () => approveTask(taskId, pendingSubmission?.id),
    };
  }

  if (status === "approved") {
    const payableSubmission = submissions.find(
      (submission) => submission.validation === "approved" && submission.payout !== "paid",
    );
    return {
      label: "Retry payout",
      hint: payableSubmission
        ? "Validation already passed. Retry the payout service and simulate a Stellar Testnet transaction."
        : "No approved unpaid submission is available.",
      icon: <Wallet className="size-4" />,
      action: () => payoutTask(taskId, payableSubmission?.id),
    };
  }

  return null;
}

function InfoCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "success" | "info" | "muted";
}) {
  const toneClass =
    tone === "success" ? "text-success-foreground" : tone === "info" ? "text-info-foreground" : "text-muted-foreground";

  return (
    <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className={`flex items-center gap-2 text-xs uppercase tracking-wider ${toneClass}`}>
        {icon}
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Pill({ tone, children }: { tone: "success" | "warning" | "info" | "danger" | "muted"; children: React.ReactNode }) {
  const map = {
    success: "bg-success/15 text-success-foreground border-success/30",
    warning: "bg-warning/15 text-warning-foreground border-warning/40",
    info: "bg-info/15 text-info-foreground border-info/30",
    danger: "bg-destructive/15 text-destructive border-destructive/30",
    muted: "bg-muted text-muted-foreground border-border",
  };

  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border ${map[tone]}`}>{children}</span>;
}
