import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from "docx";
import {
  type ExamQuestion,
  DIFFICULTY_LABEL_AL,
  COGNITIVE_LABEL_AL,
} from "../shared/types";

export interface ExamDocItem {
  group: string; // shkronja e grupit: A, B, C...
  tremujori?: string; // "I" | "II" | "III" ose bosh
  lenda?: string; // bosh => vijë për t'u plotësuar
  klasa?: string; // bosh => vijë për t'u plotësuar
  title: string;
  questions: ExamQuestion[];
}

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const CELL_BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

// Notat 4–10 (7 nota).
const NOTA = ["4", "5", "6", "7", "8", "9", "10"];

/** Ndan 0..total në 7 breza pikësh, sipas totalit real të çdo testi. */
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

function gradeCell(text: string, bold = false): TableCell {
  return new TableCell({
    borders: CELL_BORDERS,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold, size: 22 })],
      }),
    ],
  });
}

function gradingTable(total: number): Table {
  const piket = pointRanges(total);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [gradeCell("NOTA", true), ...NOTA.map((n) => gradeCell(n, true))],
      }),
      new TableRow({
        children: [gradeCell("PIKËT", true), ...piket.map((p) => gradeCell(p))],
      }),
    ],
  });
}

function textCell(
  text: string,
  opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; size?: number } = {},
): TableCell {
  return new TableCell({
    borders: CELL_BORDERS,
    verticalAlign: "center",
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.LEFT,
        children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 20 })],
      }),
    ],
  });
}

/** Tabela profesionale e skemës së notimit (si te bordet e provimeve). */
function scoringTable(questions: ExamQuestion[]): Table {
  const total = questions.reduce((a, q) => a + (q.points || 0), 0) || 1;
  const header = new TableRow({
    children: [
      textCell("NR", { bold: true, align: AlignmentType.CENTER }),
      textCell("VËSHTIRËSIA", { bold: true }),
      textCell("NIVELI KOGNITIV", { bold: true }),
      textCell("PIKË", { bold: true, align: AlignmentType.CENTER }),
      textCell("% E TOTALIT", { bold: true, align: AlignmentType.CENTER }),
    ],
  });

  const rows = questions.map((q, i) => {
    const pct = Math.round(((q.points || 0) / total) * 100);
    return new TableRow({
      children: [
        textCell(String(i + 1), { align: AlignmentType.CENTER }),
        textCell(DIFFICULTY_LABEL_AL[q.difficulty] ?? q.difficulty),
        textCell(COGNITIVE_LABEL_AL[q.cognitiveLevel] ?? q.cognitiveLevel),
        textCell(String(q.points), { align: AlignmentType.CENTER }),
        textCell(`${pct}%`, { align: AlignmentType.CENTER }),
      ],
    });
  });

  const totalRow = new TableRow({
    children: [
      textCell("", {}),
      textCell("", {}),
      textCell("TOTALI", { bold: true }),
      textCell(String(total), { bold: true, align: AlignmentType.CENTER }),
      textCell("100%", { bold: true, align: AlignmentType.CENTER }),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [800, 2400, 2800, 1200, 1800],
    rows: [header, ...rows, totalRow],
  });
}

function blank(): Paragraph {
  return new Paragraph({ children: [new TextRun("")] });
}

/** Ndërton bllokun e një provimi (një grup). */
function examBlock(item: ExamDocItem, pageBreakBefore: boolean): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];

  // Titulli
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      pageBreakBefore,
      children: [new TextRun({ text: "DETYRË PËRMBLEDHËSE", bold: true, size: 30 })],
    }),
  );
  out.push(blank());

  // Koka: LËNDA/KLASA shfaqen nëse jepen, përndryshe vijë për t'u plotësuar me dorë.
  const lendaPart = item.lenda ? item.lenda : "______________";
  const klasaPart = item.klasa ? item.klasa : "__________";
  const tremPart = item.tremujori ? `     TREMUJORI : ${item.tremujori}` : "";
  out.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `LËNDA : ${lendaPart}     KLASA : ${klasaPart}${tremPart}     GRUPI : ${item.group}`,
          bold: true,
          size: 24,
        }),
      ],
    }),
  );
  out.push(
    new Paragraph({
      spacing: { before: 120 },
      children: [
        new TextRun({
          text: "EMËR MBIEMËR : ________________________________",
          bold: true,
          size: 24,
        }),
      ],
    }),
  );
  out.push(blank());

  // Pyetjet — të numëruara, me pikët në kllapa, me hapësirë për përgjigje
  item.questions.forEach((q, i) => {
    out.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [
          new TextRun({ text: `${i + 1}. ${q.text.toUpperCase()}`, size: 24 }),
          new TextRun({ text: `   (${q.points} PIKË)`, bold: true, size: 24 }),
        ],
      }),
    );
    out.push(blank());
    out.push(blank());
  });

  out.push(blank());
  const total = item.questions.reduce((a, q) => a + (q.points || 0), 0);
  out.push(gradingTable(total));

  // Skema profesionale e notimit
  out.push(blank());
  out.push(
    new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({ text: "SKEMA E NOTIMIT", bold: true, size: 24 })],
    }),
  );
  out.push(scoringTable(item.questions));

  return out;
}

export async function buildExamsDocx(items: ExamDocItem[]): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];
  items.forEach((item, i) => {
    children.push(...examBlock(item, i > 0)); // faqe e re për çdo grup pas të parit
  });

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Times New Roman" } } },
    },
    sections: [{ properties: {}, children }],
  });

  return await Packer.toBuffer(doc);
}
