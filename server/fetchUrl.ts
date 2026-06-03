// Merr përmbajtjen e një mësimi/libri nga një link (URL).
// Mbështet: PDF direkt, faqe interneti (HTML), dhe linke publike të Google Drive.

type Fetched =
  | { kind: "pdf"; pdfBase64: string }
  | { kind: "text"; text: string };

/** Pastron HTML-në në tekst të lexueshëm. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|h[1-6]|li|br|tr|section|article|header|footer)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

/** Rregullon linkun: shton https:// dhe kthen linket e Google Drive në shkarkim direkt. */
function normalizeUrl(raw: string): string {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const driveFile = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveFile) {
    return `https://drive.google.com/uc?export=download&id=${driveFile[1]}`;
  }
  if (/drive\.google\.com/.test(url)) {
    const id = url.match(/[?&]id=([^&]+)/);
    if (id) return `https://drive.google.com/uc?export=download&id=${id[1]}`;
  }
  return url;
}

/** Nxjerr faqet (tekstin faqe-për-faqe) nga "book_config.js" i një flipbook-u (flipbuilder). */
function extractFlipbookPages(js: string): string[] | null {
  const ki = js.indexOf("textForPages");
  if (ki === -1) return null;
  const start = js.indexOf("[", ki);
  if (start === -1) return null;

  // Gjej "]" mbyllëse që i përgjigjet "[", duke respektuar tekstet brenda thonjëzave.
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let i = start; i < js.length; i++) {
    const ch = js[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;

  let arr: unknown;
  try {
    arr = JSON.parse(js.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!Array.isArray(arr)) return null;

  // Ruaj GJITHË hyrjet (edhe ato bosh) që indeksi të përputhet me numrin e faqes.
  const pages = arr.map((s) =>
    typeof s === "string" ? s.replace(/[ \t]+/g, " ").trim() : "",
  );
  return pages.length ? pages : null;
}

export async function fetchLessonFromUrl(
  rawUrl: string,
  opts: { fromPage?: number; toPage?: number } = {},
): Promise<Fetched> {
  const url = normalizeUrl(rawUrl);

  let resp: Response;
  try {
    resp = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MesoTest/1.0; +https://example.com)",
        Accept: "application/pdf,text/html,*/*",
      },
    });
  } catch {
    throw new Error(
      "Nuk u arrit të hapej linku. Kontrollo që është i saktë dhe publik (pa kërkuar login).",
    );
  }

  if (!resp.ok) {
    throw new Error(
      `Linku ktheu gabim (${resp.status}). Sigurohu që është publik dhe i arritshëm.`,
    );
  }

  const ctype = (resp.headers.get("content-type") || "").toLowerCase();
  const ab = await resp.arrayBuffer();
  const buf = Buffer.from(ab);

  // Përcakto nëse është PDF (nga content-type ose nga "magic bytes" %PDF-).
  const isPdf =
    ctype.includes("application/pdf") ||
    buf.subarray(0, 5).toString("latin1") === "%PDF-";

  if (isPdf) {
    if (buf.length > 20 * 1024 * 1024) {
      throw new Error("PDF-ja te linku është shumë e madhe (maksimum 20MB).");
    }
    return { kind: "pdf", pdfBase64: buf.toString("base64") };
  }

  // Përndryshe: trajtoje si HTML/tekst.
  const raw = buf.toString("utf8");

  // Rast i veçantë: faqja e konfirmimit të Google Drive (skedar shumë i madh).
  if (/Google Drive can't scan this file|virus scan warning/i.test(raw)) {
    throw new Error(
      "Google Drive nuk e shkarkoi dot drejtpërdrejt (skedar i madh). Provo një link direkt te PDF-ja ose shkarkoje dhe ngarkoje si PDF.",
    );
  }

  // Libra digjitalë "flipbook" (flipbuilder, p.sh. botimepegi.al): teksti rri te book_config.js.
  if (/book_config\.js|flipbuilder|FlipBook|main_preview|bookConfig/i.test(raw)) {
    try {
      const cfgMatch = raw.match(/[\w./-]*book_config\.js/i);
      const cfgRel = cfgMatch ? cfgMatch[0] : "files/search/book_config.js";
      const cfgUrl = new URL(cfgRel, url).href;
      const cfgResp = await fetch(cfgUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MesoTest/1.0)" },
      });
      if (cfgResp.ok) {
        const pages = extractFlipbookPages(await cfgResp.text());
        if (pages) {
          const from = opts.fromPage && opts.fromPage > 0 ? opts.fromPage : 0;
          const to = opts.toPage && opts.toPage > 0 ? opts.toPage : 0;
          const selected =
            from || to ? pages.slice(from ? from - 1 : 0, to || pages.length) : pages;
          const bookText = selected
            .filter((s) => s.trim().length > 0)
            .join("\n\n")
            .trim();
          if (bookText.length > 50) {
            return { kind: "text", text: bookText.slice(0, 200000) };
          }
        }
      }
    } catch {
      // injoro — vazhdo me nxjerrjen normale të tekstit
    }
  }

  const text = htmlToText(raw);
  if (text.trim().length < 40) {
    throw new Error(
      "Nuk u gjet tekst i lexueshëm te linku. Nëse është libër digjital (flipbook) që s'u lexua, provo ta hapësh dhe të kopjosh tekstin, ose përdor PDF-në.",
    );
  }

  // Kufizo gjatësinë që të kontrollojmë koston e tokenave.
  return { kind: "text", text: text.slice(0, 120000) };
}
