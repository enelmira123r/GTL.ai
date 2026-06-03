import { useState } from "react";
import * as api from "../api";

export function AuthBox({
  onAuth,
}: {
  onAuth: (token: string, email: string) => void;
}) {
  const [tab, setTab] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !password || loading) return;
    setLoading(true);
    setErr(null);
    try {
      const r =
        tab === "login"
          ? await api.login(email.trim(), password)
          : await api.register(email.trim(), password);
      onAuth(r.token, r.email);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ndodhi një gabim.");
    } finally {
      setLoading(false);
    }
  }

  const isLogin = tab === "login";

  return (
    <div>
      {/* Titulli */}
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-sm text-white">
          {isLogin ? "👋" : "✨"}
        </span>
        <h2 className="font-display text-lg font-bold text-ink">
          {isLogin ? "Mirë se erdhe sërish" : "Krijo llogari falas"}
        </h2>
      </div>
      <p className="mb-4 text-sm text-ink-soft">
        Falas · provimet ruhen te llogaria jote dhe i shkarkon kur të duash.
      </p>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="email"
        className="mb-2 w-full rounded-lg border border-line bg-paper2 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:shadow-focus"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Fjalëkalimi (min. 6 shkronja)"
        autoComplete={isLogin ? "current-password" : "new-password"}
        className="mb-3 w-full rounded-lg border border-line bg-paper2 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:shadow-focus"
      />

      <button
        onClick={submit}
        disabled={loading || !email.trim() || !password}
        className="btn-primary w-full py-2.5"
      >
        {loading ? "Po procesohet…" : isLogin ? "Hyr" : "Krijo llogari falas"}
      </button>
      {err && <p className="mt-2 text-sm text-bad">{err}</p>}

      {/* Kalimi login ↔ register */}
      <p className="mt-4 text-center text-sm text-ink-soft">
        {isLogin ? "S'ke llogari? " : "Ke tashmë llogari? "}
        <button
          onClick={() => {
            setTab(isLogin ? "register" : "login");
            setErr(null);
          }}
          className="font-semibold text-accent-dark hover:underline"
        >
          {isLogin ? "Krijo një falas" : "Hyr këtu"}
        </button>
      </p>
    </div>
  );
}
