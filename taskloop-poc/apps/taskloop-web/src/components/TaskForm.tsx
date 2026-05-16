import { useState } from "react";
import type { TaskInput } from "@/lib/tasks-store";

type Props = {
  initial?: Partial<TaskInput>;
  submitLabel?: string;
  onSubmit: (input: TaskInput) => Promise<void> | void;
};

export function TaskForm({ initial, submitLabel = "Create task", onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [reward, setReward] = useState(String(initial?.reward ?? "0.50"));
  const [currency, setCurrency] = useState<TaskInput["currency"]>(initial?.currency ?? "USDC");
  const [required, setRequired] = useState(String(initial?.required ?? "10"));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        title: title.trim(),
        instructions: instructions.trim(),
        reward: parseFloat(reward) || 0,
        currency,
        required: parseInt(required, 10) || 1,
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-6 shadow-[var(--shadow-card)] space-y-5">
      <Field label="Task title">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Verify product images"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </Field>

      <Field label="Instructions" hint="What exactly should the worker do?">
        <textarea
          required
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={5}
          placeholder="Be precise. One short paragraph works best."
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Reward per response">
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>
        <Field label="Currency">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as TaskInput["currency"])}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="USDC">USDC</option>
            <option value="XLM">XLM</option>
            <option value="EUR">EUR</option>
          </select>
        </Field>
        <Field label="Responses needed">
          <input
            required
            type="number"
            min="1"
            value={required}
            onChange={(e) => setRequired(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>
      </div>

      {submitError && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</div>}

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="text-xs text-muted-foreground">
          Total budget:{" "}
          <span className="font-medium text-foreground">
            {((parseFloat(reward) || 0) * (parseInt(required, 10) || 0)).toFixed(2)} {currency}
          </span>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md [background-image:var(--gradient-primary)] text-primary-foreground px-4 py-2 text-sm font-medium shadow-[var(--shadow-elegant)] hover:opacity-95 disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
