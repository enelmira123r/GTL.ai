import { useRef, useState } from "react";
import type { ExamSource, ExamData } from "../../shared/types";
import { MAX_SCORE_OPTIONS } from "../../shared/types";
import * as api from "../api";
import { BOOKS } from "../books";
import { ExamPreview } from "./ExamPreview";
import { useAuth } from "../auth";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Input, Textarea, Label, Select } from "./ui/input";
import { Badge } from "./ui/badge";

const COUNTS = [5, 8, 10, 12, 15];
const ALLOWED_IMG = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Nuk u lexua dot skedari."));
    reader.readAsDataURL(file);
  });
}

type Mode = "text" | "pdf" | "url" | "image";

const MODES: { id: Mode; label: string }[] = [
  { id: "text", label: "Tekst" },
  { id: "pdf", label: "PDF" },
  { id: "url", label: "Link" },
  { id: "image", label: "Foto" },
];

export function ExamBuilder() {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [lenda, setLenda] = useState("");
  const [klasa, setKlasa] = useState("");
  const [numGroups, setNumGroups] = useState(2);
  const [maxScore, setMaxScore] = useState(100);
  const [tremujori, setTremujori] = useState("");
  const [numQuestions, setNumQuestions] = useState(8);
  const [fromPage, setFromPage] = useState("");
  const [toPage, setToPage] = useState("");

  const [genLoading, setGenLoading] = useState(false);
  const [examErr, setExamErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<ExamData | null>(null);
  const [dlLoading, setDlLoading] = useState(false);
  const [dlErr, setDlErr] = useState<string | null>(null);

  const { token, email: userEmail, isAuthed, logout, requireAuth } = useAuth();

  function handleFile(f: File | undefined) {
    if (!f) return;
    if (mode === "pdf") {
      if (f.type !== "application/pdf") {
        setFileErr("Lejohet vetëm skedar PDF.");
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        setFileErr("PDF-ja është shumë e madhe (maksimum 10MB).");
        return;
      }
    } else if (mode === "image") {
      if (!ALLOWED_IMG.includes(f.type)) {
        setFileErr("Përdor PNG, JPG, WEBP ose GIF.");
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        setFileErr("Fotografia është shumë e madhe (maksimum 10MB).");
        return;
      }
    }
    setFileErr(null);
    setFile(f);
  }

  const urlOk = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+.*/i.test(url.trim());
  const canSubmit =
    mode === "text"
      ? text.trim().length >= 20
      : mode === "pdf" || mode === "image"
        ? !!file
        : urlOk;

  async function buildSource(): Promise<ExamSource | null> {
    if (mode === "text") return { kind: "text", text: text.trim() };
    if (mode === "url") return { kind: "url", url: url.trim() };
    if (file) {
      const b64 = await readAsBase64(file);
      if (mode === "pdf")
        return { kind: "pdf", pdfBase64: b64, fileName: file.name };
      return { kind: "image", imageBase64: b64, fileName: file.name, mimeType: file.type };
    }
    return null;
  }

  async function handleGenerate() {
    if (!canSubmit || genLoading) return;
    const src = await buildSource();
    if (!src) return;
    setGenLoading(true);
    setExamErr(null);
    setPreview(null);
    setDlErr(null);
    try {
      const data = await api.generateExam(
        {
          source: src,
          numGroups,
          numQuestions,
          maxScore,
          tremujori,
          lenda,
          klasa,
          fromPage: parseInt(fromPage, 10) || 0,
          toPage: parseInt(toPage, 10) || 0,
        },
        token,
      );
      setPreview(data);
    } catch (e) {
      setExamErr(e instanceof Error ? e.message : "Gabim gjatë gjenerimit të provimit.");
    } finally {
      setGenLoading(false);
    }
  }

  function handleDownload() {
    if (!preview || dlLoading) return;
    requireAuth(async (tk) => {
      setDlLoading(true);
      setDlErr(null);
      try {
        await api.downloadExamDocx(preview, tk);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Gabim gjatë shkarkimit.";
        setDlErr(msg);
        if (/identifik|401/i.test(msg)) logout();
      } finally {
        setDlLoading(false);
      }
    });
  }

  const classes = [...new Set(BOOKS.map((b) => b.klasa))].sort(
    (a, b) => Number(a) - Number(b),
  );
  function subjectFromTitle(t: string): string {
    return t.replace(/\s+\d+$/, "").trim();
  }
  function pickBook(bookUrl: string) {
    if (!bookUrl) {
      setUrl("");
      return;
    }
    const b = BOOKS.find((x) => x.url === bookUrl);
    if (!b) return;
    setMode("url");
    setUrl(b.url);
    setLenda(subjectFromTitle(b.title));
    setKlasa(b.klasa);
  }

  const pill = (active: boolean) =>
    `h-10 rounded-lg border text-sm font-semibold transition-all duration-150 ${
      active
        ? "border-transparent bg-gradient-to-r from-primary to-royal text-white shadow-soft"
        : "border-border bg-card text-muted-foreground hover:border-secondary/50 hover:text-foreground"
    }`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Krijo Provim</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gjenero provime Word me AI — me grupe të ndryshme dhe pikë sipas vështirësisë.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Biblioteka botimepegi.al</CardTitle>
          <CardDescription>Zgjidh direkt nga librat digjitalë (klasat 1–12).</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={mode === "url" ? url : ""} onChange={(e) => pickBook(e.target.value)}>
            <option value="">— Zgjidh një libër ({BOOKS.length} libra) —</option>
            {classes.map((c) => (
              <optgroup key={c} label={`Klasa ${c}`}>
                {BOOKS.filter((b) => b.klasa === c).map((b) => (
                  <option key={b.url} value={b.url}>
                    {b.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Nga vjen mësimi?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {MODES.map((m) => (
              <button key={m.id} onClick={() => { setMode(m.id); setFile(null); setFileErr(null); }} className={pill(mode === m.id)}>
                {m.label}
              </button>
            ))}
          </div>

          {mode === "text" ? (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ngjit këtu tekstin e mësimit ose kapitullit…"
              rows={9}
              className="resize-y"
            />
          ) : mode === "pdf" ? (
            <div>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center transition-colors hover:border-secondary hover:bg-muted"
              >
                <span className="text-2xl text-secondary">{file ? "✓" : "+"}</span>
                <span className="font-semibold text-foreground">
                  {file ? file.name : "Kliko për të zgjedhur një PDF"}
                </span>
                <span className="text-sm text-muted-foreground">
                  {file ? "Kliko sërish për ta ndryshuar" : "Kapitull ose libër (maks. 10MB)"}
                </span>
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {fileErr && <p className="mt-2 text-sm text-danger">{fileErr}</p>}
            </div>
          ) : mode === "url" ? (
            <div>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…  (link te libri digjital ose PDF)"
              />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Funksionon me linke <b>publike</b>: libra digjitalë (flipbook si botimepegi.al),
                PDF direkt, ose faqe interneti.
              </p>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center transition-colors hover:border-secondary hover:bg-muted"
              >
                <span className="text-2xl text-secondary">{file ? "✓" : "+"}</span>
                <span className="font-semibold text-foreground">
                  {file ? file.name : "Ngarko ose bëj foto të një faqeje"}
                </span>
                <span className="text-sm text-muted-foreground">
                  {file ? "Kliko sërish për ta ndryshuar" : "PNG, JPG, WEBP ose GIF (maks. 10MB)"}
                </span>
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {fileErr && <p className="mt-2 text-sm text-danger">{fileErr}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Detajet e provimit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Lënda</Label>
              <Input value={lenda} onChange={(e) => setLenda(e.target.value)} placeholder="p.sh. Gjeografi" />
            </div>
            <div className="space-y-1.5">
              <Label>Klasa</Label>
              <Input value={klasa} onChange={(e) => setKlasa(e.target.value)} placeholder="p.sh. 8" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tremujori (opsionale)</Label>
            <div className="flex flex-wrap gap-2">
              {[["", "—"], ["I", "I"], ["II", "II"], ["III", "III"]].map(([val, label]) => (
                <button key={label} onClick={() => setTremujori(val)} className={`min-w-[3rem] px-3 ${pill(tremujori === val)}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pikët maksimale të provimit</Label>
            <div className="flex flex-wrap gap-2">
              {MAX_SCORE_OPTIONS.map((s) => (
                <button key={s} onClick={() => setMaxScore(s)} className={`h-10 px-4 ${pill(maxScore === s)}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sa grupe (variante të ndryshme)?</Label>
            <div className="flex flex-wrap items-center gap-2">
              {[1, 2, 3, 4, 5, 6].map((g) => (
                <button key={g} onClick={() => setNumGroups(g)} className={`w-10 ${pill(numGroups === g)}`}>
                  {g}
                </button>
              ))}
              <div className="flex items-center rounded-lg border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setNumGroups((g) => Math.max(1, g - 1))}
                  className="px-3 py-2 text-lg font-semibold text-muted-foreground hover:text-secondary"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={numGroups}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setNumGroups(Number.isNaN(v) ? 1 : Math.max(1, Math.min(30, v)));
                  }}
                  className="w-14 bg-transparent text-center text-sm font-semibold text-foreground outline-none"
                />
                <button
                  type="button"
                  onClick={() => setNumGroups((g) => Math.min(30, g + 1))}
                  className="px-3 py-2 text-lg font-semibold text-muted-foreground hover:text-secondary"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Numri i pyetjeve (për çdo grup)</Label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-lg border border-border bg-card">
                <button type="button" onClick={() => setNumQuestions((q) => Math.max(1, q - 1))} className="px-3.5 py-2 text-lg font-semibold text-muted-foreground hover:text-secondary">
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={numQuestions}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setNumQuestions(Number.isNaN(v) ? 1 : Math.max(1, Math.min(25, v)));
                  }}
                  className="w-12 bg-transparent text-center text-sm font-semibold text-foreground outline-none"
                />
                <button type="button" onClick={() => setNumQuestions((q) => Math.min(25, q + 1))} className="px-3.5 py-2 text-lg font-semibold text-muted-foreground hover:text-secondary">
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {COUNTS.map((c) => (
                  <button key={c} onClick={() => setNumQuestions(c)} className={`h-9 px-3.5 ${pill(numQuestions === c)}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Zgjidh me faqe (vetëm për libra me link)</Label>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Nga faqja</span>
              <Input
                type="number"
                min={1}
                value={fromPage}
                onChange={(e) => setFromPage(e.target.value)}
                placeholder="—"
                className="w-24"
              />
              <span>deri te faqja</span>
              <Input
                type="number"
                min={1}
                value={toPage}
                onChange={(e) => setToPage(e.target.value)}
                placeholder="—"
                className="w-24"
              />
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={!canSubmit || genLoading} size="lg" className="w-full">
            {genLoading ? `Po gjenerohen ${numGroups} provime…` : `Gjenero ${numGroups} provim${numGroups > 1 ? "e" : ""}`}
          </Button>
          {examErr && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{examErr}</p>
          )}
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Pamja paraprake</CardTitle>
              <Badge variant="success">{preview.exams.length} grupe</Badge>
            </div>
            <CardDescription>
              Shihe provimin më poshtë. Për ta shkarkuar si Word, identifikohu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {preview.savedPath && (
              <p className="break-all rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                ✓ Ruajtur automatikisht në PC: <code className="text-foreground">{preview.savedPath}</code>
              </p>
            )}

            <ExamPreview data={preview} />

            {isAuthed && (
              <p className="text-sm text-muted-foreground">
                Identifikuar si <b className="text-foreground">{userEmail}</b>
              </p>
            )}
            <Button onClick={handleDownload} disabled={dlLoading} size="lg" className="w-full">
              {dlLoading ? "Po shkarkohet…" : isAuthed ? "Shkarko Word (.docx)" : "🔒 Identifikohu & shkarko"}
            </Button>
            {!isAuthed && (
              <p className="text-center text-xs text-muted-foreground">
                Falas · pas hyrjes shkarkimi nis vetë.
              </p>
            )}
            {dlErr && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{dlErr}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
