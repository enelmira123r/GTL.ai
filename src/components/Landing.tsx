import type { View } from "../App";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  GraduationCap,
  Sparkles,
  FileText,
  Camera,
  MessageSquare,
  BookOpen,
  CheckCircle2,
  Quote,
  ArrowRight,
  Star,
} from "lucide-react";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Bibliotekë librash",
    desc: "Zgjidh direkt nga të gjithë librat digjitalë të botimepegi.al (klasat 1–12).",
  },
  {
    icon: FileText,
    title: "Hyrje fleksibël",
    desc: "Libër me link, PDF, tekst i ngjitur ose foto e një faqeje — Gemini lexon nga imazhi.",
  },
  {
    icon: Sparkles,
    title: "Provim me grupe",
    desc: "Gjeneron deri në 6 variante të ndryshme (Grupi A, B, C…), secili në faqe veçmas.",
  },
  {
    icon: MessageSquare,
    title: "Asistenti i Studimit",
    desc: "Shpjegon, përmbledh, thjeshton dhe bën fletë studimi vetëm nga materiali yt.",
  },
  {
    icon: Camera,
    title: "Pikë sipas vështirësisë",
    desc: "Çdo pyetje merr pikë sipas peshës; totali e tabela e notimit dalin natyrshëm.",
  },
  {
    icon: CheckCircle2,
    title: "Pamje paraprake falas",
    desc: "Shihe provimin pa llogari; shkarko si Word kur identifikohesh.",
  },
];

const STEPS = [
  { n: "1", title: "Zgjidh materialin", desc: "Ngjit tekstin, ngarko një PDF, vendos një link libri ose bëj foto." },
  { n: "2", title: "Cakto opsionet", desc: "Lënda, klasa, tremujori, sa grupe dhe sa pyetje." },
  { n: "3", title: "Gjenero & shkarko", desc: "AI krijon provimin Word gati për printim — shkarko me llogari." },
];

export function Landing({ onNavigate }: { onNavigate: (v: View) => void }) {
  return (
    <div className="mx-auto max-w-6xl space-y-20 px-4 pb-20 pt-10 sm:px-8">
      {/* Hero */}
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <Badge variant="secondary" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> i fuqizuar nga Google Gemini
          </Badge>
          <h1 className="font-display text-4xl font-extrabold leading-tight text-foreground sm:text-5xl">
            GTL.ai — <span className="text-gradient">krijo provime</span> dhe mëso me AI
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Merr përmbajtjen e një libri ose mësimi dhe gjenero, me ndihmën e AI-së, një
            provim Word për printim — në shqip. Falas dhe pa përpjekje.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={() => onNavigate("exam")}>
              Krijo Provim <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => onNavigate("assistant")}>
              Provo Asistentin
            </Button>
            <Button size="lg" variant="secondary" onClick={() => onNavigate("login")}>
              Hyr
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-accent" /> Pa kartë krediti</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-accent" /> Në shqip</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-accent" /> Word gati për printim</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-navy/10 to-royal/10 blur-2xl" />
          <Card className="overflow-hidden shadow-card">
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-5 py-3">
              <div className="h-3 w-3 rounded-full bg-danger/60" />
              <div className="h-3 w-3 rounded-full bg-warning/60" />
              <div className="h-3 w-3 rounded-full bg-accent/60" />
              <span className="ml-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <GraduationCap className="h-4 w-4 text-secondary" /> DETYRË PËRMBLEDHËSE
              </span>
            </div>
            <CardContent className="space-y-3 p-6 text-sm text-foreground">
              <p className="font-semibold">LËNDA : Gjeografi&nbsp;&nbsp;&nbsp;KLASA : 8&nbsp;&nbsp;&nbsp;GRUPI : A</p>
              <ol className="space-y-2">
                <li>1. Cila është forma më e ulët relievi në Shqipëri? <span className="font-semibold text-secondary">(3 pikë)</span></li>
                <li>2. Rendit tri lumenj kryesorë të vendit. <span className="font-semibold text-secondary">(4 pikë)</span></li>
                <li>3. Shpjego ndryshimin midis klimës mesdhetare dhe kontinentale. <span className="font-semibold text-secondary">(5 pikë)</span></li>
              </ol>
              <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/60 px-4 py-2 text-xs">
                <span className="font-bold">NOTA</span>
                <span className="font-bold">4 5 6 7 8 9 10</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold text-foreground">Çfarë bën GTL.ai</h2>
          <p className="mt-2 text-muted-foreground">Të gjitha veçoritë që mësuesit duan — në një vend.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="p-0 transition hover:shadow-card">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-royal text-white shadow-soft">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold text-foreground">Si funksionon</h2>
          <p className="mt-2 text-muted-foreground">Tri hapa dhe provimi yt është gati.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <Card key={s.n} className="relative p-0">
              <CardContent className="p-6">
                <span className="font-display text-5xl font-extrabold text-secondary/20">{s.n}</span>
                <h3 className="mt-2 font-display text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section>
        <Card className="overflow-hidden border-secondary/20 bg-gradient-to-br from-primary to-royal text-white">
          <CardContent className="p-8 sm:p-10">
            <Quote className="h-8 w-8 text-white/40" />
            <p className="mt-4 font-display text-xl font-semibold leading-relaxed">
              "GTL.ai më kursen orë të tëra çdo javë. Zgjedh librin, caktoj tremujorin dhe kam
              gjashtë variante provimi gati për printim brenda pak sekondash."
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 font-bold">
                M
              </div>
              <div>
                <p className="text-sm font-semibold">Mësues</p>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <section className="text-center">
        <h2 className="font-display text-3xl font-bold text-foreground">Gati të fillosh?</h2>
        <p className="mt-2 text-muted-foreground">Krijo provimin tënd të parë — falas, pa llogari.</p>
        <div className="mt-6 flex justify-center">
          <Button size="lg" onClick={() => onNavigate("exam")}>
            Krijo Provim tani <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
        Krijuar nga <span className="font-semibold text-foreground">Enel</span> për projektin e TIK-ut · GTL.ai
      </footer>
    </div>
  );
}
