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

export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    label: "Dashboard",
    children: [
      { label: "Resumen", href: `/${slugify("Resumen")}` },
      { label: "Consorcios", href: `/${slugify("Consorcios")}` },
      { label: "Reportes", href: `/${slugify("Reportes")}` },
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

export const dashboardNavHrefs = dashboardNavGroups.flatMap((group) =>
  group.children.map((child) => child.href),
);

export const defaultAuthenticatedPath = "/consorcios";

export function isNavPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isProtectedDashboardPath(pathname: string): boolean {
  return dashboardNavHrefs.some((href) => isNavPathActive(pathname, href));
}
