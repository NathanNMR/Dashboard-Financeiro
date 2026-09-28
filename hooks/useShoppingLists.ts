"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/apiClient";
import { ShoppingList } from "@/lib/types";

export function useShoppingLists(): {
  lists: ShoppingList[];
  setLists: Dispatch<SetStateAction<ShoppingList[]>>;
  status: "loading" | "idle" | "saving" | "error";
  error: string | null;
  reload: () => void;
} {
  const { token, currentAccount } = useAuth();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [reloadId, setReloadId] = useState(0);
  const generationRef = useRef(0);
  const skipSaveRef = useRef(false);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const generation = ++generationRef.current;
    setLists([]);
    setHydrated(false);
    setStatus("loading");
    setError(null);
    if (!token || !currentAccount) return;

    api.getShoppingLists(token, currentAccount.id)
      .then(({ lists: loaded }) => {
        if (generation !== generationRef.current) return;
        skipSaveRef.current = true;
        setLists(loaded);
        setHydrated(true);
        setStatus("idle");
      })
      .catch((err) => {
        if (generation !== generationRef.current) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Não foi possível carregar as listas.");
      });

    return () => { generationRef.current++; };
  }, [token, currentAccount?.id, reloadId]);

  useEffect(() => {
    if (!hydrated || !token || !currentAccount) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    const generation = generationRef.current;
    const accountId = currentAccount.id;
    const snapshot = lists;
    const timer = window.setTimeout(() => {
      setStatus("saving");
      saveQueueRef.current = saveQueueRef.current.catch(() => undefined).then(async () => {
        await api.saveShoppingLists(token, accountId, snapshot);
        if (generation === generationRef.current) {
          setStatus("idle");
          setError(null);
        }
      }).catch((err) => {
        if (generation === generationRef.current) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "Falha ao salvar as listas.");
        }
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [lists, hydrated, token, currentAccount?.id]);

  return { lists, setLists, status, error, reload: () => setReloadId((n) => n + 1) };
}
