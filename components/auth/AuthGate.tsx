"use client";

import { useAuth } from "@/hooks/useAuth";
import { LoginRegisterScreen } from "./LoginRegisterScreen";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <LoginRegisterScreen />;
  }

  return <>{children}</>;
}
