import { useState, useEffect } from "react";
import type { View } from "../App";
import { useAuth } from "../auth";
import * as api from "../api";
import type { VirtualTeacher, QuizResult, QuizGradeResult } from "../../shared/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input, Label } from "./ui/input";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { ClipboardList, ArrowLeft, CheckCircle, XCircle, RotateCcw, Minus, Plus, Timer } from "lucide-react";

type Step = "select" | "loading" | "quiz" | "result";

export function StudentQuiz({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { requireAuth } = useAuth();
  const [subjects, setSubjects] = useState<VirtualTeacher[]>([]);
  const [selected, setSelected] = useState("");
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [step, setStep] = useState<Step>("select");
  const [quiz, setQuiz] = useState<(QuizResult & { teacherId: string; teacherName: string; subject: string }) | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [gradeResult, setGradeResult] = useState<QuizGradeResult | null>(null);

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
        const result = await api.generateStudentQuiz(topic.trim(), "E përzgjedhur", selected, numQuestions, t);
        setQuiz(result);
        setAnswers(new Array(result.questions.length).fill(null));
        setGradeResult(null);
        setStep("quiz");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gabim gjatë gjenerimit.");
        setStep("select");
      }
    });
  }

  function selectAnswer(qIdx: number, oIdx: number) {
    const next = [...answers];
    next[qIdx] = oIdx;
    setAnswers(next);
  }

  function submitQuiz() {
    if (!quiz) return;
    requireAuth(async (t) => {
      setStep("loading");
      try {
        const result = await api.gradeStudentQuiz(
          answers as number[],
          quiz.questions.map((q) => ({ id: q.id, type: q.type, question: q.question, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation })),
          topic,
          quiz.subject,
          t,
        );
        setGradeResult(result);
        setStep("result");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gabim gjatë vlerësimit.");
        setStep("quiz");
      }
    });
  }

  function resetQuiz() {
    setQuiz(null);
    setGradeResult(null);
    setAnswers([]);
    setTopic("");
    setStep("select");
  }

  const current = subjects.find((s) => s.id === selected);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <button onClick={() => onNavigate("student-dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
        <ArrowLeft className="h-4 w-4" /> Kthehu
      </button>

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald to-accent text-2xl text-white shadow-glow">
          📝
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Testo veten</h1>
          <p className="mt-1 text-sm text-muted-foreground">Zgjidh lëndën dhe sa pyetje do — shiko menjëherë sa ke mësuar.</p>
        </div>
      </div>

      {step === "select" && (
        <div className="space-y-5">
          {err && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>}

          {/* Lëndët — rrjetë kartelash */}
          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">Zgjidh lëndën</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition ${
                    selected === s.id
                      ? "border-emerald bg-emerald/10 scale-[1.03] shadow-soft"
                      : "border-border hover:border-emerald/50"
                  }`}
                >
                  <span className="text-3xl">{s.emoji}</span>
                  <span className="text-xs font-semibold text-center text-foreground">{s.subject}</span>
                </button>
              ))}
            </div>
          </div>

          <Card className="border-emerald/20">
            <CardHeader>
              <CardTitle>Si do ta ndërtojmë?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {current && (
                <p className="rounded-lg bg-emerald/10 px-3 py-2 text-sm text-emerald">
                  Po bëjmë kuiz për <b>{current.emoji} {current.subject}</b>
                </p>
              )}
              <div>
                <Label>Mbi çfarë do të jesh?</Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="p.sh. Sistemi Diellor, Tabla e përmbajtjes..."
                  onKeyDown={(e) => e.key === "Enter" && generate()}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-muted/30 px-4 py-3">
                <span className="text-sm font-medium text-foreground">Sa pyetje?</span>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => setNumQuestions((n) => Math.max(3, n - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center text-lg font-bold text-foreground">{numQuestions}</span>
                  <Button variant="outline" size="icon" onClick={() => setNumQuestions((n) => Math.min(15, n + 1))}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button onClick={generate} disabled={!topic.trim()} className="w-full bg-gradient-to-r from-emerald to-accent text-white hover:brightness-110">
                <ClipboardList className="h-4 w-4" /> Nis kuizin
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "loading" && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <p className="text-center text-sm text-muted-foreground">Po gjejmë pyetjet...</p>
        </div>
      )}

      {step === "quiz" && quiz && (
        <div className="space-y-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <Badge className="bg-emerald/15 text-emerald">{quiz.subject}</Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Timer className="h-3.5 w-3.5" /> {quiz.questions.length} pyetje
            </span>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{quiz.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {quiz.questions.map((q, qi) => (
                <div key={q.id} className="space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    <span className="mr-1 text-emerald">{qi + 1}.</span> {q.question}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => selectAnswer(qi, oi)}
                        className={`rounded-lg border p-3 text-left text-sm transition ${
                          answers[qi] === oi
                            ? "border-emerald bg-emerald/10 shadow-soft"
                            : "border-border hover:border-emerald/50"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <Button onClick={submitQuiz} disabled={answers.includes(null)} className="w-full bg-gradient-to-r from-emerald to-accent text-white hover:brightness-110">
                Dërgo përgjigjet
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "result" && gradeResult && quiz && (
        <div className="space-y-4 animate-fade-up">
          <Card className="border-emerald/20">
            <CardHeader>
              <CardTitle>Si e pase?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-gradient-to-r from-emerald to-accent p-6 text-center text-white">
                <p className="text-4xl font-bold">{gradeResult.score}/{gradeResult.total}</p>
                <p className="mt-1 text-sm opacity-90">
                  {gradeResult.total > 0 ? Math.round((gradeResult.score / gradeResult.total) * 100) : 0}% e saktë
                </p>
              </div>

              <p className="text-sm text-muted-foreground text-center">{gradeResult.summary}</p>

              {gradeResult.results.map((r, i) => {
                const q = quiz.questions.find((x) => x.id === r.questionId) || quiz.questions[i];
                return (
                  <div key={r.questionId} className={`rounded-xl border p-4 ${r.correct ? "border-emerald/30 bg-emerald/5" : "border-danger/30 bg-danger/5"}`}>
                    <div className="flex items-start gap-2">
                      {r.correct ? (
                        <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald" />
                      ) : (
                        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{q.question}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{r.feedback}</p>
                        {!r.correct && (
                          <p className="mt-1 text-xs text-emerald font-medium">Përgjigjja e saktë: {r.correctAnswer}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex gap-3">
                <Button variant="outline" onClick={resetQuiz} className="flex-1">
                  <RotateCcw className="h-4 w-4" /> Kuiz tjetër
                </Button>
                <Button onClick={() => onNavigate("student-dashboard")} className="flex-1 bg-gradient-to-r from-emerald to-accent text-white hover:brightness-110">
                  Kthehu në panel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
