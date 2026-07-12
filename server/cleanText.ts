// Pastrim i tekstit të nxjerrë (nga HTML, flipbook ose OCR i imazhit/PDF-së)
// përpara se të dërgohet te AI-ja. Qëllimi: tekst më i qartë → pyetje më të sakta.

const MAX_CHARS = 200_000;

/** Heq karakteret e padukshme, kontrollues dhe hapësirat e tepërta. */
export function cleanLessonText(text: string): string {
  if (!text) return "";
  return text
    // karaktere me gjerësi zero / joinet e fshehta
    .replace(/[\u200B\u200C\u200D\uFEFF\u00AD]/g, "")
    // karakteret e kontrollit (përveç newline/-tab)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    // hapësira e tepërt brenda rreshtave
    .replace(/[ \t\f\v]+/g, " ")
    // shumë newline-a → dy (ruan paragraferat)
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .replace(/^\s+|\s+$/g, "")
    .slice(0, MAX_CHARS);
}
