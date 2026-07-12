import { useState } from "react";
import { AuthProvider } from "./auth";
import { ExamBuilder } from "./components/ExamBuilder";
import { StudyAssistant } from "./components/StudyAssistant";
import { Dashboard } from "./components/Dashboard";
import { Topbar } from "./components/Topbar";
import { Sidebar } from "./components/Sidebar";
import { Landing } from "./components/Landing";
import { SavedTests } from "./components/SavedTests";

export type View = "home" | "dashboard" | "exam" | "assistant" | "tests";

const TITLES: Record<View, string> = {
  home: "GTL.ai",
  dashboard: "Dashboard",
  exam: "Krijo Provim",
  assistant: "Asistenti i Studimit",
  tests: "Provimet e ruajtura",
};

export default function App() {
  const [view, setView] = useState<View>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = (v: View) => {
    setView(v);
    setSidebarOpen(false);
  };

  return (
    <AuthProvider>
      <div className="relative min-h-screen overflow-hidden bg-background">
        {/* Sfond modern me "glow" orbs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-royal/20 blur-[130px]" />
          <div className="absolute -right-40 top-1/4 h-[32rem] w-[32rem] rounded-full bg-primary/20 blur-[130px]" />
          <div className="absolute bottom-0 left-1/4 h-[30rem] w-[30rem] rounded-full bg-accent/10 blur-[130px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,92,252,0.06),transparent_60%)]" />
        </div>

        <Topbar title={TITLES[view]} onMenu={() => setSidebarOpen((o) => !o)} onNavigate={navigate} />

        {view === "home" ? (
          <Landing onNavigate={navigate} />
        ) : (
          <div className="mx-auto flex max-w-7xl">
            <Sidebar
              view={view}
              onNavigate={navigate}
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />
            <main key={view} className="min-w-0 flex-1 animate-fade-up px-4 py-8 sm:px-8">
              {view === "dashboard" ? (
                <Dashboard onNavigate={navigate} />
              ) : view === "exam" ? (
                <ExamBuilder />
              ) : view === "tests" ? (
                <SavedTests onNavigate={navigate} />
              ) : (
                <StudyAssistant />
              )}
            </main>
          </div>
        )}
      </div>
    </AuthProvider>
  );
}
