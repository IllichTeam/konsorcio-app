/** App roles stored in better-auth `user.role`. */
export const ROLES = {
  superadmin: "superadmin",
  admin: "admin",
  tenant: "tenant",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export function isSuperadmin(role: string | null | undefined): boolean {
  return role === ROLES.superadmin;
}

export function isConsortiumAdmin(role: string | null | undefined): boolean {
  return role === ROLES.admin;
}
