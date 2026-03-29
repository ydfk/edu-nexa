import { Navigate, Outlet, useLocation } from "react-router-dom";
import { hasAdminAccess, useAdminSession } from "@/lib/auth/session";

export function RequireAdminAuth() {
  const location = useLocation();
  const session = useAdminSession();

  if (!session.token) {
    return (
      <Navigate
        to="/auth/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (!hasAdminAccess(session)) {
    return <Navigate to="/401" replace />;
  }

  return <Outlet />;
}

export function RedirectAuthenticatedUser() {
  const session = useAdminSession();

  if (hasAdminAccess(session)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
