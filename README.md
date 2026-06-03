# GTL.ai 📘✨

GTL.ai (*Generate Tests and Lesson*) merr përmbajtjen e një **libri/mësimi** (PDF, tekst, ose link) dhe gjeneron, me ndihmën e AI-së (Google Gemini), një **provim Word (.docx)** gati për printim — në shqip.

## Çfarë bën
- 📚 **Bibliotekë librash** — zgjidh direkt nga të gjithë librat digjitalë të botimepegi.al (klasat 1–12).
- 📄 **Hyrje fleksibël** — libër me link (flipbook), PDF, ose tekst i ngjitur; appi e merr vetë përmbajtjen.
- 🧩 **Provim me grupe** — gjeneron deri në 6 variante të ndryshme (Grupi A, B, C…), secili në faqe veçmas.
- 🎯 **Pikë sipas vështirësisë** — çdo pyetje merr pikë sipas peshës; totali e tabela e notimit dalin natyrshëm.
- 🗓️ **Tremujori & faqe** — cakto tremujorin dhe kufizoje provimin te një interval faqesh të librit.
- 👁️ **Pamje paraprake pa llogari**, **shkarkim me llogari (email + fjalëkalim)** — shihet kushdo, por për ta ruajtur si Word duhet identifikim.

## Stack teknik
- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend:** Express (server i vogël) që ruan çelësin e fshehtë dhe flet me Google Gemini API
- **AI:** Google Gemini (`@google/generative-ai`) me *structured output* (JSON i garantuar me skemë)
- **PDF:** dërgohet drejt te Gemini si dokument base64 (lexim native, pa librari shtesë)

## 🔑 E rëndësishme: çelësi API (FALAS)
Aplikacioni ka nevojë për një çelës nga Google. Çelësi **nuk futet kurrë në kod** — qëndron në serverin lokal te skedari `.env`, kështu që nuk shfaqet te shfletuesi.

1. Merr një çelës **falas** te **https://aistudio.google.com** → *Get API key*.
2. Kopjo `.env.example` si `.env` dhe vendos çelësin (`GEMINI_API_KEY=...`).

> 💡 Gemini ka një **nivel falas** bujar — mjafton lehtë për këtë projekt. Nëse del gabimi i kufirit, prit pak minuta. Parazgjedhja `gemini-2.5-flash`; mund të provosh `gemini-flash-lite-latest` te `.env`.

## 🔓 Llogaria (email + fjalëkalim)
Provimi **gjenerohet dhe shihet pa llogari** (pamje paraprake). Por **shkarkimi si Word** kërkon identifikim:

- **Krijo llogari** me email + fjalëkalim (min. 6 shkronja), ose **Hyr** nëse ke tashmë.
- Llogaritë ruhen në server te `users.json` (fjalëkalimet të enkriptuara me scrypt + salt — **jo** në tekst të thjeshtë).
- Identifikimi mbahet edhe pas mbylljes së faqes (ruhet në shfletues); shkarkimi verifikohet në server me një token.
- Nuk kërkon asnjë konfigurim shtesë — punon menjëherë.

> `users.json` dhe `.authsecret` janë te `.gitignore` (nuk ngarkohen kurrë).

## 💾 Arkivi automatik i provimeve
**Çdo provim që gjeneron kushdo** ruhet automatikisht në PC-në ku punon serveri, te folderi `provimet/`, i ndarë në nën-foldera sipas përdoruesit:
```
provimet/
├─ anonim/                     # gjenerime pa llogari
└─ mesuesi@shkolla.al/         # gjenerime të atij përdoruesi
   └─ Gjeografi-Klasa8-TremujoriI-2026-06-03_16-42.docx
```
- Emrat përmbajnë lëndën, klasën, tremujorin dhe datën — pa mbishkrime.
- Folderin mund ta ndryshosh me `SAVE_DIR` te `.env` (p.sh. `SAVE_DIR=C:\Users\Enel\Desktop\Provimet`).

> Kur app-i punon **lokalisht**, "serveri" është PC-ja jote, ndaj çdo provim përfundon te ky folder. Nëse e publikon online te një host, folderi është te ai host.

## ▶️ Si ta nisësh (lokalisht)

```powershell
cd "C:\Users\Enel\Desktop\MesoTest"

# 1) Instalo varësitë (një herë)
npm install

# 2) Krijo skedarin .env me çelësin tënd
#    (kopjo .env.example -> .env dhe vendos GEMINI_API_KEY)

# 3) Nise (frontend + server bashkë)
npm run dev
```

Pastaj hap **http://localhost:5173** në shfletues.
- Frontend-i punon në portën `5173`, serveri në `3001`; Vite i dërgon vetë kërkesat `/api` te serveri.
- Për ta ndalur: `Ctrl + C`.

## 📦 Build & nisje në prodhim
```powershell
npm run build     # ndërton frontend-in te dist/
npm start         # serveri shërben dist/ + API në http://localhost:3001
```

## 🌐 Publikim online
Frontend-i është statik, por API-ja ka nevojë për një server Node (që mban çelësin). Dy mënyra:
1. **Një host Node** (Render, Railway, Fly.io): vendos `GEMINI_API_KEY` te variablat e mjedisit, ndërto me `npm run build` dhe nise me `npm start`.
2. **Frontend te Netlify + serverless function** për `/api` (kërkon pak përshtatje).

## 🗂️ Struktura
```
MesoTest/
├─ index.html
├─ shared/types.ts          # tipa të përbashkët (frontend + server)
├─ server/                  # backend-i (çelësi rri këtu)
│  ├─ index.ts              # Express + endpoint-et /api/generate, /api/grade
│  ├─ gemini.ts             # thirrjet te Gemini (structured output JSON + skemat)
│  ├─ fetchUrl.ts           # merr përmbajtjen nga një link (PDF/HTML/Drive)
│  ├─ examDocx.ts           # ndërton provimin Word (.docx)
│  └─ prompts.ts            # udhëzimet (në shqip) për modelin
└─ src/                     # frontend-i React
   ├─ App.tsx
   ├─ api.ts
   └─ components/           # UploadBox, LoadingState, Explanation, QuestionCard, ResultSummary
```

---
Krijuar nga **Enel** për projektin e TIK-ut.
