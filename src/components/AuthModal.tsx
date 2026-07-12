import { useState } from "react";
import { GraduationCap, Mail, Lock, ArrowRight } from "lucide-react";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/input";
import * as api from "../api";

export function AuthModal({
  open,
  onClose,
  onAuth,
}: {
  open: boolean;
  onClose: () => void;
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
    <Dialog open={open} onClose={onClose}>
      <div className="p-7 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-royal text-white shadow-glow">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">
            {isLogin ? "Mirë se erdhe sërish" : "Krijo llogari falas"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ruaj provimet dhe bisedat te llogaria jote.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {(["register", "login"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setErr(null);
              }}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t === "register" ? "Regjistrohu" : "Hyr"}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mjesuesi@shkolla.edu.al"
                className="pl-9"
                autoComplete="email"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-pass">Fjalëkalimi</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="auth-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Min. 6 shkronja"
                className="pl-9"
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>
          </div>

          {err && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>
          )}

          <Button onClick={submit} disabled={loading || !email.trim() || !password} className="w-full" size="lg">
            {loading ? "Po procesohet…" : isLogin ? "Hyr" : "Krijo llogari"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
