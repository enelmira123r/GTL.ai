import { useRef, useState } from "react";
import { Plus, Send, X, FileText, Sparkles, MessagesSquare } from "lucide-react";
import type { ExamSource, AssistIntent, AssistMessage } from "../../shared/types";
import * as api from "../api";
import { BOOKS } from "../books";
import { useAuth } from "../auth";
import { Button } from "./ui/button";
import { Input, Textarea, Label, Select } from "./ui/input";
import { Badge } from "./ui/badge";

const ALLOWED_IMG = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const INTENT: AssistIntent = "explain";

type Mode = "text" | "pdf" | "url" | "image";

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Nuk u lexua dot skedari."));
    reader.readAsDataURL(file);
  });
}

export function StudyAssistant() {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [showMaterial, setShowMaterial] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<AssistMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { isAuthed } = useAuth();

  const urlOk = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+.*/i.test(url.trim());
  const attached = !!file || text.trim().length > 0 || (mode === "url" && urlOk);

  function clearMaterial() {
    setText("");
    setUrl("");
    setFile(null);
    setFileErr(null);
    setMode("text");
  }

  function handleFile(f: File | undefined) {
    if (!f) return;
    if (mode === "pdf") {
      if (f.type !== "application/pdf" || f.size > 10 * 1024 * 1024) {
        setFileErr("PDF-ja është e pavlefshme ose shumë e madhe (maks. 10MB).");
        return;
      }
    } else if (mode === "image") {
      if (!ALLOWED_IMG.includes(f.type) || f.size > 10 * 1024 * 1024) {
        setFileErr("Përdor PNG, JPG, WEBP ose GIF (maks. 10MB).");
        return;
      }
    }
    setFileErr(null);
    setFile(f);
  }

  async function buildSource(): Promise<ExamSource | null> {
    if (mode === "text" && text.trim()) return { kind: "text", text: text.trim() };
    if (mode === "url" && urlOk) return { kind: "url", url: url.trim() };
    if (file) {
      const b64 = await readAsBase64(file);
      if (mode === "pdf") return { kind: "pdf", pdfBase64: b64, fileName: file.name };
      return { kind: "image", imageBase64: b64, fileName: file.name, mimeType: file.type };
    }
    return null;
  }

  async function send(msg?: string) {
    const userMsg = (msg ?? message).trim();
    if (!userMsg || loading) return;
    const src = await buildSource();

    const nextHistory: AssistMessage[] = [...history, { role: "user", content: userMsg }];
    setHistory(nextHistory);
    setMessage("");
    setLoading(true);
    setErr(null);
    try {
      const r = await api.assist({ source: src ?? undefined, intent: INTENT, message: userMsg, history });
      setHistory([...nextHistory, { role: "assistant", content: r.answer }]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Asistenti nuk u përgjigj.");
      setHistory(nextHistory);
    } finally {
      setLoading(false);
    }
  }

  const classes = [...new Set(BOOKS.map((b) => b.klasa))].sort((a, b) => Number(a) - Number(b));
  function pickBook(bookUrl: string) {
    if (!bookUrl) return setUrl("");
    const b = BOOKS.find((x) => x.url === bookUrl);
    if (!b) return;
    setMode("url");
    setUrl(b.url);
  }

  const materialLabel = file
    ? file.name
    : text.trim()
      ? "Tekst i ngjitur"
      : mode === "url" && urlOk
        ? "Link libri"
        : "";

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <header className="flex items-end justify-between gap-3 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Asistenti</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bisedo lirisht për çdo gjë — ose shto një material me <b>+</b> për përgjigje të bazuara te ai.
          </p>
        </div>
        {!isAuthed && <Badge variant="outline">Pa llogari · falas</Badge>}
      </header>

      {/* Biseda */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {history.length === 0 && !loading && (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-royal text-white shadow-glow">
              <MessagesSquare className="h-7 w-7" />
            </div>
            <p className="font-display text-lg font-semibold text-foreground">
              Përshëndetje! Çfarë do të dish sot?
            </p>
            <p className="mt-1 max-w-sm text-sm">
              Shkruaj çfarëdo — pa material ose shto një libër / PDF / tekst me butonin <b>+</b> më poshtë.
            </p>
          </div>
        )}

        {history.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-gradient-to-r from-primary to-royal text-white"
                  : "border border-white/5 bg-card/80 text-foreground backdrop-blur-xl"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-secondary" />
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-secondary [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-secondary [animation-delay:300ms]" />
            Po përgatitet përgjigjja…
          </div>
        )}

        {err && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>
        )}
      </div>

      {/* Paneli i materialit (opsional, pas +) */}
      {showMaterial && (
        <div className="mt-3 space-y-3 rounded-2xl border border-white/5 bg-card/70 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4 text-secondary" />
              Materiali (opsional)
            </div>
            <button
              onClick={() => setShowMaterial(false)}
              aria-label="Mbyll"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Select value={mode === "url" ? url : ""} onChange={(e) => pickBook(e.target.value)}>
            <option value="">— Libër nga biblioteka —</option>
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

          <div className="grid grid-cols-4 gap-2">
            {(["text", "pdf", "url", "image"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setFile(null);
                  setFileErr(null);
                }}
                className={`h-9 rounded-lg border text-sm font-semibold transition ${
                  mode === m
                    ? "border-transparent bg-gradient-to-r from-primary to-royal text-white shadow-soft"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "text" ? "Tekst" : m === "pdf" ? "PDF" : m === "url" ? "Link" : "Foto"}
              </button>
            ))}
          </div>

          {mode === "text" ? (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ngjit tekstin e mësimit…"
              rows={4}
              className="resize-y"
            />
          ) : mode === "url" ? (
            <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          ) : (
            <div>
              <input
                ref={fileInput}
                type="file"
                accept={mode === "pdf" ? "application/pdf" : "image/*"}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-foreground"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {file && <p className="mt-2 truncate text-xs text-muted-foreground">{file.name}</p>}
            </div>
          )}
          {fileErr && <p className="text-sm text-danger">{fileErr}</p>}
        </div>
      )}

      {/* Çipi i materialit të bashkangjitur */}
      {attached && !showMaterial && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-secondary/20 bg-secondary/10 px-3 py-2">
          <span className="flex min-w-0 items-center gap-2 text-sm text-secondary">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="truncate font-medium">{materialLabel}</span>
          </span>
          <button
            onClick={clearMaterial}
            aria-label="Hiq materialin"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-secondary transition hover:bg-secondary/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Rreshti i input-it */}
      <div className="flex items-end gap-2 border-t border-white/5 pt-4">
        <Button
          variant={showMaterial ? "secondary" : "ghost"}
          size="icon"
          onClick={() => setShowMaterial((o) => !o)}
          aria-label="Shto material"
          className="shrink-0"
        >
          <Plus className={`h-5 w-5 transition-transform ${showMaterial ? "rotate-45" : ""}`} />
        </Button>
        <div className="flex-1">
          <Label className="sr-only">Mesazhi</Label>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Shkruaj çfarëdo…"
          />
        </div>
        <Button onClick={() => send()} disabled={!message.trim() || loading} className="shrink-0">
          <Send className="h-4 w-4" />
          Dërgo
        </Button>
      </div>
    </div>
  );
}
