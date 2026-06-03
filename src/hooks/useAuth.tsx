import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, ApiUser, setToken } from "@/lib/api";

export type Role = "admin" | "owner" | "user";

interface AuthCtx {
  user: ApiUser | null;
  roles: Role[];
  loading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  refresh: () => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    const token = localStorage.getItem("st_token");
    if (!token) { setLoading(false); return; }
    try {
      const me = await api.auth.me();
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMe(); }, []);

  const refresh = async () => { await loadMe(); };

  const signOut = () => {
    setToken(null);
    setUser(null);
  };

  const roles = (user?.roles ?? []) as Role[];

  return (
    <Ctx.Provider value={{
      user,
      roles,
      loading,
      isAdmin: roles.includes("admin"),
      isOwner: roles.includes("owner"),
      refresh,
      signOut,
    }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

/* Helper: login and set token */
export const loginAndStore = async (email: string, password: string) => {
  const { token, user } = await api.auth.login(email, password);
  setToken(token);
  return user;
};

/* Helper: register and set token */
export const registerAndStore = async (body: Parameters<typeof api.auth.register>[0]) => {
  const { token, user } = await api.auth.register(body);
  setToken(token);
  return user;
};
