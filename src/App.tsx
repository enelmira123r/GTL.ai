import { useState } from "react";
import { ExamBuilder } from "./components/ExamBuilder";
import { StudyAssistant } from "./components/StudyAssistant";
import { Dashboard } from "./components/Dashboard";
import { Topbar } from "./components/Topbar";
import { Sidebar } from "./components/Sidebar";
import { Landing } from "./components/Landing";
import { LoginPage } from "./components/LoginPage";
import { SavedTests } from "./components/SavedTests";
import { StudentDashboard } from "./components/StudentDashboard";
import { StudentLesson } from "./components/StudentLesson";
import { StudentQuiz } from "./components/StudentQuiz";
import { StudentPractice } from "./components/StudentPractice";
import { StudentProgress } from "./components/StudentProgress";
import { StudentAchievements } from "./components/StudentAchievements";
import { useAuth } from "./auth";

export type View =
  | "home"
  | "login"
  | "register"
  | "dashboard"
  | "exam"
  | "assistant"
  | "tests"
  | "student-dashboard"
  | "student-lesson"
  | "student-quiz"
  | "student-practice"
  | "student-progress"
  | "student-history"
  | "student-goals"
  | "student-achievements";

const TITLES: Record<View, string> = {
  home: "GTL.ai",
  login: "Hyr",
  register: "Regjistrohu",
  dashboard: "Dashboard",
  exam: "Krijo Provim",
  assistant: "Asistenti i Studimit",
  tests: "Provimet e ruajtura",
  "student-dashboard": "Dashboard - Nxënës",
  "student-lesson": "Mësimet",
  "student-quiz": "Kuize",
  "student-practice": "Ushtrime",
  "student-progress": "Përparimi",
  "student-history": "Historia",
  "student-goals": "Qëllimet",
  "student-achievements": "Arritjet",
};

function isStudentView(v: View): boolean {
  return v.startsWith("student-");
}

function StudentView({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  if (view === "student-dashboard") {
    return <StudentDashboard view={view} onNavigate={onNavigate} />;
  }
  switch (view) {
    case "student-lesson":
      return <StudentLesson onNavigate={onNavigate} />;
    case "student-quiz":
      return <StudentQuiz onNavigate={onNavigate} />;
    case "student-practice":
      return <StudentPractice onNavigate={onNavigate} />;
    case "student-progress":
      return <StudentProgress onNavigate={onNavigate} />;
    case "student-achievements":
      return <StudentAchievements onNavigate={onNavigate} />;
    default:
      return (
        <div className="mx-auto max-w-3xl space-y-6">
          <button onClick={() => onNavigate("student-dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            ← Kthehu
          </button>
          <div className="rounded-2xl border border-white/[0.06] bg-card/80 p-10 text-center">
            <p className="text-lg font-semibold text-foreground">Po përgatitet...</p>
            <p className="mt-1 text-sm text-muted-foreground">Kjo pamje do të jetë e disponueshme së shpejti.</p>
          </div>
        </div>
      );
  }
}

export default function App() {
  const [view, setViewState] = useState<View>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const { role, isAuthed } = useAuth();

  function navigate(v: View) {
    setViewState(v);
    setSidebarOpen(false);
  }

  if (role === "student" && isAuthed) {
    if (!isStudentView(view) && view !== "assistant") {
      setViewState("student-dashboard");
    }
  }

  const isStudentMode = role === "student" && isAuthed;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-royal/20 blur-[130px]" />
        <div className="absolute -right-40 top-1/4 h-[32rem] w-[32rem] rounded-full bg-primary/20 blur-[130px]" />
        <div className="absolute bottom-0 left-1/4 h-[30rem] w-[30rem] rounded-full bg-accent/10 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,92,252,0.06),transparent_60%)]" />
      </div>

      <Topbar title={TITLES[view]} onMenu={() => setSidebarOpen((o) => !o)} onNavigate={navigate} />

      {view === "home" ? (
        <Landing onNavigate={navigate} />
      ) : view === "login" ? (
        <LoginPage onNavigate={(v) => navigate(v as View)} />
      ) : isStudentMode && isStudentView(view) ? (
        <div className="mx-auto flex max-w-7xl">
          <Sidebar
            view={view}
            onNavigate={navigate}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            showHistory={hasGenerated}
            mode="student"
          />
          <main key={view} className="min-w-0 flex-1 animate-fade-up px-4 py-8 sm:px-8">
            <StudentView view={view} onNavigate={navigate} />
          </main>
        </div>
      ) : (
        <div className="mx-auto flex max-w-7xl">
          <Sidebar
            view={view}
            onNavigate={navigate}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            showHistory={hasGenerated}
            mode="teacher"
          />
          <main key={view} className="min-w-0 flex-1 animate-fade-up px-4 py-8 sm:px-8">
            {view === "dashboard" ? (
              <Dashboard onNavigate={navigate} />
            ) : view === "exam" ? (
              <ExamBuilder onGenerated={() => setHasGenerated(true)} />
            ) : view === "tests" ? (
              <SavedTests onNavigate={navigate} />
            ) : (
              <StudyAssistant />
            )}
          </main>
        </div>
      )}
    </div>
  );
}

