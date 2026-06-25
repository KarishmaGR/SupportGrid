import { Navigate, Outlet } from "react-router-dom";
import { UserRole } from "@supportgrid/shared";
import { useAuth } from "./auth.tsx";

export function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user || user.role !== UserRole.Admin) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
