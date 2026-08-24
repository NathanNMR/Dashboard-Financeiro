import { Transaction } from "./types";
import { categorizeTransaction, generateId } from "./finance";

export interface CsvImportResult {
  transactions: Transaction[];
  invalidRows: number[];
  detectedDelimiter: "," | ";";
  skippedHeader: boolean;
}

/** Divide um CSV completo em registros, preservando quebras de linha dentro de aspas. */
export function parseCsvRecords(text: string, delimiter: "," | ";" = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const normalized = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];

    if (quoted) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field.trim());
      field = "";
    } else if (char === "\n") {
      row.push(field.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  row.push(field.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

function parseMoney(value: string): number {
  let normalized = value.trim().replace(/\s/g, "").replace(/^R\$/i, "");

  // Aceita 1234.56, 1.234,56, 1234,56 e 1234.
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized =
      normalized.lastIndexOf(",") > normalized.lastIndexOf(".")
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }

  return Number(normalized);
}

function normalizeType(value: string | undefined): Transaction["type"] | null {
  const type = (value ?? "").trim().toLowerCase();
  if (["income", "receita", "entrada", "credito", "crédito"].includes(type)) return "income";
  if (["expense", "despesa", "saida", "saída", "debito", "débito"].includes(type)) return "expense";
  return null;
}

function isHeader(row: string[]): boolean {
  const normalized = row.map((value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  return normalized.some((value) => ["data", "date"].includes(value)) &&
    normalized.some((value) => ["descricao", "description"].includes(value));
}

/**
 * Importa CSV nos formatos:
 * YYYY-MM-DD;Descrição;1.250,50;despesa
 * YYYY-MM-DD,Descrição,1250.50,expense
 *
 * Também aceita cabeçalho e detecta automaticamente vírgula ou ponto e vírgula.
 */
export function importTransactionsCsv(text: string): CsvImportResult {
  const normalized = text.replace(/^\uFEFF/, "");
  const firstLine = normalized.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  const detectedDelimiter: "," | ";" = semicolonCount > commaCount ? ";" : ",";

  // O parser trabalha com ambos os delimitadores; a detecção fica registrada
  // para informar o usuário e facilitar futuras validações.
  const rows = parseCsvRecords(normalized, detectedDelimiter);
  const start = rows.length > 0 && isHeader(rows[0]) ? 1 : 0;
  const transactions: Transaction[] = [];
  const invalidRows: number[] = [];

  rows.slice(start).forEach((parts, index) => {
    if (parts.length < 3) {
      invalidRows.push(index + start + 1);
      return;
    }

    const date = parts[0].trim();
    const description = parts[1].trim();
    const amount = parseMoney(parts[2]);
    const type = normalizeType(parts[3]);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !description || !Number.isFinite(amount) || amount <= 0 || !type) {
      invalidRows.push(index + start + 1);
      return;
    }

    transactions.push({
      id: generateId(`csv-${index}`),
      date,
      description,
      amount: Math.round(amount * 100) / 100,
      category: categorizeTransaction(description),
      type,
    });
  });

  return {
    transactions,
    invalidRows,
    detectedDelimiter,
    skippedHeader: start === 1,
  };
}
