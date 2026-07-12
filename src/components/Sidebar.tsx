import { useAuth } from "../auth";
import type { View } from "../App";
import { cn } from "../lib/utils";
import {
  LayoutDashboard,
  FileText,
  MessagesSquare,
  Home,
  GraduationCap,
  History,
  LogOut,
  X,
  BookOpen,
  ClipboardList,
  Layers,
  PenTool,
  BarChart3,
  Target,
  Trophy,
} from "lucide-react";

type SidebarMode = "teacher" | "student";

export function Sidebar({
  view,
  onNavigate,
  open,
  onClose,
  showHistory,
  mode = "teacher",
}: {
  view: View;
  onNavigate: (v: View) => void;
  open: boolean;
  onClose: () => void;
  showHistory: boolean;
  mode?: SidebarMode;
}) {
  const { email, isAuthed, logout } = useAuth();

  const TEACHER_ITEMS: { id: View; label: string; icon: typeof Home }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "exam", label: "Krijo Provim", icon: FileText },
    ...(showHistory
      ? [{ id: "tests" as View, label: "Provimet e ruajtura", icon: History }]
      : []),
    { id: "assistant", label: "Asistenti", icon: MessagesSquare },
    { id: "home", label: "Faqja kryesore", icon: Home },
  ];

  const STUDENT_ITEMS: { id: View; label: string; icon: typeof Home }[] = [
    { id: "student-dashboard", label: "Kryefaqja", icon: Home },
    { id: "student-lesson", label: "Mësimet", icon: BookOpen },
    { id: "student-quiz", label: "Kuize", icon: ClipboardList },
    { id: "student-flashcards", label: "Fletë", icon: Layers },
    { id: "student-practice", label: "Ushtrime", icon: PenTool },
    { id: "student-progress", label: "Përparimi", icon: BarChart3 },
    { id: "student-goals", label: "Qëllimet", icon: Target },
    { id: "student-achievements", label: "Arritjet", icon: Trophy },
  ];

  const ITEMS = mode === "student" ? STUDENT_ITEMS : TEACHER_ITEMS;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-card px-4 py-5 transition-transform duration-200 lg:sticky lg:top-16 lg:z-0 lg:h-[calc(100vh-4rem)] lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-6 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-royal text-white shadow-glow">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">GTL.ai</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Mbyll"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            const active = view === it.id;
            return (
              <button
                key={it.id}
                onClick={() => {
                  onNavigate(it.id);
                  onClose();
                }}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-gradient-to-r from-primary to-royal text-white shadow-soft"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {it.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl border border-border bg-muted/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {isAuthed ? (email ?? "?").charAt(0).toUpperCase() : "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {isAuthed ? email : "Jo i kyçur"}
              </p>
              <p className="text-xs text-muted-foreground">
                {mode === "student" ? "Llogari nxënësi" : "Llogari mësuesi"}
              </p>
            </div>
            {isAuthed && (
              <button
                onClick={() => { logout(); onNavigate("home"); }}
                aria-label="Dil"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-card hover:text-danger"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
