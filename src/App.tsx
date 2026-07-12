import { useState } from "react";
import { AuthProvider } from "./auth";
import { ExamBuilder } from "./components/ExamBuilder";
import { StudyAssistant } from "./components/StudyAssistant";
import { Dashboard } from "./components/Dashboard";
import { Topbar } from "./components/Topbar";
import { Sidebar } from "./components/Sidebar";
import { Landing } from "./components/Landing";
import { LoginPage } from "./components/LoginPage";
import { SavedTests } from "./components/SavedTests";
import { StudentDashboard } from "./components/StudentDashboard";
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
  | "student-flashcards"
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
  "student-flashcards": "Fletë Studimi",
  "student-practice": "Ushtrime",
  "student-progress": "Përparimi",
  "student-history": "Historia",
  "student-goals": "Qëllimet",
  "student-achievements": "Arritjet",
};

const TEACHER_VIEWS: View[] = ["dashboard", "exam", "assistant", "tests"];
const STUDENT_VIEWS: View[] = [
  "student-dashboard",
  "student-lesson",
  "student-quiz",
  "student-flashcards",
  "student-practice",
  "student-progress",
  "student-history",
  "student-goals",
  "student-achievements",
];

function isStudentView(v: View): boolean {
  return v.startsWith("student-");
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

  const showTeacherSidebar = role === "teacher" || !isStudentView(view);
  const showStudentSidebar = role === "student" && isStudentView(view);

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
            <StudentDashboard view={view} onNavigate={navigate} />
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
