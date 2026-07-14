import type { Metadata } from "next";

import { DashboardPlaceholder } from "@/components/dashboard/dashboard-placeholder";

export const metadata: Metadata = {
  title: "Seguridad — Konsorcio",
};

export default function SeguridadPage() {
  return <DashboardPlaceholder title="Seguridad" />;
}
