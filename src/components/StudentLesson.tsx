import { useState, useEffect } from "react";
import type { View } from "../App";
import { useAuth } from "../auth";
import * as api from "../api";
import type { VirtualTeacher, LessonResult } from "../../shared/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input, Label, Select } from "./ui/input";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { BookOpen, ArrowLeft, CheckCircle, Lightbulb, BookMarked, HelpCircle, Layers } from "lucide-react";

type Step = "select" | "loading" | "result" | "quiz";

export function StudentLesson({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { requireAuth } = useAuth();
  const [subjects, setSubjects] = useState<VirtualTeacher[]>([]);
  const [selected, setSelected] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("mesatar");
  const [step, setStep] = useState<Step>("select");
  const [lesson, setLesson] = useState<(LessonResult & { teacherId: string; teacherName: string; subject: string }) | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

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
        const result = await api.generateStudentLesson(topic.trim(), "E përzgjedhur", selected, level, t);
        setLesson(result);
        setQuizAnswers(new Array(result.quickQuiz.length).fill(null));
        setQuizSubmitted(false);
        setStep("result");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gabim gjatë gjenerimit.");
        setStep("select");
      }
    });
  }

  function selectQuizAnswer(qIdx: number, oIdx: number) {
    if (quizSubmitted) return;
    const next = [...quizAnswers];
    next[qIdx] = oIdx;
    setQuizAnswers(next);
  }

  function submitQuiz() {
    setQuizSubmitted(true);
  }

  const current = subjects.find((s) => s.id === selected);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <button onClick={() => onNavigate("student-dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
        <ArrowLeft className="h-4 w-4" /> Kthehu
      </button>

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-royal text-2xl text-white shadow-glow">
          📚
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Mëso një temë</h1>
          <p className="mt-1 text-sm text-muted-foreground">Zgjidh lëndën, shkruaj temën dhe lëshohe psherë — ne e shpjegojmë hap pas hapi.</p>
        </div>
      </div>

      {step === "select" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
          {/* Lëndët — listë vertikale */}
          <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" /> Lëndët
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                    selected === s.id
                      ? "border-primary bg-primary/15 shadow-soft"
                      : "border-border hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  <span className="text-2xl">{s.emoji}</span>
                  <span className="flex-1 text-sm font-semibold text-foreground">{s.subject}</span>
                  {selected === s.id && <CheckCircle className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Ndërtuesi i mësimit */}
          <Card>
            <CardHeader>
              <CardTitle>Ndërto mësimin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {err && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>}
              {current && (
                <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
                  Lënda e zgjedhur: <b>{current.emoji} {current.subject}</b>
                </p>
              )}
              <div>
                <Label>Çfarë do të mësosh sot?</Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="p.sh. Të dhënat, Forcat, Gerundet, Fotosinteza..."
                  onKeyDown={(e) => e.key === "Enter" && generate()}
                />
              </div>
              <div>
                <Label>Thellësia</Label>
                <Select value={level} onChange={(e) => setLevel(e.target.value)}>
                  <option value="lehte">Hyrëse</option>
                  <option value="mesatar">Mesatare</option>
                  <option value="veshtire">Thellë</option>
                </Select>
              </div>
              <Button onClick={generate} disabled={!topic.trim()} className="w-full bg-gradient-to-r from-primary to-royal hover:brightness-110">
                <BookOpen className="h-4 w-4" /> Nis mësimin
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "loading" && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <p className="text-center text-sm text-muted-foreground">Po përgatisim mësimin për ty...</p>
        </div>
      )}

      {step === "result" && lesson && (
        <div className="space-y-6 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge className="bg-primary/15 text-primary">{lesson.subject}</Badge>
            <span className="text-xs text-muted-foreground">Mësuesi: {lesson.teacherName}</span>
          </div>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl">{lesson.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{lesson.summary}</p>
            </CardContent>
          </Card>

          {lesson.keyPoints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" /> Pikat kryesore
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {lesson.keyPoints.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {p}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {lesson.terms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookMarked className="h-5 w-5 text-secondary" /> Fjalët kyçe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lesson.terms.map((t, i) => (
                    <div key={i} className="rounded-xl border border-white/5 bg-muted/50 p-3">
                      <p className="text-sm font-semibold text-foreground">{t.term}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t.definition}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {lesson.examples.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-accent" /> Shembuj
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {lesson.examples.map((ex, i) => (
                    <li key={i} className="rounded-lg bg-muted/50 p-3 text-sm text-foreground">{ex}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {lesson.quickQuiz.length > 0 && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" /> Provo veten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lesson.quickQuiz.map((q, qi) => {
                  const isCorrect = quizSubmitted && quizAnswers[qi] === q.correctIndex;
                  return (
                    <div key={qi} className="space-y-2">
                      <p className="text-sm font-medium text-foreground">{qi + 1}. {q.question}</p>
                      <div className="grid grid-cols-1 gap-2">
                        {q.options.map((opt, oi) => {
                          let cls = "border-border hover:border-primary/50";
                          if (quizSubmitted) {
                            if (oi === q.correctIndex) cls = "border-emerald bg-emerald/10";
                            else if (oi === quizAnswers[qi]) cls = "border-danger bg-danger/10";
                          } else if (quizAnswers[qi] === oi) {
                            cls = "border-primary bg-primary/10";
                          }
                          return (
                            <button
                              key={oi}
                              onClick={() => selectQuizAnswer(qi, oi)}
                              className={`rounded-lg border p-2.5 text-left text-sm transition ${cls}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {quizSubmitted && (
                        <p className={`text-xs ${isCorrect ? "text-emerald" : "text-danger"}`}>
                          {isCorrect ? "✅ Saktë!" : `❌ Përgjigjja e saktë: ${q.options[q.correctIndex]}`}
                          <br /><span className="text-muted-foreground">{q.explanation}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
                {!quizSubmitted ? (
                  <Button onClick={submitQuiz} disabled={quizAnswers.includes(null)} className="w-full bg-gradient-to-r from-primary to-royal hover:brightness-110">
                    Kontrollo përgjigjet
                  </Button>
                ) : (
                  <div className="rounded-xl bg-primary/10 p-4 text-center">
                    <p className="text-lg font-bold text-foreground">
                      {quizAnswers.filter((a, i) => a === lesson.quickQuiz[i].correctIndex).length} / {lesson.quickQuiz.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Përgjigje të sakta</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {lesson.practiceExercise.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ushtrimi i ditës</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lesson.practiceExercise.map((ex, i) => (
                  <PracticeExercise key={i} exercise={ex} index={i} />
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setStep("select"); setLesson(null); setTopic(""); }} className="flex-1">
              Mësim tjetër
            </Button>
            <Button onClick={() => onNavigate("student-dashboard")} className="flex-1 bg-gradient-to-r from-primary to-royal hover:brightness-110">
              Kthehu në panel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PracticeExercise({ exercise, index }: { exercise: { question: string; hint: string; answer: string }; index: number }) {
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="rounded-xl border border-white/5 bg-muted/30 p-4 space-y-2">
      <p className="text-sm font-medium text-foreground">{index + 1}. {exercise.question}</p>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => setShowHint(!showHint)}>
          {showHint ? "Fshih ndihmën" : "Ndihmë 💡"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowAnswer(!showAnswer)}>
          {showAnswer ? "Fshih zgjidhjen" : "Shiko zgjidhjen"}
        </Button>
      </div>
      {showHint && <p className="text-xs text-muted-foreground italic">💡 {exercise.hint}</p>}
      {showAnswer && <p className="text-xs text-emerald font-medium">✅ {exercise.answer}</p>}
    </div>
  );
}
