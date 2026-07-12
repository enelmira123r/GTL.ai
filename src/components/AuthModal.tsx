import { useState } from "react";
import { GraduationCap, Mail, Lock, ArrowRight, KeyRound, ShieldCheck, X } from "lucide-react";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/input";
import { Badge } from "./ui/badge";
import * as api from "../api";

type AuthTab = "login" | "register" | "forgot" | "verify";

export function AuthModal({
  open,
  onClose,
  onAuth,
}: {
  open: boolean;
  onClose: () => void;
  onAuth: (token: string, email: string, role: "teacher" | "student") => void;
}) {
  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function resetForm() {
    setErr(null);
    setOk(null);
    setPassword("");
    setCode("");
  }

  async function submitLogin() {
    if (!email.trim() || !password || loading) return;
    setLoading(true);
    resetForm();
    try {
      const r = await api.login(email.trim(), password);
      onAuth(r.token, r.email, r.role);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ndodhi një gabim.");
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister() {
    if (!email.trim() || !password || loading) return;
    if (password.length < 6) {
      setErr("Fjalëkalimi duhet të ketë të paktën 6 shkronja.");
      return;
    }
    setLoading(true);
    resetForm();
    try {
      const r = await api.register(email.trim(), password, role);
      onAuth(r.token, r.email, r.role);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ndodhi një gabim.");
    } finally {
      setLoading(false);
    }
  }

  async function submitForgot() {
    if (!email.trim() || loading) return;
    setLoading(true);
    resetForm();
    try {
      const r = await api.forgotPassword(email.trim());
      setOk("Nëse email-i ekziston, do të marresh udhëzimet. (zhvillim: shiko konsolën)");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ndodhi një gabim.");
    } finally {
      setLoading(false);
    }
  }

  async function submitVerify() {
    if (!email.trim() || !code.trim() || loading) return;
    setLoading(true);
    resetForm();
    try {
      await api.verifyEmailApi(email.trim(), code.trim());
      setOk("Email-i u verifikua me sukses!");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ndodhi një gabim.");
    } finally {
      setLoading(false);
    }
  }

  const isLogin = tab === "login";
  const isRegister = tab === "register";
  const isForgot = tab === "forgot";
  const isVerify = tab === "verify";
  const showTabs = isLogin || isRegister;

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="p-7 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-royal text-white shadow-glow">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">
            {isLogin ? "Mirë se erdhe sërish" : isRegister ? "Krijo llogari falas" : isForgot ? "Rikthim fjalëkalimi" : "Verifiko email-in"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLogin ? "Hyni për të vazhduar." : isRegister ? "Ruaj provimet dhe bisedat te llogaria jote." : isForgot ? "Ndihmojmë të rikthesh fjalëkalimin." : "Shkruani kodin nga email-i juaj."}
          </p>
        </div>

        {showTabs && (
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); resetForm(); }}
                className={`rounded-lg py-2 text-sm font-semibold transition ${
                  tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {t === "login" ? "Hyr" : "Regjistrohu"}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {isRegister && (
            <div className="space-y-2">
              <Label>Zgjidh rolin</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["teacher", "student"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`rounded-xl border-2 px-3 py-3 text-sm font-semibold transition ${
                      role === r
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {r === "teacher" ? "Mësues" : "Nxënës"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="auth-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="perdoruesi@gmail.com"
                className="pl-9"
                autoComplete="email"
              />
            </div>
          </div>

          {!isVerify && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-pass">Fjalëkalimi</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="auth-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (isLogin) submitLogin();
                      else if (isRegister) submitRegister();
                      else if (isForgot) submitForgot();
                    }
                  }}
                  placeholder={isRegister ? "Min. 6 shkronja" : "Fjalëkalimi"}
                  className="pl-9"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
              </div>
            </div>
          )}

          {isVerify && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-code">Kodi i verifikimit</Label>
              <div className="relative">
                <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="auth-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitVerify()}
                  placeholder="123456"
                  className="pl-9"
                />
              </div>
            </div>
          )}

          {err && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>
          )}
          {ok && (
            <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{ok}</p>
          )}

          {isLogin && (
            <button
              type="button"
              onClick={() => { setTab("forgot"); resetForm(); }}
              className="text-sm text-secondary hover:underline"
            >
              Harruat fjalëkalimin?
            </button>
          )}

          <Button
            onClick={() => {
              if (isLogin) submitLogin();
              else if (isRegister) submitRegister();
              else if (isForgot) submitForgot();
              else if (isVerify) submitVerify();
            }}
            disabled={loading || !email.trim() || (isForgot && !email.trim()) || (isVerify && (!code.trim() || !email.trim()))}
            className="w-full"
            size="lg"
          >
            {loading ? "Po procesohet…" : isLogin ? "Hyr" : isRegister ? "Krijo llogari" : isForgot ? "Dërgo kodin" : "Verifiko"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>

          {isLogin && (
            <div className="text-center text-xs text-muted-foreground">
              Nuk ke llogari?{" "}
              <button onClick={() => { setTab("register"); resetForm(); }} className="text-secondary hover:underline">
                Regjistrohu
              </button>
            </div>
          )}
          {isRegister && (
            <div className="text-center text-xs text-muted-foreground">
              Ke llogari?{" "}
              <button onClick={() => { setTab("login"); resetForm(); }} className="text-secondary hover:underline">
                Hyr
              </button>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
