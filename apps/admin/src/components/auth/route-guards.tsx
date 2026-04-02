import type { ReactElement } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  hasAnySessionRole,
  hasBackofficeAccess,
  hasUnauthorizedSessionMarker,
  useAdminSession,
} from "@/lib/auth/session";

export function RequireBackofficeAuth() {
  const location = useLocation();
  const session = useAdminSession();

  if (!session.token || !session.user) {
    if (hasUnauthorizedSessionMarker()) {
      return <Navigate to="/401" replace />;
    }

    return (
      <Navigate
        to="/auth/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (!hasBackofficeAccess(session)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}

export function RequireRoles({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: ReactElement;
}) {
  const location = useLocation();
  const session = useAdminSession();

  if (!session.token || !session.user) {
    if (hasUnauthorizedSessionMarker()) {
      return <Navigate to="/401" replace />;
    }

    return (
      <Navigate
        to="/auth/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (!hasAnySessionRole(session, allowedRoles)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}

export function RedirectAuthenticatedUser() {
  const session = useAdminSession();

  if (session.token && session.user && hasBackofficeAccess(session)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
