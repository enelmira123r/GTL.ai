import type { View } from "../App";
import { BookOpen, ClipboardList, Layers, PenTool, BarChart3, Target, Trophy, Sparkles } from "lucide-react";

export function StudentDashboard({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  if (view !== "student-dashboard") {
    return <div className="text-sm text-muted-foreground">Po ngarkohet...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Mirë se erdhe, Nxënës! 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">Zgjidh një mësues virtual dhe filloji të mësosh sot.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StudentCard icon={<BookOpen className="h-5 w-5" />} label="Mësimet" desc="Mëso të reja" onClick={() => onNavigate("student-lesson")} accent="from-primary to-royal" />
        <StudentCard icon={<ClipboardList className="h-5 w-5" />} label="Kuize" desc="Vërteto njohuritë" onClick={() => onNavigate("student-quiz")} accent="from-emerald to-accent" />
        <StudentCard icon={<Layers className="h-5 w-5" />} label="Fletë Studimi" desc="Mëso me flashcardet" onClick={() => onNavigate("student-flashcards")} accent="from-secondary to-royal" />
        <StudentCard icon={<PenTool className="h-5 w-5" />} label="Ushtrime" desc="Përpuno zgjidhjen" onClick={() => onNavigate("student-practice")} accent="from-accent to-emerald" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StudentCard icon={<BarChart3 className="h-5 w-5" />} label="Përparimi" desc="Shiko statistikat" onClick={() => onNavigate("student-progress")} accent="from-primary to-royal" />
        <StudentCard icon={<Target className="h-5 w-5" />} label="Qëllimet" desc="Cakto objektiva" onClick={() => onNavigate("student-goals")} accent="from-emerald to-accent" />
        <StudentCard icon={<Trophy className="h-5 w-5" />} label="Arritjet" desc="Shiko medaljet" onClick={() => onNavigate("student-achievements")} accent="from-secondary to-royal" />
        <StudentCard icon={<Sparkles className="h-5 w-5" />} label="Asistenti" desc="Bisedo me AI" onClick={() => onNavigate("assistant")} accent="from-accent to-emerald" />
      </div>
    </div>
  );
}

function StudentCard({ icon, label, desc, onClick, accent }: { icon: React.ReactNode; label: string; desc: string; onClick: () => void; accent: string }) {
  return (
    <button onClick={onClick} className="rounded-2xl border border-white/[0.06] bg-card/80 p-5 text-left transition hover:shadow-card">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-soft`}>
        {icon}
      </div>
      <p className="text-sm font-medium text-muted-foreground">{desc}</p>
      <p className="font-display text-lg font-bold text-foreground">{label}</p>
    </button>
  );
}
