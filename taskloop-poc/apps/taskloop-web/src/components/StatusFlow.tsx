import { Check } from "lucide-react";
import { STATUS_FLOW, STATUS_LABEL, type TaskStatus } from "@/lib/mock-tasks";

export function StatusFlow({ current }: { current: TaskStatus }) {
  const idx = STATUS_FLOW.indexOf(current);
  return (
    <div className="flex items-center w-full">
      {STATUS_FLOW.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2 min-w-0">
              <div
                className={`size-9 rounded-full flex items-center justify-center text-xs font-medium border transition-colors ${
                  done
                    ? "bg-success text-success-foreground border-transparent"
                    : active
                      ? "[background-image:var(--gradient-primary)] text-primary-foreground border-transparent shadow-[var(--shadow-elegant)]"
                      : "bg-card text-muted-foreground border-border"
                }`}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </div>
              <div
                className={`text-[11px] font-medium whitespace-nowrap ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {STATUS_LABEL[s]}
              </div>
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <div className="flex-1 h-px mx-2 mb-6 bg-gradient-to-r from-border to-border">
                <div
                  className={`h-full transition-all ${i < idx ? "bg-success w-full" : "w-0"}`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
