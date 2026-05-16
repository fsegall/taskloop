import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getTask, loadTask } from "@/lib/tasks-store";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/tasks/$taskId/edit")({
  component: EditTask,
});

function EditTask() {
  const { taskId } = Route.useParams();
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

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        to="/tasks/$taskId"
        params={{ taskId }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="size-4" /> Back to task
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Edit task</h1>
      <p className="text-sm text-muted-foreground mt-1">
        The API MVP is currently focused on the lifecycle flow only. Task editing will be added in a later iteration.
      </p>
      <div className="mt-8 rounded-xl border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="text-sm text-muted-foreground">Current title</div>
        <div className="mt-1 font-medium">{task.title}</div>
        <div className="mt-5 text-sm text-muted-foreground">Current instructions</div>
        <div className="mt-1 text-sm">{task.instructions}</div>
      </div>
    </div>
  );
}
