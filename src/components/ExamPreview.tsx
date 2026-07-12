import type { ExamData } from "../../shared/types";
import { Card } from "./ui/card";

export function ExamPreview({ data }: { data: ExamData }) {
  return (
    <div className="space-y-6">
      {data.exams.map((ex) => (
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
          </div>
        </Card>
      ))}
    </div>
  );
}
