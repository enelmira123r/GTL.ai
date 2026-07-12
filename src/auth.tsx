import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AuthModal } from "./components/AuthModal";

type AuthCtx = {
  token: string | null;
  email: string | null;
  isAuthed: boolean;
  logout: () => void;
  /** Ekzekuton `action` me token-in; nëse s'je i kyçur, hap modalin dhe e nis pas hyrjes. */
  requireAuth: (action?: (token: string) => void) => void;
  /** Hap modalin e login-it pa veprim pasues (p.sh. nga butoni te header-i). */
  openAuth: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth duhet përdorur brenda <AuthProvider>");
  return v;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("gtl_token"));
  const [email, setEmail] = useState<string | null>(() => localStorage.getItem("gtl_email"));
  const [open, setOpen] = useState(false);
  const pending = useRef<((token: string) => void) | null>(null);

  function handleAuth(t: string, e: string) {
    setToken(t);
    setEmail(e);
    localStorage.setItem("gtl_token", t);
    localStorage.setItem("gtl_email", e);
    setOpen(false);
    const p = pending.current;
    pending.current = null;
    if (p) p(t); // nis veprimin e pritur (p.sh. shkarkimi) me token-in e ri
  }

  function logout() {
    setToken(null);
    setEmail(null);
    localStorage.removeItem("gtl_token");
    localStorage.removeItem("gtl_email");
  }

  function requireAuth(action?: (token: string) => void) {
    if (token) {
      action?.(token);
      return;
    }
    pending.current = action ?? null;
    setOpen(true);
  }

  function openAuth() {
    pending.current = null;
    setOpen(true);
  }

  function close() {
    pending.current = null;
    setOpen(false);
  }

  return (
    <Ctx.Provider value={{ token, email, isAuthed: !!token, logout, requireAuth, openAuth }}>
      {children}
      <AuthModal open={open} onClose={close} onAuth={handleAuth} />
    </Ctx.Provider>
  );
}
