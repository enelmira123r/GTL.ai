import type { ExamData, ExamQuestion } from "../../shared/types";
import { DIFFICULTY_LABEL_AL, COGNITIVE_LABEL_AL } from "../../shared/types";
import { Card } from "./ui/card";

const NOTA = ["4", "5", "6", "7", "8", "9", "10"];

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

function gradingTable(total: number) {
  const piket = pointRanges(total);
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-muted/40">
          <th className="border border-border px-2 py-1.5 font-bold text-foreground">NOTA</th>
          {NOTA.map((n) => (
            <th key={n} className="border border-border px-2 py-1.5 font-bold text-foreground">{n}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <th className="border border-border px-2 py-1.5 font-bold text-foreground">PIKËT</th>
          {piket.map((p) => (
            <td key={p} className="border border-border px-2 py-1.5 text-center text-foreground">{p}</td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function scoringTable(questions: ExamQuestion[]) {
  const total = questions.reduce((a, q) => a + (q.points || 0), 0) || 1;
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-muted/40">
          <th className="border border-border px-2 py-1.5 font-bold text-foreground">NR</th>
          <th className="border border-border px-2 py-1.5 text-left font-bold text-foreground">VËSHTIRËSIA</th>
          <th className="border border-border px-2 py-1.5 text-left font-bold text-foreground">NIVELI KOGNITIV</th>
          <th className="border border-border px-2 py-1.5 font-bold text-foreground">PIKË</th>
          <th className="border border-border px-2 py-1.5 font-bold text-foreground">% E TOTALIT</th>
        </tr>
      </thead>
      <tbody>
        {questions.map((q, i) => {
          const pct = Math.round(((q.points || 0) / total) * 100);
          return (
            <tr key={i}>
              <td className="border border-border px-2 py-1.5 text-center text-foreground">{i + 1}</td>
              <td className="border border-border px-2 py-1.5 text-foreground">{DIFFICULTY_LABEL_AL[q.difficulty] ?? q.difficulty}</td>
              <td className="border border-border px-2 py-1.5 text-foreground">{COGNITIVE_LABEL_AL[q.cognitiveLevel] ?? q.cognitiveLevel}</td>
              <td className="border border-border px-2 py-1.5 text-center font-semibold text-foreground">{q.points}</td>
              <td className="border border-border px-2 py-1.5 text-center text-foreground">{pct}%</td>
            </tr>
          );
        })}
        <tr className="bg-muted/30">
          <td className="border border-border px-2 py-1.5" />
          <td className="border border-border px-2 py-1.5" />
          <td className="border border-border px-2 py-1.5 font-bold text-foreground">TOTALI</td>
          <td className="border border-border px-2 py-1.5 text-center font-bold text-foreground">{total}</td>
          <td className="border border-border px-2 py-1.5 text-center font-bold text-foreground">100%</td>
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

              <div className="mt-6 space-y-4">
                <div>
                  <p className="mb-2 text-sm font-bold text-foreground">SKEMA E NOTIMIT</p>
                  {scoringTable(ex.questions)}
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold text-foreground">TABELA E NOTIMIT</p>
                  {gradingTable(total)}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
