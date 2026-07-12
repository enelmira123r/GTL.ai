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
  role: "teacher" | "student" | null;
  isAuthed: boolean;
  isVerified: boolean;
  logout: () => void;
  requireAuth: (action?: (token: string) => void) => void;
  openAuth: () => void;
  setRoleOverride: (role: "teacher" | "student" | null) => void;
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
  const [role, setRole] = useState<"teacher" | "student" | null>(() =>
    (localStorage.getItem("gtl_role") as "teacher" | "student" | null) || null
  );
  const [isVerified, setIsVerified] = useState<boolean>(() =>
    localStorage.getItem("gtl_verified") === "true"
  );
  const [open, setOpen] = useState(false);
  const pending = useRef<((token: string) => void) | null>(null);

  function handleAuth(t: string, e: string, r: "teacher" | "student") {
    setToken(t);
    setEmail(e);
    setRole(r);
    setIsVerified(true);
    localStorage.setItem("gtl_token", t);
    localStorage.setItem("gtl_email", e);
    localStorage.setItem("gtl_role", r);
    localStorage.setItem("gtl_verified", "true");
    setOpen(false);
    const p = pending.current;
    pending.current = null;
    if (p) p(t);
  }

  function logout() {
    setToken(null);
    setEmail(null);
    setRole(null);
    setIsVerified(false);
    localStorage.removeItem("gtl_token");
    localStorage.removeItem("gtl_email");
    localStorage.removeItem("gtl_role");
    localStorage.removeItem("gtl_verified");
  }

  function setRoleOverride(r: "teacher" | "student" | null) {
    setRole(r);
    if (r) localStorage.setItem("gtl_role", r);
    else localStorage.removeItem("gtl_role");
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
    <Ctx.Provider
      value={{
        token,
        email,
        role,
        isAuthed: !!token,
        isVerified,
        logout,
        requireAuth,
        openAuth,
        setRoleOverride,
      }}
    >
      {children}
      <AuthModal open={open} onClose={close} onAuth={handleAuth} />
    </Ctx.Provider>
  );
}
