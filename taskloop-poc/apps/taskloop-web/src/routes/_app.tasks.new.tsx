import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TaskForm } from "@/components/TaskForm";
import { createTask } from "@/lib/tasks-store";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/tasks/new")({
  component: NewTask,
});

function NewTask() {
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Create task</h1>
      <p className="text-sm text-muted-foreground mt-1">
        We'll deliver this to validated Telegram workers and pay them automatically once approved.
      </p>
      <div className="mt-8">
        <TaskForm
          onSubmit={async (input) => {
            const id = await createTask(input);
            await navigate({ to: "/tasks/$taskId", params: { taskId: id } });
          }}
        />
      </div>
    </div>
  );
}
