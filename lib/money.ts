/** Arredonda valores monetários para centavos, reduzindo erros de ponto flutuante. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function addMoney(...values: number[]): number {
  return roundMoney(values.reduce((sum, value) => sum + value, 0));
}

export function subtractMoney(left: number, right: number): number {
  return roundMoney(left - right);
}

export function parseMoneyInput(value: string): number {
  const normalized = value.trim().replace(/\s/g, "").replace(/^R\$/i, "").replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? roundMoney(amount) : NaN;
}
