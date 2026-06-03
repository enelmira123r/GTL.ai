import { AuthProvider, useAuth } from "./auth";
import { UploadBox } from "./components/UploadBox";

function Header() {
  const { isAuthed, email, logout, openAuth } = useAuth();
  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <button onClick={toTop} className="flex items-center gap-2">
          <span className="font-display text-xl font-bold tracking-tight text-ink">
            GTL<span className="text-accent">.ai</span>
          </span>
        </button>

        {isAuthed ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden items-center gap-2 text-ink-soft sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold uppercase text-white">
                {(email ?? "?").charAt(0)}
              </span>
              <span className="max-w-[14rem] truncate font-medium text-ink">{email}</span>
            </span>
            <button onClick={logout} className="font-medium text-ink-soft hover:text-ink">
              Dil
            </button>
          </div>
        ) : (
          <button onClick={openAuth} className="btn-ghost py-2 text-sm">
            Hyr
          </button>
        )}
      </div>
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen">
        <Header />

        <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
          {/* Hero */}
          <div className="mb-11 text-center animate-fade-up">
            <img
              src="/logo.jpg"
              alt="GTL.ai — Generate Tests and Lessons"
              className="mx-auto mb-7 h-24 w-auto animate-sway rounded-2xl border border-line bg-white shadow-card sm:h-28"
            />
            <span className="chip mb-5">Generate Tests &amp; Lessons</span>
            <h1 className="mx-auto max-w-2xl text-4xl font-bold leading-[1.1] text-ink sm:text-5xl">
              Gjenero provime profesionale,{" "}
              <span className="text-gradient">gati për printim</span>.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-ink-soft">
              Ngarko një PDF, ngjit tekstin ose vendos linkun e librit. GTL.ai ndërton një
              provim Word (.docx) me grupe, pikë sipas vështirësisë dhe tabelë notimi.
            </p>
          </div>

          <UploadBox />
        </main>

        <footer className="border-t border-line py-8 text-center text-sm text-ink-soft">
          <span className="font-display font-semibold text-ink">GTL.ai</span> · Generate
          Tests and Lessons · React + Google Gemini
        </footer>
      </div>
    </AuthProvider>
  );
}
