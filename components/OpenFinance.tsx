"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/apiClient";
import type { Transaction } from "@/lib/types";

const PluggyConnect = dynamic(() => import("react-pluggy-connect").then((module) => module.PluggyConnect), { ssr: false });

interface Props {
  accountId: string;
  token: string;
  transactions: Transaction[];
  onImport: (transactions: Transaction[]) => void;
  disabled: boolean;
}

export function OpenFinance({ accountId, token, transactions, onImport, disabled }: Props) {
  const [connections, setConnections] = useState<{ item_id: string; created_at: string }[]>([]);
  const [connectToken, setConnectToken] = useState("");
  const [preview, setPreview] = useState<Transaction[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try { setConnections((await api.openFinanceList(token, accountId)).connections); }
    catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar conexões."); }
  }, [token, accountId]);

  useEffect(() => { void load(); }, [load]);

  async function connect() {
    setError(""); setNotice(""); setBusy(true);
    try {
      const result = await api.openFinanceToken(token, accountId);
      if (!result.connectToken) throw new Error("O provedor não retornou o token de conexão.");
      setConnectToken(result.connectToken);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao iniciar conexão."); }
    finally { setBusy(false); }
  }

  async function connected(itemId: string) {
    setConnectToken(""); setBusy(true); setError("");
    try {
      await api.openFinanceAttach(token, accountId, itemId);
      await load();
      setNotice("Conta conectada. Quando a sincronização bancária terminar, clique em Buscar transações.");
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao vincular conexão."); }
    finally { setBusy(false); }
  }

  async function fetchTransactions(itemId: string) {
    setBusy(true); setError(""); setNotice(""); setPreview([]);
    try {
      setPreview((await api.openFinancePreview(token, accountId, itemId)).transactions);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao buscar transações."); }
    finally { setBusy(false); }
  }

  const existing = new Set(transactions.map((t) => t.id));
  const newItems = preview.filter((t) => !existing.has(t.id));

  return <section className="space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-5 text-slate-100">
    <div>
      <h2 className="text-xl font-bold">Open Finance</h2>
      <p className="mt-2 text-sm text-slate-400">Conecte sua conta pelo fluxo da Pluggy e importe movimentações de contas bancárias em reais. Você autoriza o compartilhamento no banco.</p>
    </div>
    <button type="button" onClick={connect} disabled={busy || disabled || !!connectToken}
      className="rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Conectar banco</button>
    {connectToken && <PluggyConnect connectToken={connectToken} includeSandbox
      onSuccess={({ item }) => { void connected(item.id); }}
      onError={({ message }) => { setError(message || "Falha na conexão bancária."); setConnectToken(""); }}
      onClose={() => setConnectToken("")} onLoadError={() => { setError("Não foi possível abrir o widget."); setConnectToken(""); }} />}
    {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-400">{notice}</p>}
    <div className="space-y-3">
      <h3 className="font-semibold">Conexões</h3>
      {connections.length === 0 && <p className="text-sm text-slate-400">Nenhuma conta conectada ainda.</p>}
      {connections.map((connection) => <div key={connection.item_id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-700 p-3 text-sm">
        <span>Conexão {connection.item_id.slice(0, 8)} · {connection.created_at.slice(0, 10)}</span>
        <button type="button" onClick={() => void fetchTransactions(connection.item_id)} disabled={busy || disabled}
          className="rounded bg-slate-700 px-3 py-1.5 disabled:opacity-50">Buscar transações</button>
      </div>)}
    </div>
    {preview.length > 0 && <div className="rounded-lg border border-cyan-800 p-4 text-sm">
      <p>Encontradas {preview.length} transações confirmadas; {newItems.length} novas. Lançamentos existentes são preservados.</p>
      <button type="button" disabled={disabled || busy || newItems.length === 0}
        onClick={() => { onImport(newItems); setNotice(`${newItems.length} transações adicionadas. Aguarde a sincronização com o servidor antes de sair.`); setPreview([]); }}
        className="mt-3 rounded bg-cyan-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Importar {newItems.length} novas</button>
    </div>}
    <p className="text-xs text-slate-400">Importação manual. Compras em cartão de crédito, saldos e investimentos ainda não são importados. Confira transferências entre suas próprias contas para não contar valores duas vezes.</p>
  </section>;
}
