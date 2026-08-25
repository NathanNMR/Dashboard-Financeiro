import { Transaction } from "./types";
import { csvEscape, formatCurrency } from "./finance";

export interface ReportRow {
  date: string;
  description: string;
  category: string;
  type: string;
  amount: number;
}

function toRows(transactions: Transaction[]): ReportRow[] {
  return transactions.map((t) => ({
    date: t.date,
    description: t.description,
    category: t.subcategory ? `${t.category} / ${t.subcategory}` : t.category,
    type: t.type === "income" ? "Receita" : "Despesa",
    amount: t.amount,
  }));
}

export function exportReportCsv(transactions: Transaction[], filename: string) {
  const rows = toRows(transactions);
  const header = ["data", "descricao", "categoria", "tipo", "valor"];
  const csv = [header, ...rows.map((r) => [r.date, r.description, r.category, r.type, r.amount.toFixed(2).replace(".", ",")])]
    .map((row) => row.map((v) => csvEscape(String(v))).join(";"))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

export async function exportReportXlsx(transactions: Transaction[], filename: string) {
  const XLSX = await import("xlsx");
  const rows = toRows(transactions).map((r) => ({
    Data: r.date,
    Descrição: r.description,
    Categoria: r.category,
    Tipo: r.type,
    Valor: r.amount,
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export async function exportReportPdf(
  transactions: Transaction[],
  filename: string,
  title: string,
  summary: { label: string; value: string }[]
) {
  const { default: jsPDF } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default;

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(90);
  let y = 26;
  summary.forEach((s) => {
    doc.text(`${s.label}: ${s.value}`, 14, y);
    y += 5;
  });

  const rows = toRows(transactions).map((r) => [
    r.date.split("-").reverse().join("/"),
    r.description,
    r.category,
    r.type,
    formatCurrency(r.amount),
  ]);

  autoTable(doc, {
    startY: y + 4,
    head: [["Data", "Descrição", "Categoria", "Tipo", "Valor"]],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [8, 145, 178] },
  });

  doc.save(`${filename}.pdf`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
