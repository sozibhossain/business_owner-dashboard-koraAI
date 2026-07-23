export const BUSINESS_OWNER_ROLE = "business_owner";
export const EMPLOYEE_ROLE = "employee";

export function normalizeRole(role?: string | null) {
  return String(role ?? "").trim().toLowerCase();
}

export function isBusinessDashboardRole(role?: string | null) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === BUSINESS_OWNER_ROLE || normalizedRole === EMPLOYEE_ROLE;
}
