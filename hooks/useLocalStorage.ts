"use client";

import { useEffect, useState } from "react";

/**
 * Sincroniza um estado com o localStorage, evitando erros de hidratação do Next.js
 * (o valor salvo só é lido/escrito depois que o componente monta no cliente).
 *
 * Substitui o padrão repetido de "3x useEffect quase idênticos" que existia no
 * dashboard original para transações, contas e orçamentos.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // Lê o valor salvo apenas uma vez, no cliente, após a montagem
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) setValue(JSON.parse(saved));
    } catch (err) {
      console.error(`Falha ao carregar "${key}" do localStorage:`, err);
    } finally {
      setIsHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Persiste qualquer alteração, mas só depois da hidratação inicial
  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`Falha ao salvar "${key}" no localStorage:`, err);
    }
  }, [key, value, isHydrated]);

  return [value, setValue, isHydrated] as const;
}
