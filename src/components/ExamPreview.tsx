import type { ExamData } from "../../shared/types";
import { Card } from "./ui/card";

const NOTA = ["4", "5", "6", "7", "8", "9", "10"];

// Ndan 0..total në 7 breza pikësh (për notat 4–10).
function pointRanges(total: number): string[] {
  const ranges: string[] = [];
  let lower = 0;
  for (let i = 0; i < 7; i++) {
    let upper = Math.round(((i + 1) * total) / 7);
    if (upper < lower) upper = lower;
    if (i === 6) upper = total; // brezi i fundit mbyllet saktësisht te totali
    ranges.push(lower === upper ? `${lower}` : `${lower} - ${upper}`);
    lower = upper + 1;
  }
  return ranges;
}

// Tabela e notimit: 2 rreshta × 7 kolona (notat 4–10 dhe brezat e pikëve).
function gradingTable(total: number) {
  const piket = pointRanges(total);
  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        <tr className="bg-muted/40">
          {NOTA.map((n) => (
            <th key={n} className="border border-border px-2 py-1.5 font-bold text-foreground">{n}</th>
          ))}
        </tr>
        <tr>
          {piket.map((p, i) => (
            <td key={i} className="border border-border px-2 py-1.5 text-center text-foreground">{p}</td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

export function ExamPreview({ data }: { data: ExamData }) {
  return (
    <div className="space-y-6">
      {data.exams.map((ex) => {
        const total = ex.questions.reduce((a, q) => a + (q.points || 0), 0);
        return (
          <Card key={ex.group} className="overflow-hidden p-0">
            <div className="border-b border-white/5 bg-muted/40 px-6 py-4">
              <p className="text-center text-lg font-bold tracking-wide text-foreground">
                DETYRË PËRMBLEDHËSE
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                LËNDA : {data.lenda || "______"}
                {"     "}KLASA : {data.klasa || "____"}
                {data.tremujori ? `     TREMUJORI : ${data.tremujori}` : ""}
                {"     "}GRUPI : {ex.group}
              </p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                EMËR MBIEMËR : ____________________
              </p>
            </div>

            <div className="px-6 py-5 sm:px-8">
              <ol className="space-y-3">
                {ex.questions.map((q, i) => (
                  <li key={i} className="text-[15px] leading-relaxed text-foreground">
                    <span className="font-semibold">{i + 1}.</span> {q.text}{" "}
                    <span className="font-semibold text-secondary">({q.points} pikë)</span>
                  </li>
                ))}
              </ol>

              <div className="mt-6">
                <p className="mb-2 text-sm font-bold text-foreground">TABELA E NOTIMIT</p>
                {gradingTable(total)}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
