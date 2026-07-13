import { useState, useEffect } from "react";
import type { View } from "../App";
import { useAuth } from "../auth";
import * as api from "../api";
import type { Achievement } from "../../shared/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Trophy, ArrowLeft, Lock, CheckCircle, Star } from "lucide-react";

export function StudentAchievements({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { requireAuth } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    requireAuth(async (t) => {
      try {
        const data = await api.getStudentAchievements(t);
        setAchievements(data.achievements);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gabim gjatë ngarkimit.");
      } finally {
        setLoading(false);
      }
    });
  }, [requireAuth]);

  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);
  const percent = achievements.length > 0 ? Math.round((unlocked.length / achievements.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <button onClick={() => onNavigate("student-dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
        <ArrowLeft className="h-4 w-4" /> Kthehu
      </button>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-yellow-400/15 via-orange-500/10 to-transparent p-6 sm:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-yellow-400/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-2xl text-white shadow-glow">
            🏆
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Arritjet</h1>
            <p className="mt-1 text-sm text-muted-foreground">Shiko medaljet dhe arritjet e tua të fituara.</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {!loading && err && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>}

      {!loading && !err && (
        <div className="space-y-6 animate-fade-up">
          {/* Përmbledhja */}
          <Card className="border-yellow-400/20 bg-gradient-to-br from-yellow-400/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-glow">
                  <Trophy className="h-8 w-8" />
                </div>
                <div>
                  <p className="font-display text-3xl font-bold text-foreground">
                    {unlocked.length} <span className="text-muted-foreground">/ {achievements.length}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">Arritje të fituara</p>
                </div>
                <div className="ml-auto">
                  <div className="h-20 w-20">
                    <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-muted/30"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${percent}, 100`}
                        className="text-yellow-400"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Arritjet e fituara */}
          {unlocked.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald" /> Arritje të Fituara
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {unlocked.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 rounded-xl border border-yellow-400/30 bg-gradient-to-br from-yellow-400/10 to-transparent p-4 shadow-soft">
                      <span className="text-2xl drop-shadow">{a.icon || "🏅"}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{a.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                        {a.unlockedAt && (
                          <p className="mt-2 flex items-center gap-1 text-xs text-yellow-500">
                            <Star className="h-3 w-3" /> {new Date(a.unlockedAt).toLocaleDateString("sq-AL")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Arritjet e bllokuara */}
          {locked.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-muted-foreground" /> Arritje të Bllokuara
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {locked.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 rounded-xl border border-white/5 bg-muted/30 p-4 opacity-60">
                      <span className="text-2xl grayscale">{a.icon || "🔒"}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{a.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {achievements.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Ende nuk ke arritje. Fillo të mësosh për të fituar arritje të reja!
                </p>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" onClick={() => onNavigate("student-dashboard")} className="w-full">
            Kthehu në Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
