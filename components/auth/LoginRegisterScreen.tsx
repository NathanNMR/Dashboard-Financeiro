"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { FieldWrapper, TextInput, SelectInput } from "@/components/FormField";

export function LoginRegisterScreen() {
  const { login, register, error, clearError } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  // Campos compartilhados
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Somente registro
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<"personal" | "company">("personal");
  const [accountName, setAccountName] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({ name, email, password, accountType, accountName: accountName || undefined });
      }
    } catch {
      // erro já fica disponível via `error` do contexto
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-lg shadow-black/30 p-6 sm:p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-slate-100">SmartFinance</h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === "login" ? "Entre na sua conta" : "Crie sua conta gratuitamente"}
          </p>
        </div>

        <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-1 mb-6">
          <button
            onClick={() => {
              setMode("login");
              clearError();
            }}
            className={`flex-1 text-sm font-medium py-2 rounded-md transition ${
              mode === "login" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => {
              setMode("register");
              clearError();
            }}
            className={`flex-1 text-sm font-medium py-2 rounded-md transition ${
              mode === "register" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <FieldWrapper label="Seu nome" htmlFor="auth-name">
              <TextInput id="auth-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </FieldWrapper>
          )}

          <FieldWrapper label="E-mail" htmlFor="auth-email">
            <TextInput id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FieldWrapper>

          <FieldWrapper label="Senha" htmlFor="auth-password">
            <TextInput
              id="auth-password"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FieldWrapper>

          {mode === "register" && (
            <>
              <FieldWrapper label="Tipo de conta" htmlFor="auth-account-type">
                <SelectInput
                  id="auth-account-type"
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as "personal" | "company")}
                >
                  <option value="personal">Pessoal</option>
                  <option value="company">Empresa (equipe)</option>
                </SelectInput>
              </FieldWrapper>

              {accountType === "company" && (
                <FieldWrapper label="Nome da empresa" htmlFor="auth-account-name">
                  <TextInput
                    id="auth-account-name"
                    placeholder="Ex: Minha Empresa LTDA"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    required
                  />
                </FieldWrapper>
              )}
            </>
          )}

          {error && <p className="text-rose-400 text-xs bg-rose-950/30 border border-rose-900/40 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition text-sm"
          >
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        {mode === "register" && accountType === "company" && (
          <p className="text-xs text-slate-500 mt-4 text-center leading-relaxed">
            Você será a dona/dono da conta da empresa. Depois de criar, use a opção de convidar membros para dar
            acesso à sua equipe.
          </p>
        )}
      </div>
    </div>
  );
}
