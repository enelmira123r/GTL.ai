import { useCallback, useEffect, useState } from "react";
import type { View } from "../App";
import { useAuth } from "../auth";
import { listTests, getTest, deleteTest, downloadExamDocx } from "../api";
import type { SavedTestSummary, SavedTest } from "../../shared/types";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Dialog } from "./ui/dialog";
import { ExamPreview } from "./ExamPreview";
import {
  Eye,
  Download,
  Trash2,
  FileText,
  CalendarDays,
  Layers,
  BookOpen,
  GraduationCap,
  Plus,
} from "lucide-react";

const fmtDate = new Intl.DateTimeFormat("sq-AL", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function SavedTests({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { token, isAuthed, requireAuth, openAuth } = useAuth();
  const [tests, setTests] = useState<SavedTestSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState<SavedTest | null>(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setTests([]);
      return;
    }
    setErr(null);
    try {
      setTests(await listTests(token));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nuk u morën dot provimet.");
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  function openPreview(t: SavedTestSummary) {
    requireAuth(async (tk) => {
      setActiveLoading(true);
      setActive(null);
      try {
        setActive(await getTest(t.id, tk));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gabim gjatë hapjes.");
      } finally {
        setActiveLoading(false);
      }
    });
  }

  function download(t: SavedTestSummary) {
    requireAuth(async (tk) => {
      setBusyId(t.id);
      try {
        const full = active && active.id === t.id ? active : await getTest(t.id, tk);
        await downloadExamDocx(full.data, tk);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Shkarkimi dështoi.");
      } finally {
        setBusyId(null);
      }
    });
  }

  function remove(t: SavedTestSummary) {
    if (!window.confirm("Fshi këtë provim nga historiku?")) return;
    requireAuth(async (tk) => {
      setBusyId(t.id);
      try {
        await deleteTest(t.id, tk);
        setTests((prev) => (prev ? prev.filter((x) => x.id !== t.id) : prev));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Fshirja dështoi.");
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Provimet e ruajtura</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Historiku i të gjitha provimeve që ke gjeneruar — hap, shkarko ose fshi.
          </p>
        </div>
        <Button onClick={() => onNavigate("exam")}>
          <Plus className="h-4 w-4" /> Provim i ri
        </Button>
      </div>

      {err && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>
      )}

      {!isAuthed ? (
        <Card className="border-secondary/20 bg-gradient-to-br from-primary to-royal text-white">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="font-display text-lg font-bold">Kyçu për të parë historikun</p>
              <p className="mt-1 text-sm text-white/80">
                Provimet ruhen automatikisht për çdo llogari.
              </p>
            </div>
            <Button variant="secondary" onClick={openAuth}>
              Hyr / Regjistrohu
            </Button>
          </CardContent>
        </Card>
      ) : tests === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : tests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <p className="font-semibold text-foreground">Ende nuk ke provime të ruajtura</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Çdo provim që gjeneron ruhet këtu automatikisht. Krijo provimin tënd të parë.
            </p>
            <Button variant="outline" onClick={() => onNavigate("exam")}>
              Krijo Provim
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((t) => (
            <Card key={t.id} className="flex flex-col p-0">
              <CardContent className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-semibold text-foreground">
                      {t.title || "Provim"}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {fmtDate.format(new Date(t.createdAt))}
                    </p>
                  </div>
                  <Badge variant="outline">{t.numGroups} grupe</Badge>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {t.lenda && (
                    <Badge variant="secondary">
                      <BookOpen className="h-3 w-3" /> {t.lenda}
                    </Badge>
                  )}
                  {t.klasa && (
                    <Badge variant="accent">
                      <GraduationCap className="h-3 w-3" /> Klasa {t.klasa}
                    </Badge>
                  )}
                  {t.tremujori && <Badge variant="warning">Tremujori {t.tremujori}</Badge>}
                </div>

                <div className="mt-auto flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" /> {t.numQuestions} pyetje
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openPreview(t)}
                  >
                    <Eye className="h-4 w-4" /> Hap
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => download(t)}
                    disabled={busyId === t.id}
                  >
                    <Download className="h-4 w-4" /> Shkarko
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:bg-danger/10"
                    onClick={() => remove(t)}
                    disabled={busyId === t.id}
                    aria-label="Fshi"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={active !== null || activeLoading}
        onClose={() => setActive(null)}
        className="max-h-[88vh] max-w-3xl overflow-y-auto"
      >
        {activeLoading ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : active ? (
          <div className="p-2 sm:p-4">
            <ExamPreview data={active.data} />
            <div className="mt-4 flex justify-end gap-2 px-2 pb-2">
              <Button
                variant="outline"
                onClick={() => download(active)}
                disabled={busyId === active.id}
              >
                <Download className="h-4 w-4" /> Shkarko Word
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
