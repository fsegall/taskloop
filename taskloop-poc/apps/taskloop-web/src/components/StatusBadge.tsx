import { STATUS_LABEL, type TaskStatus } from "@/lib/mock-tasks";

const variants: Record<TaskStatus, string> = {
  created: "bg-muted text-muted-foreground",
  sent: "bg-info/15 text-info-foreground border border-info/30",
  submitted: "bg-warning/15 text-warning-foreground border border-warning/40",
  approved: "bg-accent/20 text-accent-foreground border border-accent/40",
  paid: "bg-success/20 text-success-foreground border border-success/40",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${variants[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABEL[status]}
    </span>
  );
}
