"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AccountRef, api, ApiError, AuthUser } from "@/lib/apiClient";

const TOKEN_KEY = "smartfinance_auth_token";
const CURRENT_ACCOUNT_KEY = "smartfinance_current_account";

interface AuthContextValue {
  status: "loading" | "authenticated" | "unauthenticated";
  token: string | null;
  user: AuthUser | null;
  accounts: AccountRef[];
  currentAccount: AccountRef | null;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { name: string; email: string; password: string; accountType: "personal" | "company"; accountName?: string }) => Promise<void>;
  acceptInvite: (payload: { token: string; password: string; name?: string }) => Promise<void>;
  logout: () => void;
  switchAccount: (accountId: string) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accounts, setAccounts] = useState<AccountRef[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ao carregar, tenta reidratar a sessão a partir do token salvo, validando
  // com o backend (que também confirma se o token ainda não expirou).
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setStatus("unauthenticated");
      return;
    }
    api
      .me(savedToken)
      .then((res) => {
        setToken(savedToken);
        setUser(res.user);
        setAccounts(res.accounts);
        const savedAccount = localStorage.getItem(CURRENT_ACCOUNT_KEY);
        const stillValid = res.accounts.some((a) => a.id === savedAccount);
        setCurrentAccountId(stillValid ? savedAccount : res.accounts[0]?.id ?? null);
        setStatus("authenticated");
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setStatus("unauthenticated");
      });
  }, []);

  const applySession = useCallback((newToken: string, newUser: AuthUser, newAccounts: AccountRef[]) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
    setAccounts(newAccounts);
    const firstAccount = newAccounts[0]?.id ?? null;
    setCurrentAccountId(firstAccount);
    if (firstAccount) localStorage.setItem(CURRENT_ACCOUNT_KEY, firstAccount);
    setStatus("authenticated");
    setError(null);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await api.login({ email, password });
        applySession(res.token, res.user, res.accounts);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Não foi possível entrar. Tente novamente.");
        throw e;
      }
    },
    [applySession]
  );

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; accountType: "personal" | "company"; accountName?: string }) => {
      try {
        const res = await api.register(payload);
        applySession(res.token, res.user, [res.account]);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Não foi possível criar a conta. Tente novamente.");
        throw e;
      }
    },
    [applySession]
  );

  const acceptInvite = useCallback(
    async (payload: { token: string; password: string; name?: string }) => {
      try {
        const res = await api.acceptInvite(payload);
        applySession(res.token, res.user, res.accounts);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Não foi possível aceitar o convite.");
        throw e;
      }
    },
    [applySession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CURRENT_ACCOUNT_KEY);
    setToken(null);
    setUser(null);
    setAccounts([]);
    setCurrentAccountId(null);
    setStatus("unauthenticated");
  }, []);

  const switchAccount = useCallback((accountId: string) => {
    setCurrentAccountId(accountId);
    localStorage.setItem(CURRENT_ACCOUNT_KEY, accountId);
  }, []);

  const currentAccount = accounts.find((a) => a.id === currentAccountId) ?? null;

  return (
    <AuthContext.Provider
      value={{
        status,
        token,
        user,
        accounts,
        currentAccount,
        error,
        login,
        register,
        acceptInvite,
        logout,
        switchAccount,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa ser usado dentro de <AuthProvider>");
  return ctx;
}
