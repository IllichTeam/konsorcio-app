import type { Metadata } from "next";

import { DashboardPlaceholder } from "@/components/dashboard/dashboard-placeholder";

export const metadata: Metadata = {
  title: "Preferencias",
};

export default function PreferenciasPage() {
  return <DashboardPlaceholder title="Preferencias" />;
}
