import { useState, useEffect } from "react";
import type { View } from "../App";
import { useAuth } from "../auth";
import * as api from "../api";
import type { ProgressReport } from "../../shared/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { ArrowLeft, TrendingUp, Target, BookOpen, Layers, Flame } from "lucide-react";

export function StudentProgress({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { requireAuth } = useAuth();
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    requireAuth(async (t) => {
      setLoading(true);
      try {
        const data = await api.getStudentProgress(t);
        setReport(data);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gabim gjatë ngarkimit të përparimit.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (err) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <button onClick={() => onNavigate("student-dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="h-4 w-4" /> Kthehu
        </button>
        <div className="rounded-xl bg-danger/10 p-4 text-center text-danger">{err}</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <button onClick={() => onNavigate("student-dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="h-4 w-4" /> Kthehu
        </button>
        <div className="text-center text-muted-foreground">Nuk ka të dhëna përparimi.</div>
      </div>
    );
  }

  const accuracyPercent = report.totalPossible > 0
    ? Math.round((report.totalScore / report.totalPossible) * 100)
    : 0;

  const stats = [
    { icon: <BookOpen className="h-5 w-5" />, label: "Aktivitete totale", value: report.totalActivities, accent: "from-primary to-royal", tint: "bg-primary/10 text-primary" },
    { icon: <Target className="h-5 w-5" />, label: "Kuize të bëra", value: report.totalQuizzes, accent: "from-emerald to-accent", tint: "bg-emerald/10 text-emerald" },
    { icon: <TrendingUp className="h-5 w-5" />, label: "Saktësi mesatare", value: `${accuracyPercent}%`, accent: "from-accent to-emerald", tint: "bg-accent/10 text-accent" },
    { icon: <Flame className="h-5 w-5" />, label: "Ditë radhazi", value: report.currentStreak, accent: "from-warning to-danger", tint: "bg-warning/10 text-warning" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <button onClick={() => onNavigate("student-dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
        <ArrowLeft className="h-4 w-4" /> Kthehu
      </button>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-primary/15 via-royal/10 to-transparent p-6 sm:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-royal text-2xl text-white shadow-glow">
            📊
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Përparimi</h1>
            <p className="mt-1 text-sm text-muted-foreground">Shiko statistikat dhe progresin tënd.</p>
          </div>
        </div>
      </div>

      {/* Statistikat */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/80 shadow-card">
            <div className={`h-1.5 w-full bg-gradient-to-r ${s.accent}`} />
            <div className="p-4 text-center">
              <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${s.tint}`}>
                {s.icon}
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Progresi sipas Lëndëve */}
      {Object.keys(report.bySubject).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Progresi sipas Lëndëve</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(report.bySubject).map(([subject, data]) => {
                const subjectAccuracy = data.totalPossible > 0
                  ? Math.round((data.totalScore / data.totalPossible) * 100)
                  : 0;
                return (
                  <div key={subject} className="rounded-xl border border-white/5 bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{subject}</h3>
                        <p className="text-xs text-muted-foreground">
                          {data.totalActivities} aktivitete • {data.quizzesTaken} kuize
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">{subjectAccuracy}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-royal"
                        style={{ width: `${subjectAccuracy}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aktivitetet e Fundit — timeline */}
      {report.recentActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Aktivitetet e Fundit</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-4 border-l border-white/10 pl-5">
              {report.recentActivities.slice(0, 5).map((activity) => (
                <li key={activity.id} className="relative">
                  <span className={`absolute -left-[26px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-background ${
                    activity.type === "lesson" ? "bg-primary" :
                    activity.type === "quiz" || activity.type === "quiz_submit" ? "bg-emerald" :
                    activity.type === "flashcards" ? "bg-secondary" :
                    "bg-accent"
                  }`} />
                  <div className="flex items-center justify-between rounded-lg border border-white/5 bg-muted/20 p-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        activity.type === "lesson" ? "bg-primary/10 text-primary" :
                        activity.type === "quiz" || activity.type === "quiz_submit" ? "bg-emerald/10 text-emerald" :
                        activity.type === "flashcards" ? "bg-secondary/10 text-secondary" :
                        "bg-accent/10 text-accent"
                      }`}>
                        {activity.type === "lesson" ? <BookOpen className="h-4 w-4" /> :
                         activity.type === "quiz" || activity.type === "quiz_submit" ? <Target className="h-4 w-4" /> :
                         activity.type === "flashcards" ? <Layers className="h-4 w-4" /> :
                         <TrendingUp className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{activity.topic}</p>
                        <p className="text-xs text-muted-foreground">{activity.subject}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {activity.score !== undefined && activity.total !== undefined && (
                        <p className="text-sm font-medium text-foreground">{activity.score}/{activity.total}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleDateString("sq-AL")}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Button onClick={() => onNavigate("student-dashboard")} className="w-full bg-gradient-to-r from-primary to-royal hover:brightness-110">
        Kthehu në Dashboard
      </Button>
    </div>
  );
}
