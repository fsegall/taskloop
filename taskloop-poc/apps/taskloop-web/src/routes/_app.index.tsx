import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { loadTasks, resetDemoTasks, seedDemoTasks, useTasks, useTasksMeta } from "@/lib/tasks-store";
import { ArrowUpRight, Plus, RotateCcw, Send, Wallet, CheckCircle2, DatabaseZap } from "lucide-react";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function Dashboard() {
  const tasks = useTasks();
  const { isLoading, hasLoaded, error } = useTasksMeta();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!hasLoaded) {
      void loadTasks().catch(() => undefined);
    }
  }, [hasLoaded]);

  const totalPaid = tasks
    .flatMap((t) => t.submissions)
    .filter((s) => s.payout === "paid").length;
  const inFlight = tasks.filter((t) => t.status !== "paid" && t.status !== "created").length;
  const totalReward = tasks.reduce((acc, t) => acc + t.reward * t.required, 0);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Distribute microtasks to humans on Telegram. Pay automatically on approval.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              setIsSeeding(true);
              try {
                await seedDemoTasks();
              } finally {
                setIsSeeding(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary/60 disabled:opacity-60"
            disabled={isSeeding || isResetting}
          >
            <DatabaseZap className="size-4" /> {isSeeding ? "Loading seed..." : "Load demo seed"}
          </button>
          <button
            type="button"
            onClick={async () => {
              setIsResetting(true);
              try {
                await resetDemoTasks();
                await loadTasks(true);
              } finally {
                setIsResetting(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary/60 disabled:opacity-60"
            disabled={isSeeding || isResetting}
          >
            <RotateCcw className="size-4" /> {isResetting ? "Clearing..." : "Clear memory"}
          </button>
          <Link
            to="/tasks/new"
            className="inline-flex items-center gap-2 rounded-md [background-image:var(--gradient-primary)] text-primary-foreground px-4 py-2 text-sm font-medium shadow-[var(--shadow-elegant)] hover:opacity-95"
          >
            <Plus className="size-4" /> New task
          </Link>
        </div>
      </section>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<Send className="size-4" />} label="In flight" value={inFlight} hint="Active tasks" />
        <Stat icon={<CheckCircle2 className="size-4" />} label="Submissions paid" value={totalPaid} />
        <Stat
          icon={<Wallet className="size-4" />}
          label="Budget allocated"
          value={`$${totalReward.toFixed(2)}`}
          hint="Across all tasks"
        />
      </section>

      <section className="rounded-xl border bg-card shadow-[var(--shadow-card)] overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-medium">All tasks</h2>
          <span className="text-xs text-muted-foreground">{tasks.length} total</span>
        </div>
        {isLoading && tasks.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">Loading tasks from API...</div>
        ) : tasks.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No tasks yet. Create one or load the demo seed.
          </div>
        ) : (
          <ul className="divide-y">
            {tasks.map((t) => (
              <li key={t.id}>
                <Link
                  to="/tasks/$taskId"
                  params={{ taskId: t.id }}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/40 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{t.id}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="mt-1 font-medium truncate">{t.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t.submissions.length}/{t.required} responses · {t.reward} {t.currency} each
                    </div>
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
