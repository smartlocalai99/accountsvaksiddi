export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  ACCOUNTANT: "ACCOUNTANT",
};

const FULL_ACCESS = new Set([ROLES.SUPER_ADMIN, ROLES.ADMIN]);

const ACCOUNTANT_ACCESS = new Set([
  "/dashboard",
  "/fees",
  "/reports",
]);

export function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

export function canAccessPath(role, path) {
  const normalizedRole = normalizeRole(role);

  if (FULL_ACCESS.has(normalizedRole)) {
    return true;
  }

  if (normalizedRole === ROLES.ACCOUNTANT) {
    return ACCOUNTANT_ACCESS.has(path);
  }

  return false;
}

export function getRoleLabel(role) {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) {
    return "UNKNOWN";
  }

  return normalizedRole;
}
