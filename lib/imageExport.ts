import { CATEGORY_COLORS, CATEGORY_ICONS } from "./constants";
import { formatCurrency } from "./finance";

interface ExportImageData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  categoryBreakdown: { name: string; value: number }[];
  periodLabel: string;
}

const COLORS = {
  bg: "#020617",
  card: "#0f172a",
  border: "#1e293b",
  text: "#f1f5f9",
  subtext: "#94a3b8",
  emerald: "#34d399",
  rose: "#f43f5e",
  cyan: "#22d3ee",
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Desenha um relatório financeiro em um <canvas> e devolve o data URL (PNG).
 * Evita dependências externas (html2canvas etc.) — é desenhado do zero.
 */
export function renderDashboardImage(data: ExportImageData): string {
  const width = 1000;
  const sortedCategories = [...data.categoryBreakdown].sort((a, b) => b.value - a.value).slice(0, 8);
  const rowHeight = 34;
  const height = 460 + sortedCategories.length * rowHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Fundo
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);

  // Cabeçalho
  ctx.fillStyle = COLORS.text;
  ctx.font = "bold 28px Arial, sans-serif";
  ctx.fillText("SmartFinance", 40, 56);

  ctx.fillStyle = COLORS.subtext;
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText(data.periodLabel, 40, 88);

  // Cards de resumo
  const cardY = 120;
  const cardW = (width - 40 * 2 - 24 * 2) / 3;
  const cardH = 110;
  const summary = [
    { label: "Receitas Totais", value: data.totalIncome, color: COLORS.emerald },
    { label: "Despesas Totais", value: data.totalExpense, color: COLORS.rose },
    { label: "Saldo Atual", value: data.balance, color: data.balance >= 0 ? COLORS.cyan : "#fbbf24" },
  ];

  summary.forEach((item, i) => {
    const x = 40 + i * (cardW + 24);
    ctx.fillStyle = COLORS.card;
    roundRect(ctx, x, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = COLORS.subtext;
    ctx.font = "14px Arial, sans-serif";
    ctx.fillText(item.label, x + 20, cardY + 34);

    ctx.fillStyle = item.color;
    ctx.font = "bold 26px Arial, sans-serif";
    ctx.fillText(formatCurrency(item.value), x + 20, cardY + 74);
  });

  // Bloco de categorias
  const listY = cardY + cardH + 50;
  ctx.fillStyle = COLORS.card;
  roundRect(ctx, 40, listY, width - 80, 60 + sortedCategories.length * rowHeight, 16);
  ctx.fill();
  ctx.strokeStyle = COLORS.border;
  ctx.stroke();

  ctx.fillStyle = COLORS.text;
  ctx.font = "bold 18px Arial, sans-serif";
  ctx.fillText("Despesas por Categoria", 64, listY + 36);

  const maxValue = Math.max(...sortedCategories.map((c) => c.value), 1);
  const barAreaX = 260;
  const barAreaW = width - 80 - barAreaX - 180;

  sortedCategories.forEach((cat, i) => {
    const y = listY + 64 + i * rowHeight;

    ctx.fillStyle = COLORS.text;
    ctx.font = "14px Arial, sans-serif";
    const label = `${CATEGORY_ICONS[cat.name] ?? ""} ${cat.name}`;
    ctx.fillText(label, 64, y + 16);

    // trilho
    ctx.fillStyle = "#1e293b";
    roundRect(ctx, barAreaX, y + 4, barAreaW, 14, 7);
    ctx.fill();

    // barra
    const barW = Math.max(6, (cat.value / maxValue) * barAreaW);
    ctx.fillStyle = CATEGORY_COLORS[cat.name] ?? "#94a3b8";
    roundRect(ctx, barAreaX, y + 4, barW, 14, 7);
    ctx.fill();

    ctx.fillStyle = COLORS.subtext;
    ctx.font = "13px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(formatCurrency(cat.value), width - 64, y + 16);
    ctx.textAlign = "left";
  });

  // Rodapé
  ctx.fillStyle = "#475569";
  ctx.font = "12px Arial, sans-serif";
  ctx.fillText(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 40, height - 20);

  return canvas.toDataURL("image/png");
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
