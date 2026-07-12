import { useState } from "react";
import { GraduationCap, Mail, Lock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/input";
import * as api from "../api";

export function LoginPage({ onNavigate }: { onNavigate: (v: "home" | "register") => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password || loading) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.login(email.trim(), password);
      localStorage.setItem("gtl_token", r.token);
      localStorage.setItem("gtl_email", r.email);
      localStorage.setItem("gtl_role", r.role);
      localStorage.setItem("gtl_verified", "true");
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hyrja dështoi.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md border-white/[0.06] bg-card/80 shadow-card backdrop-blur-xl">
        <CardContent className="p-7 sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-royal text-white shadow-glow">
              <GraduationCap className="h-6 w-6" />
            </div>
            <CardTitle className="font-display text-xl font-bold text-foreground">Mirë se erdhe sërish</CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">Hyni për të vazhduar.</CardDescription>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mjesuesi@shkolla.edu.al"
                  className="pl-9"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-pass">Fjalëkalimi</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !loading && submit(e as any)}
                  placeholder="Fjalëkalimi"
                  className="pl-9"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            )}

            <Button onClick={submit} disabled={loading || !email.trim() || !password} className="w-full" size="lg">
              {loading ? "Po hyhet…" : <><span>Hyr</span><ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Nuk ke llogari?{" "}
            <button onClick={() => onNavigate("register")} className="text-secondary hover:underline">
              Regjistrohu
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
