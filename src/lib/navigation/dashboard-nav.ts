export type DashboardNavChild = {
  label: string;
  href: string;
};

export type DashboardNavGroup = {
  label: string;
  children: DashboardNavChild[];
};

function slugify(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

/** Full nav — used for auth path protection even when demo mode hides items. */
const allDashboardNavGroups: DashboardNavGroup[] = [
  {
    label: "Dashboard",
    children: [
      { label: "Resumen", href: `/${slugify("Resumen")}` },
      { label: "Consorcios", href: "/consorcios" },
      { label: "Reportes", href: `/${slugify("Reportes")}` },
      // TODO: DashboardNavChild has no role field yet — this item should only
      // be shown to admins once nav items support role gating. The route
      // itself already redirects non-admins (see notificaciones/page.tsx).
      { label: "Notificaciones", href: `/${slugify("Notificaciones")}` },
    ],
  },
  {
    label: "Configuración",
    children: [
      { label: "Perfil de usuario", href: `/${slugify("Perfil de usuario")}` },
      { label: "Preferencias", href: `/${slugify("Preferencias")}` },
      { label: "Seguridad", href: `/${slugify("Seguridad")}` },
    ],
  },
];

const demoDashboardNavGroups: DashboardNavGroup[] = [
  {
    label: "Dashboard",
    children: [{ label: "Consorcios", href: "/consorcios" }],
  },
];

/** Visible sidebar groups — filtered when `NEXT_PUBLIC_DEMO_MODE=true`. */
export const dashboardNavGroups: DashboardNavGroup[] =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? demoDashboardNavGroups : allDashboardNavGroups;

/** All dashboard hrefs (never filtered) — proxy auth must protect every route. */
export const dashboardNavHrefs = allDashboardNavGroups.flatMap((group) =>
  group.children.map((child) => child.href),
);

export const defaultAuthenticatedPath = "/consorcios";

export function isNavPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isProtectedDashboardPath(pathname: string): boolean {
  return dashboardNavHrefs.some((href) => isNavPathActive(pathname, href));
}
