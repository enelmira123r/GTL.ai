import type { ExamData } from "../../shared/types";

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

export function ExamPreview({ data }: { data: ExamData }) {
  return (
    <div className="space-y-6">
      {data.exams.map((ex) => {
        const total = ex.questions.reduce((a, q) => a + (q.points || 0), 0);
        const piket = pointRanges(total);
        return (
          <div
            key={ex.group}
            className="rounded-xl border border-line bg-white p-5 text-ink shadow-sm sm:p-7"
          >
            <h3 className="text-center text-lg font-bold tracking-wide">
              DETYRË PËRMBLEDHËSE
            </h3>
            <p className="mt-2 text-sm font-semibold">
              LËNDA : {data.lenda || "______"}
              {"     "}KLASA : {data.klasa || "____"}
              {data.tremujori ? `     TREMUJORI : ${data.tremujori}` : ""}
              {"     "}GRUPI : {ex.group}
            </p>
            <p className="mt-1 text-sm font-semibold text-ink-soft">
              EMËR MBIEMËR : ____________________
            </p>

            <ol className="mt-4 space-y-3">
              {ex.questions.map((q, i) => (
                <li key={i} className="text-[15px] leading-relaxed">
                  <span className="font-semibold">{i + 1}.</span>{" "}
                  {q.text}{" "}
                  <span className="font-semibold text-brand">({q.points} pikë)</span>
                </li>
              ))}
            </ol>

            <table className="mt-5 w-full border-collapse text-center text-xs">
              <tbody>
                <tr>
                  <td className="border border-ink/40 px-1 py-1 font-bold">NOTA</td>
                  {NOTA.map((n) => (
                    <td key={n} className="border border-ink/40 px-1 py-1 font-bold">
                      {n}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border border-ink/40 px-1 py-1 font-bold">PIKËT</td>
                  {piket.map((p, i) => (
                    <td key={i} className="border border-ink/40 px-1 py-1">
                      {p}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
