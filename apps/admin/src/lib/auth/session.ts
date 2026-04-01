import { useSyncExternalStore } from "react";

const sessionStorageKey = "edunexa.admin.session.v1";
const sessionEventName = "edunexa-admin-session-change";
const backofficeRoles = new Set(["admin", "teacher", "guardian"]);

export type AdminSessionUser = {
  id: string;
  displayName: string;
  phone: string;
  roles: string[];
};

export type AdminSession = {
  token: string;
  user: AdminSessionUser | null;
};

const emptySession: AdminSession = {
  token: "",
  user: null,
};
let cachedRawSession = "";
let cachedSessionSnapshot: AdminSession = emptySession;

export function useAdminSession() {
  return useSyncExternalStore(
    subscribeSession,
    getAdminSessionSnapshot,
    getAdminSessionSnapshot
  );
}

export function getAdminSessionSnapshot(): AdminSession {
  if (typeof window === "undefined") {
    return emptySession;
  }

  const raw = window.localStorage.getItem(sessionStorageKey);
  if (!raw) {
    cachedRawSession = "";
    cachedSessionSnapshot = emptySession;
    return emptySession;
  }

  if (raw === cachedRawSession) {
    return cachedSessionSnapshot;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AdminSession>;
    cachedRawSession = raw;
    cachedSessionSnapshot = {
      token: typeof parsed.token === "string" ? parsed.token : "",
      user: isSessionUser(parsed.user) ? parsed.user : null,
    };
    return cachedSessionSnapshot;
  } catch {
    cachedRawSession = "";
    cachedSessionSnapshot = emptySession;
    return emptySession;
  }
}

export function saveAdminSession(session: AdminSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(sessionStorageKey, JSON.stringify(session));
  notifySessionChanged();
}

export function clearAdminSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(sessionStorageKey);
  notifySessionChanged();
}

export function hasBackofficeAccess(session: AdminSession) {
  if (!session.token || !session.user) {
    return false;
  }

  return session.user.roles.some((role) => backofficeRoles.has(role));
}

export function hasAnySessionRole(session: AdminSession, roles: string[]) {
  if (!session.token || !session.user) {
    return false;
  }

  return session.user.roles.some((role) => roles.includes(role));
}

function subscribeSession(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleSessionChange = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleSessionChange);
  window.addEventListener(sessionEventName, handleSessionChange);

  return () => {
    window.removeEventListener("storage", handleSessionChange);
    window.removeEventListener(sessionEventName, handleSessionChange);
  };
}

function notifySessionChanged() {
  window.dispatchEvent(new Event(sessionEventName));
}

function isSessionUser(value: unknown): value is AdminSessionUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "string" &&
    typeof user.displayName === "string" &&
    typeof user.phone === "string" &&
    Array.isArray(user.roles)
  );
}
