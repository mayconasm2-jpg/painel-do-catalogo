import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50" data-testid="auth-loading">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );
}

export function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (user === null) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === "platform_admin" ? "/admin" : "/dashboard"} replace />;
  }
  return children;
}
