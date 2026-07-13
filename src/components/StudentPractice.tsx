import { useState, useEffect } from "react";
import type { View } from "../App";
import { useAuth } from "../auth";
import * as api from "../api";
import type { VirtualTeacher, PracticeResult } from "../../shared/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input, Label, Select } from "./ui/input";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { PenTool, ArrowLeft, RotateCcw, Eye, EyeOff, CheckCircle, Lightbulb } from "lucide-react";

type Step = "select" | "loading" | "study";

export function StudentPractice({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { requireAuth } = useAuth();
  const [subjects, setSubjects] = useState<VirtualTeacher[]>([]);
  const [selected, setSelected] = useState("");
  const [topic, setTopic] = useState("");
  const [step, setStep] = useState<Step>("select");
  const [practice, setPractice] = useState<(PracticeResult & { teacherId: string; teacherName: string; subject: string }) | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [showSolutions, setShowSolutions] = useState<boolean[]>([]);
  const [userSolutions, setUserSolutions] = useState<string[]>([]);

  useEffect(() => {
    api.getVirtualTeachers().then((r) => {
      setSubjects(r.teachers);
      if (r.teachers.length > 0) setSelected(r.teachers[0].id);
    }).catch(() => {});
  }, []);

  async function generate() {
    if (!topic.trim()) return;
    requireAuth(async (t) => {
      setStep("loading");
      setErr(null);
      try {
        const result = await api.generateStudentPractice(topic.trim(), "E përzgjedhur", selected, t);
        setPractice(result);
        setShowSolutions(new Array(result.problems.length).fill(false));
        setUserSolutions(new Array(result.problems.length).fill(""));
        setStep("study");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gabim gjatë gjenerimit.");
        setStep("select");
      }
    });
  }

  function toggleSolution(idx: number) {
    setShowSolutions((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  }

  function resetPractice() {
    setPractice(null);
    setShowSolutions([]);
    setUserSolutions([]);
    setTopic("");
    setStep("select");
  }

  const current = subjects.find((s) => s.id === selected);

  function difficultyColor(d: string) {
    if (d === "easy") return "text-emerald";
    if (d === "medium") return "text-yellow-500";
    return "text-danger";
  }

  function difficultyLabel(d: string) {
    if (d === "easy") return "E lehtë";
    if (d === "medium") return "Mesatare";
    return "E vështirë";
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <button onClick={() => onNavigate("student-dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
        <ArrowLeft className="h-4 w-4" /> Kthehu
      </button>

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-emerald text-2xl text-white shadow-glow">
          ✍️
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Ushtrohu</h1>
          <p className="mt-1 text-sm text-muted-foreground">Zgjidh lëndën dhe merr ushtrime me zgjidhje të plota — provo veten.</p>
        </div>
      </div>

      {step === "select" && (
        <div className="space-y-5">
          {err && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>}

          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle>Fleta e ushtrimeve</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Lënda</Label>
                <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.emoji} {s.subject}
                    </option>
                  ))}
                </Select>
              </div>
              {current && (
                <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
                  Po ushtrojmë në <b>{current.emoji} {current.subject}</b>
                </p>
              )}
              <div>
                <Label>Mbi çfarë do të ushtrohesh?</Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="p.sh. Ekuacione lineare, Fotosinteza..."
                  onKeyDown={(e) => e.key === "Enter" && generate()}
                />
              </div>
              <Button onClick={generate} disabled={!topic.trim()} className="w-full bg-gradient-to-r from-accent to-emerald text-white hover:brightness-110">
                <PenTool className="h-4 w-4" /> Gjenero fletën
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "loading" && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <p className="text-center text-sm text-muted-foreground">Po gjejmë ushtrime...</p>
        </div>
      )}

      {step === "study" && practice && (
        <div className="space-y-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <Badge className="bg-accent/15 text-accent">{practice.subject}</Badge>
            <span className="text-xs text-muted-foreground">{practice.problems.length} ushtrime · {practice.teacherName}</span>
          </div>

          {practice.problems.map((p, i) => (
            <Card key={p.id} className="border-accent/15">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Ushtrimi {i + 1}</span>
                  <span className={`text-xs font-semibold ${difficultyColor(p.difficulty)}`}>
                    {difficultyLabel(p.difficulty)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed text-foreground">{p.question}</p>

                <div>
                  <Label className="text-xs">Përgjigjja jotë (opsionale)</Label>
                  <Input
                    value={userSolutions[i]}
                    onChange={(e) => {
                      const next = [...userSolutions];
                      next[i] = e.target.value;
                      setUserSolutions(next);
                    }}
                    placeholder="Shkruaj këtu..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => toggleSolution(i)}>
                    {showSolutions[i] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showSolutions[i] ? "Fshih zgjidhjen" : "Shiko zgjidhjen"}
                  </Button>
                </div>

                {showSolutions[i] && (
                  <div className="space-y-2 rounded-xl border border-emerald/20 bg-emerald/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald">
                      <CheckCircle className="h-4 w-4" /> Zgjidhja
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-foreground">{p.solution}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Lightbulb className="h-3 w-3" /> {p.hint}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex gap-3">
            <Button variant="outline" onClick={resetPractice} className="flex-1">
              <RotateCcw className="h-4 w-4" /> Ushtrim tjetër
            </Button>
            <Button onClick={() => onNavigate("student-dashboard")} className="flex-1 bg-gradient-to-r from-accent to-emerald text-white hover:brightness-110">
              Kthehu në panel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
