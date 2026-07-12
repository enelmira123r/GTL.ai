import { useAuth } from "../auth";
import type { View } from "../App";
import { Card, CardContent, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  FileText,
  MessagesSquare,
  BookOpen,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const QUICK = [
  {
    id: "exam" as View,
    title: "Krijo Provim",
    desc: "Gjenero provime Word me grupe të ndryshme.",
    icon: FileText,
    accent: "from-primary to-royal",
  },
  {
    id: "assistant" as View,
    title: "Asistenti i Studimit",
    desc: "Shpjego, përmbledh dhe bëj fletë studimi.",
    icon: MessagesSquare,
    accent: "from-emerald to-accent",
  },
  {
    id: "exam" as View,
    title: "Biblioteka botimepegi.al",
    desc: "Zgjidh nga librat digjitalë (1–12).",
    icon: BookOpen,
    accent: "from-secondary to-royal",
  },
];

export function Dashboard({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { isAuthed, email } = useAuth();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Dashboard{isAuthed && email ? ` · ${email.split("@")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Mirë se erdhe, Mësuese!</p>
        </div>
        {isAuthed ? (
          <Badge variant="success">Identifikuar</Badge>
        ) : (
          <Badge variant="outline">Pa llogari</Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-0">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-royal text-white shadow-soft">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">∞</p>
              <p className="text-xs text-muted-foreground">Materiale të ngarkuara</p>
            </div>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald to-accent text-white shadow-soft">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">New</p>
              <p className="text-xs text-muted-foreground">Provime të gjeneruara</p>
            </div>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-royal text-white shadow-soft">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">AI</p>
              <p className="text-xs text-muted-foreground">Fuqia e Inteligjencës Artificiale</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="font-display mb-3 text-lg font-semibold text-foreground">Veprime të shpejta</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK.map((q) => {
            const Icon = q.icon;
            return (
              <Card key={q.title} className="group p-0 transition hover:shadow-card">
                <button onClick={() => onNavigate(q.id)} className="block w-full text-left">
                  <CardContent className="p-5">
                    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${q.accent} text-white shadow-soft`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{q.title}</CardTitle>
                    <CardDescription className="mt-1">{q.desc}</CardDescription>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-secondary opacity-0 transition group-hover:opacity-100">
                      Hap <ArrowRight className="h-4 w-4" />
                    </span>
                  </CardContent>
                </button>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="overflow-hidden border-secondary/20 bg-gradient-to-br from-primary to-royal text-white">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="font-display text-lg font-bold">Gati të krijosh provimin tënd?</p>
            <p className="mt-1 text-sm text-white/80">
              Zgjidh librin ose ngjit materialin — AI bën pjesën tjetër.
            </p>
          </div>
          <Button variant="secondary" onClick={() => onNavigate("exam")}>
            Fillo tani <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
