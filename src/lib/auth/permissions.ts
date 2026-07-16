import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

/**
 * Access-control statements for the better-auth admin plugin.
 *
 * Roles:
 * - `superadmin` — platform admin (admin plugin APIs, sees all consortiums)
 * - `admin` — consortium admin (owns their consortiums only)
 * - `tenant` — reserved for future tenants
 */
export const ac = createAccessControl(defaultStatements);

export const superadmin = ac.newRole({
  ...adminAc.statements,
});

export const admin = ac.newRole({
  user: [],
  session: [],
});

export const tenant = ac.newRole({
  user: [],
  session: [],
});

export const authRoles = {
  superadmin,
  admin,
  tenant,
} as const;
