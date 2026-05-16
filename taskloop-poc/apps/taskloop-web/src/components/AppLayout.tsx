import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function AppLayout() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-[var(--gradient-subtle)]">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="size-8 rounded-lg [background-image:var(--gradient-primary)] flex items-center justify-center shadow-[var(--shadow-elegant)]">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold tracking-tight">TaskLoop</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Human-in-the-loop ops
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                pathname === "/" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/tasks/new"
              className="px-3 py-1.5 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              New task
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
