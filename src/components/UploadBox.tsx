import { useRef, useState } from "react";
import type { ExamSource, ExamData } from "../../shared/types";
import * as api from "../api";
import { BOOKS } from "../books";
import { ExamPreview } from "./ExamPreview";
import { useAuth } from "../auth";

const COUNTS = [5, 8, 10, 12, 15];

function readPdfAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Nuk u lexua dot skedari PDF."));
    reader.readAsDataURL(file);
  });
}

export function UploadBox() {
  const [mode, setMode] = useState<"text" | "pdf" | "url">("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Opsionet e provimit Word
  const [lenda, setLenda] = useState("");
  const [klasa, setKlasa] = useState("");
  const [numGroups, setNumGroups] = useState(2);
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
    if (f.type !== "application/pdf") {
      setFileErr("Lejohet vetëm skedar PDF.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setFileErr("PDF-ja është shumë e madhe (maksimum 10MB).");
      return;
    }
    setFileErr(null);
    setFile(f);
  }

  const urlOk = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+.*/i.test(url.trim());
  const canSubmit =
    mode === "text" ? text.trim().length >= 20 : mode === "pdf" ? !!file : urlOk;

  async function buildSource(): Promise<ExamSource | null> {
    if (mode === "text") return { kind: "text", text: text.trim() };
    if (mode === "pdf" && file)
      return { kind: "pdf", pdfBase64: await readPdfAsBase64(file), fileName: file.name };
    if (mode === "url") return { kind: "url", url: url.trim() };
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
    // Nëse s'je i kyçur, hapet modali; pas hyrjes shkarkimi nis vetë me token-in e ri.
    requireAuth(async (tk) => {
      setDlLoading(true);
      setDlErr(null);
      try {
        await api.downloadExamDocx(preview, tk);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Gabim gjatë shkarkimit.";
        setDlErr(msg);
        if (/identifik|401/i.test(msg)) logout(); // token i skaduar → dil
      } finally {
        setDlLoading(false);
      }
    });
  }

  // Zgjedhja e një libri nga biblioteka botimepegi.al
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

  const inputBase =
    "w-full rounded-lg border border-line bg-paper2 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:shadow-focus";

  // Gjendja aktive = cyan ndriçues; jo-aktive = sipërfaqe e errët
  const pill = (active: boolean) =>
    `rounded-lg border text-sm font-semibold transition-all duration-150 ${
      active
        ? "border-brand bg-brand text-white shadow-soft"
        : "border-line bg-paper2 text-ink-soft hover:border-accent/50 hover:text-ink"
    }`;

  return (
    <div className="card mx-auto max-w-2xl p-6 sm:p-8 animate-fade-up">
      {/* 0) Biblioteka botimepegi.al */}
      <label className="mb-1.5 block text-sm font-semibold text-ink">
        Zgjidh nga librat e botimepegi.al
      </label>
      <select
        value={mode === "url" ? url : ""}
        onChange={(e) => pickBook(e.target.value)}
        className="mb-6 w-full rounded-lg border border-line bg-paper2 px-3 py-2.5 text-sm font-medium text-ink outline-none transition focus:border-accent focus:shadow-focus"
      >
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
      </select>

      {/* 1) Burimi i mësimit */}
      <hr className="my-7 border-line" />
      <label className="mb-1.5 block text-sm font-semibold text-ink">
        1. Nga vjen mësimi?
      </label>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {(
          [
            ["text", "Tekst"],
            ["pdf", "PDF"],
            ["url", "Link"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg border py-2.5 text-sm font-semibold transition-all duration-150 ${
              mode === m
                ? "border-brand bg-brand text-white shadow-soft"
                : "border-line bg-paper2 text-ink-soft hover:border-accent/50 hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "text" ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ngjit këtu tekstin e mësimit ose kapitullit…"
          rows={8}
          className="w-full resize-y rounded-lg border border-line bg-paper2 p-3.5 text-[15px] leading-relaxed outline-none transition focus:border-accent focus:shadow-focus"
        />
      ) : mode === "pdf" ? (
        <div>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line bg-paper2 px-6 py-9 text-center transition-colors hover:border-accent hover:bg-paper"
          >
            <span className="text-2xl text-accent">{file ? "✓" : "+"}</span>
            <span className="font-semibold text-ink">
              {file ? file.name : "Kliko për të zgjedhur një PDF"}
            </span>
            <span className="text-sm text-ink-soft">
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
          {fileErr && <p className="mt-2 text-sm text-bad">{fileErr}</p>}
        </div>
      ) : (
        <div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…  (link te libri digjital ose PDF)"
            className="w-full rounded-lg border border-line bg-paper2 px-3.5 py-3 text-[15px] outline-none transition focus:border-accent focus:shadow-focus"
          />
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            Funksionon me linke <b className="text-ink">publike</b>: libra digjitalë
            (flipbook si botimepegi.al), PDF direkt, ose faqe interneti.
          </p>
        </div>
      )}

      {/* 2) Të dhënat e provimit */}
      <hr className="my-7 border-line" />
      <label className="mb-1.5 block text-sm font-semibold text-ink">
        2. Detajet e provimit
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-medium text-ink-soft">
          Lënda
          <input
            value={lenda}
            onChange={(e) => setLenda(e.target.value)}
            placeholder="p.sh. Gjeografi"
            className={`mt-1 ${inputBase}`}
          />
        </label>
        <label className="text-xs font-medium text-ink-soft">
          Klasa
          <input
            value={klasa}
            onChange={(e) => setKlasa(e.target.value)}
            placeholder="p.sh. 8"
            className={`mt-1 ${inputBase}`}
          />
        </label>
      </div>

      {/* Tremujori */}
      <label className="mb-2 mt-5 block text-xs font-medium text-ink-soft">
        Tremujori (opsionale)
      </label>
      <div className="flex flex-wrap gap-2">
        {[
          ["", "—"],
          ["I", "I"],
          ["II", "II"],
          ["III", "III"],
        ].map(([val, label]) => (
          <button
            key={label}
            onClick={() => setTremujori(val)}
            className={`h-10 min-w-[3rem] px-3 ${pill(tremujori === val)}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grupet */}
      <label className="mb-2 mt-5 block text-xs font-medium text-ink-soft">
        Sa grupe (variante të ndryshme)?
      </label>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6].map((g) => (
          <button
            key={g}
            onClick={() => setNumGroups(g)}
            className={`h-10 w-10 ${pill(numGroups === g)}`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Numri i pyetjeve */}
      <label className="mb-2 mt-5 block text-xs font-medium text-ink-soft">
        Numri i pyetjeve (për çdo grup)
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-line bg-paper2">
          <button
            type="button"
            onClick={() => setNumQuestions((q) => Math.max(1, q - 1))}
            className="px-3.5 py-2 text-lg font-semibold text-ink-soft hover:text-accent"
          >
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
            className="w-12 bg-transparent text-center text-sm font-semibold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => setNumQuestions((q) => Math.min(25, q + 1))}
            className="px-3.5 py-2 text-lg font-semibold text-ink-soft hover:text-accent"
          >
            +
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {COUNTS.map((c) => (
            <button
              key={c}
              onClick={() => setNumQuestions(c)}
              className={`h-9 px-3.5 ${pill(numQuestions === c)}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Faqet (vetëm link) */}
      <label className="mb-1.5 mt-5 block text-xs font-medium text-ink-soft">
        Zgjidh me faqe (vetëm për libra me link)
      </label>
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
        <span>Nga faqja</span>
        <input
          type="number"
          min={1}
          value={fromPage}
          onChange={(e) => setFromPage(e.target.value)}
          placeholder="—"
          className="w-20 rounded-lg border border-line bg-paper2 px-3 py-2 text-sm text-ink outline-none transition focus:border-accent focus:shadow-focus [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span>deri te faqja</span>
        <input
          type="number"
          min={1}
          value={toPage}
          onChange={(e) => setToPage(e.target.value)}
          placeholder="—"
          className="w-20 rounded-lg border border-line bg-paper2 px-3 py-2 text-sm text-ink outline-none transition focus:border-accent focus:shadow-focus [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={!canSubmit || genLoading}
        className="btn-primary mt-8 w-full py-3 text-base"
      >
        {genLoading
          ? `Po gjenerohen ${numGroups} provime…`
          : `Gjenero ${numGroups} provim${numGroups > 1 ? "e" : ""}`}
      </button>
      {examErr && <p className="mt-2 text-sm text-bad">{examErr}</p>}

      {/* Pamja paraprake + shkarkimi (kërkon login) */}
      {preview && (
        <div className="mt-8 border-t border-line pt-6">
          <h2 className="mb-1 text-lg font-bold text-ink">Pamja paraprake</h2>
          <p className="mb-2 text-sm text-ink-soft">
            Shihe provimin më poshtë. Për ta <b className="text-ink">shkarkuar</b> si Word, identifikohu.
          </p>
          {preview.savedPath && (
            <p className="mb-4 break-all text-sm text-ink-soft">
              ✓ Ruajtur automatikisht në PC:{" "}
              <code className="text-ink">{preview.savedPath}</code>
            </p>
          )}

          <ExamPreview data={preview} />

          <div className="mt-6">
            {isAuthed && (
              <p className="mb-2 text-sm text-ink-soft">
                Identifikuar si <b className="text-ink">{userEmail}</b>
              </p>
            )}
            <button
              onClick={handleDownload}
              disabled={dlLoading}
              className="btn-primary w-full py-3 text-base"
            >
              {dlLoading
                ? "Po shkarkohet…"
                : isAuthed
                  ? "Shkarko Word (.docx)"
                  : "🔒 Identifikohu & shkarko"}
            </button>
            {!isAuthed && (
              <p className="mt-2 text-center text-xs text-ink-soft">
                Falas · pas hyrjes shkarkimi nis vetë.
              </p>
            )}
            {dlErr && <p className="mt-2 text-sm text-bad">{dlErr}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
