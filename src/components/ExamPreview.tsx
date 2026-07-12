import type { ExamData, ExamGroup } from "../../shared/types";
import { DIFFICULTY_LABEL_AL, COGNITIVE_LABEL_AL } from "../../shared/types";
import { Card } from "./ui/card";

const NOTA = ["4", "5", "6", "7", "8", "9", "10"];

/** Ndan 0..total në 7 breza pikësh (njësoj si te Word-i). */
function pointRanges(total: number): string[] {
  const ranges: string[] = [];
  let lower = 0;
  for (let i = 0; i < 7; i++) {
    let upper = Math.round(((i + 1) * total) / 7);
    if (upper < lower) upper = lower;
    if (i === 6) upper = total;
    ranges.push(lower === upper ? `${lower}` : `${lower} - ${upper}`);
    lower = upper + 1;
  }
  return ranges;
}

function ScoringTable({ group }: { group: ExamGroup }) {
  const total = group.questions.reduce((a, q) => a + (q.points || 0), 0) || 1;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase text-muted-foreground">
            <th className="px-2 py-2 text-center">Nr</th>
            <th className="px-2 py-2">Vështirësia</th>
            <th className="px-2 py-2">Niveli Kognitiv</th>
            <th className="px-2 py-2 text-center">Pikë</th>
            <th className="px-2 py-2 text-center">% e Totalit</th>
          </tr>
        </thead>
        <tbody>
          {group.questions.map((q, i) => {
            const pct = Math.round(((q.points || 0) / total) * 100);
            return (
              <tr key={i} className="border-b border-border/60">
                <td className="px-2 py-2 text-center text-muted-foreground">{i + 1}</td>
                <td className="px-2 py-2">
                  <span
                    className={
                      q.difficulty === "hard"
                        ? "font-medium text-danger"
                        : q.difficulty === "medium"
                          ? "font-medium text-warning"
                          : "font-medium text-accent"
                    }
                  >
                    {DIFFICULTY_LABEL_AL[q.difficulty]}
                  </span>
                </td>
                <td className="px-2 py-2 text-muted-foreground">
                  {COGNITIVE_LABEL_AL[q.cognitiveLevel]}
                </td>
                <td className="px-2 py-2 text-center font-semibold text-foreground">{q.points}</td>
                <td className="px-2 py-2 text-center text-muted-foreground">{pct}%</td>
              </tr>
            );
          })}
          <tr className="font-semibold text-foreground">
            <td className="px-2 py-2 text-center" />
            <td className="px-2 py-2" />
            <td className="px-2 py-2">Totali</td>
            <td className="px-2 py-2 text-center">{group.questions.reduce((a, q) => a + (q.points || 0), 0)}</td>
            <td className="px-2 py-2 text-center">100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function ExamPreview({ data }: { data: ExamData }) {
  return (
    <div className="space-y-6">
      {data.exams.map((ex) => {
        const total = ex.questions.reduce((a, q) => a + (q.points || 0), 0);
        const piket = pointRanges(total);
        return (
          <Card key={ex.group} className="overflow-hidden p-0">
            <div className="border-b border-border bg-muted/40 px-6 py-4">
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
                    {q.rationale && (
                      <p className="mt-0.5 text-xs italic text-muted-foreground">{q.rationale}</p>
                    )}
                  </li>
                ))}
              </ol>

              <table className="mt-5 w-full border-collapse text-center text-xs">
                <tbody>
                  <tr>
                    <td className="border border-border bg-muted/60 px-1 py-1 font-bold text-foreground">
                      NOTA
                    </td>
                    {NOTA.map((n) => (
                      <td key={n} className="border border-border px-1 py-1 font-bold text-foreground">
                        {n}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="border border-border bg-muted/60 px-1 py-1 font-bold text-foreground">
                      PIKËT
                    </td>
                    {piket.map((p, i) => (
                      <td key={i} className="border border-border px-1 py-1 text-muted-foreground">
                        {p}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border-t border-border bg-muted/30 px-6 py-5 sm:px-8">
              <h4 className="mb-3 text-sm font-semibold text-foreground">Skema e notimit</h4>
              <ScoringTable group={ex} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
