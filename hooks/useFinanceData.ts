"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api, FinanceSnapshot } from "@/lib/apiClient";
import { Bill, Budget, CategoryDef, CreditCard, Goal, Transaction } from "@/lib/types";

type SyncStatus = "loading" | "idle" | "saving" | "error";

export interface FinanceDataState {
  transactions: Transaction[];
  setTransactions: Dispatch<SetStateAction<Transaction[]>>;
  bills: Bill[];
  setBills: Dispatch<SetStateAction<Bill[]>>;
  budgets: Budget;
  setBudgets: Dispatch<SetStateAction<Budget>>;
  cards: CreditCard[];
  setCards: Dispatch<SetStateAction<CreditCard[]>>;
  goals: Goal[];
  setGoals: Dispatch<SetStateAction<Goal[]>>;
  customCategories: CategoryDef[];
  setCustomCategories: Dispatch<SetStateAction<CategoryDef[]>>;
  isHydrated: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
}

const emptySnapshot = (): FinanceSnapshot => ({
  transactions: [],
  bills: [],
  budgets: {},
  cards: [],
  goals: [],
  categories: [],
});

/**
 * Fonte de verdade dos dados financeiros.
 *
 * Carrega o snapshot da conta atual do backend/MySQL e mantém a interface
 * responsiva com atualizações otimistas. Alterações são agrupadas por 500 ms
 * e persistidas em sequência para evitar que respostas antigas sobrescrevam
 * mudanças mais recentes.
 *
 * localStorage continua sendo usado apenas para preferências da interface
 * (tutorial, conta selecionada e token de autenticação), não para os dados
 * financeiros.
 */
export function useFinanceData(): FinanceDataState {
  const { token, currentAccount } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [budgets, setBudgets] = useState<Budget>({});
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [customCategories, setCustomCategories] = useState<CategoryDef[]>([]);

  const [isHydrated, setIsHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [syncError, setSyncError] = useState<string | null>(null);

  const loadGenerationRef = useRef(0);
  const skipNextSaveRef = useRef(false);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const generation = ++loadGenerationRef.current;

    if (!token || !currentAccount) {
      const empty = emptySnapshot();
      setTransactions(empty.transactions);
      setBills(empty.bills);
      setBudgets(empty.budgets);
      setCards(empty.cards);
      setGoals(empty.goals);
      setCustomCategories(empty.categories);
      setIsHydrated(false);
      setSyncStatus("loading");
      return;
    }

    // Limpa a conta anterior imediatamente para nunca exibir dados do tenant
    // anterior enquanto a nova conta está carregando.
    const empty = emptySnapshot();
    setTransactions(empty.transactions);
    setBills(empty.bills);
    setBudgets(empty.budgets);
    setCards(empty.cards);
    setGoals(empty.goals);
    setCustomCategories(empty.categories);
    setIsHydrated(false);
    setSyncStatus("loading");
    setSyncError(null);

    api
      .getSnapshot(token, currentAccount.id)
      .then((snapshot) => {
        if (generation !== loadGenerationRef.current) return;

        skipNextSaveRef.current = true;
        setTransactions(snapshot.transactions);
        setBills(snapshot.bills);
        setBudgets(snapshot.budgets);
        setCards(snapshot.cards);
        setGoals(snapshot.goals);
        setCustomCategories(snapshot.categories);
        setIsHydrated(true);
        setSyncStatus("idle");
      })
      .catch((error) => {
        if (generation !== loadGenerationRef.current) return;
        setIsHydrated(true);
        setSyncStatus("error");
        setSyncError(error instanceof Error ? error.message : "Não foi possível carregar os dados financeiros.");
      });
  }, [token, currentAccount?.id]);

  useEffect(() => {
    if (!isHydrated || !token || !currentAccount) return;

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const accountId = currentAccount.id;
    const generation = loadGenerationRef.current;
    const snapshot: FinanceSnapshot = {
      transactions,
      bills,
      budgets,
      cards,
      goals,
      categories: customCategories,
    };

    const timer = window.setTimeout(() => {
      setSyncStatus("saving");
      setSyncError(null);

      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          await api.saveSnapshot(token, accountId, snapshot);
          if (generation === loadGenerationRef.current) {
            setSyncStatus("idle");
            setSyncError(null);
          }
        })
        .catch((error) => {
          if (generation === loadGenerationRef.current) {
            setSyncStatus("error");
            setSyncError(error instanceof Error ? error.message : "Falha ao sincronizar os dados.");
          }
        });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    isHydrated,
    token,
    currentAccount?.id,
    transactions,
    bills,
    budgets,
    cards,
    goals,
    customCategories,
  ]);

  return {
    transactions,
    setTransactions,
    bills,
    setBills,
    budgets,
    setBudgets,
    cards,
    setCards,
    goals,
    setGoals,
    customCategories,
    setCustomCategories,
    isHydrated,
    syncStatus,
    syncError,
  };
}
