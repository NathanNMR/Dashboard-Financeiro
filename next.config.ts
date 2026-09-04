import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O React Compiler (reactCompiler: true) força o uso de um subprocesso
  // Babel por baixo do Turbopack para todo componente, mesmo em dev. Essa
  // feature ainda é experimental e vem causando crashes nativos do Node
  // (0xc0000409) especificamente no Windows. Desativado até estabilizar.
  // reactCompiler: true,
  // Export estático: gera HTML/CSS/JS puros em vez de exigir um servidor
  // Node.js. Necessário para hospedagens compartilhadas como InfinityFree,
  // que só servem arquivos estáticos e PHP.
  output: "export",
  // Hostings compartilhados costumam servir melhor "pasta/index.html" do
  // que "pasta.html" — trailingSlash evita 404 em alguns provedores.
  trailingSlash: true,
};

export default nextConfig;
