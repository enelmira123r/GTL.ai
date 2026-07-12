import { useAuth } from "../auth";
import type { View } from "../App";
import { Button } from "./ui/button";
import { GraduationCap, Bell, Menu, Search } from "lucide-react";

export function Topbar({
  title,
  onMenu,
  onNavigate,
}: {
  title: string;
  onMenu: () => void;
  onNavigate: (v: View) => void;
}) {
  const { isAuthed, email, openAuth } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-xl sm:px-6">
      <button
        onClick={onMenu}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground lg:hidden"
        aria-label="Hap menynë"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2.5 lg:hidden">
        <button onClick={() => onNavigate("home")} className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-royal text-white">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-bold text-foreground">GTL.ai</span>
        </button>
      </div>

      <h1 className="hidden text-lg font-semibold text-foreground sm:block">{title}</h1>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Kërko…"
            className="h-10 w-56 rounded-lg border border-border bg-muted/50 pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          />
        </div>
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Njoftimet"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-accent" />
        </button>

        {isAuthed ? (
          <div className="flex h-10 items-center gap-2 rounded-lg border border-border px-2.5 text-sm font-medium text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {(email ?? "?").charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-[10rem] truncate sm:block">{email}</span>
          </div>
        ) : (
          <Button size="sm" variant="gradient" onClick={openAuth}>
            Hyr
          </Button>
        )}
      </div>
    </header>
  );
}
