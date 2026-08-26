"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/apiClient";
import { FieldWrapper, SelectInput, TextInput } from "@/components/FormField";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/components/Toast";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
}

const ROLE_LABELS: Record<string, string> = { owner: "Dono(a)", admin: "Admin", member: "Membro" };

export function TeamManager() {
  const { token, currentAccount, user } = useAuth();
  const { notify } = useToast();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(() => {
    if (!token || !currentAccount) return;
    setLoading(true);
    api
      .listMembers(token, currentAccount.id)
      .then((res) => setMembers(res.members))
      .catch(() => setError("Não foi possível carregar os membros."))
      .finally(() => setLoading(false));
  }, [token, currentAccount]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  if (!currentAccount || currentAccount.type !== "company") {
    return null;
  }

  const canManage = currentAccount.role === "owner" || currentAccount.role === "admin";

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setInviteLink(null);
    try {
      const res = await api.createInvite(token, { account_id: currentAccount.id, email, role });
      setInviteLink(res.invite_link);
      setEmail("");
      notify("Convite criado. Copie o link e envie para a pessoa.", "success");
    } catch {
      setError("Não foi possível criar o convite. Verifique se você é admin/dono desta conta.");
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!token) return;
    try {
      await api.removeMember(token, { account_id: currentAccount.id, user_id: memberId });
      notify("Membro removido.", "info");
      loadMembers();
    } catch {
      notify("Não foi possível remover este membro.", "error");
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-lg shadow-black/20">
      <h3 className="text-lg font-semibold text-slate-200 mb-1">👥 Equipe — {currentAccount.name}</h3>
      <p className="text-xs text-slate-500 mb-4">
        Todos os membros veem e editam os mesmos dados financeiros desta conta.
      </p>

      {canManage && (
        <form onSubmit={handleInvite} className="space-y-3 mb-5 bg-slate-950/50 border border-slate-800 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FieldWrapper label="E-mail do convidado" htmlFor="invite-email" className="sm:col-span-2">
              <TextInput id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </FieldWrapper>
            <FieldWrapper label="Papel" htmlFor="invite-role">
              <SelectInput id="invite-role" value={role} onChange={(e) => setRole(e.target.value as "admin" | "member")}>
                <option value="member">Membro</option>
                <option value="admin">Admin</option>
              </SelectInput>
            </FieldWrapper>
          </div>
          {error && <p className="text-rose-400 text-xs">{error}</p>}
          <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            Gerar convite
          </button>
          {inviteLink && (
            <div className="bg-cyan-950/30 border border-cyan-900/40 rounded-lg px-3 py-2 text-xs text-cyan-300 break-all">
              Envie este link para a pessoa: <span className="font-mono">{inviteLink}</span>
            </div>
          )}
        </form>
      )}

      {loading ? (
        <p className="text-xs text-slate-500">Carregando membros...</p>
      ) : members.length === 0 ? (
        <EmptyState message="Nenhum membro encontrado." />
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between border border-slate-800 rounded-lg px-3 py-2.5">
              <div>
                <p className="text-sm text-slate-200">
                  {m.name} {m.id === user?.id && <span className="text-xs text-slate-500">(você)</span>}
                </p>
                <p className="text-xs text-slate-500">{m.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300">{ROLE_LABELS[m.role] ?? m.role}</span>
                {canManage && m.role !== "owner" && (
                  <button onClick={() => handleRemove(m.id)} className="text-xs text-rose-400 hover:underline">
                    Remover
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
