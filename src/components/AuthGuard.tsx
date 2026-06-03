import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type Role } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export const AuthGuard = ({
  children,
  role,
}: {
  children: JSX.Element;
  role?: Role;
}) => {
  const { user, roles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }
  if (role && !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};
