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

/** Full nav — used for auth path protection even when items are hidden from the sidebar. */
const allDashboardNavGroups: DashboardNavGroup[] = [
  {
    label: "Dashboard",
    children: [
      { label: "Resumen", href: "/resumen" },
      // Hidden from sidebar for now; placeholder route still protected.
      { label: "Reportes", href: `/${slugify("Reportes")}` },
      // Hidden from sidebar for now; route still exists (admin-gated in page).
      { label: "Notificaciones", href: `/${slugify("Notificaciones")}` },
    ],
  },
  {
    label: "Configuración",
    children: [
      { label: "Perfil de usuario", href: `/${slugify("Perfil de usuario")}` },
      // Hidden from sidebar for now; placeholder routes still protected.
      { label: "Preferencias", href: `/${slugify("Preferencias")}` },
      { label: "Seguridad", href: `/${slugify("Seguridad")}` },
    ],
  },
];

const visibleDashboardNavGroups: DashboardNavGroup[] = [
  {
    label: "Dashboard",
    children: [{ label: "Resumen", href: "/resumen" }],
  },
  {
    label: "Configuración",
    children: [{ label: "Perfil de usuario", href: `/${slugify("Perfil de usuario")}` }],
  },
];

const demoDashboardNavGroups: DashboardNavGroup[] = [
  {
    label: "Dashboard",
    children: [{ label: "Resumen", href: "/resumen" }],
  },
];

/** Visible sidebar groups — filtered when `NEXT_PUBLIC_DEMO_MODE=true`. */
export const dashboardNavGroups: DashboardNavGroup[] =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? demoDashboardNavGroups : visibleDashboardNavGroups;

/** All dashboard hrefs (never filtered) — proxy auth must protect every route. */
export const dashboardNavHrefs = allDashboardNavGroups.flatMap((group) =>
  group.children.map((child) => child.href),
);

export const defaultAuthenticatedPath = "/resumen";

export function isNavPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isProtectedDashboardPath(pathname: string): boolean {
  // Consortium hub + nested routes (emails, envíos) are not sidebar entries.
  if (pathname === "/consorcios" || pathname.startsWith("/consorcios/")) {
    return true;
  }

  return dashboardNavHrefs.some((href) => isNavPathActive(pathname, href));
}
