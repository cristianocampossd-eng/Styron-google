import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { Module } from "@/lib/role";

export function ProtectedRoute({ module, children }: { module: Module; children: React.ReactNode }) {
  const { canAccess, loading } = useAuth();
  if (loading) return null;
  if (!canAccess(module)) return <Navigate to="/projects" replace />;
  return <>{children}</>;
}
