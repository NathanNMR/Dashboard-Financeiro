import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Export estático: gera HTML/CSS/JS puros em vez de exigir um servidor
  // Node.js. Necessário para hospedagens compartilhadas como InfinityFree,
  // que só servem arquivos estáticos e PHP.
  output: "export",
  // Hostings compartilhados costumam servir melhor "pasta/index.html" do
  // que "pasta.html" — trailingSlash evita 404 em alguns provedores.
  trailingSlash: true,
};

export default nextConfig;
