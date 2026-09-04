import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "SmartFinance",
  description: "Controle completo de contas, rendas, juros, orçamento e projeção financeira.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SmartFinance",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

// Preparado para mobile: viewport correto (sem zoom acidental) e cor da
// barra de status/navegador combinando com o tema escuro do app.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020617",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-slate-950 font-sans">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
