import type { Metadata } from "next";

import { DashboardPlaceholder } from "@/components/dashboard/dashboard-placeholder";

export const metadata: Metadata = {
  title: "Resumen — Konsorcio",
};

export default function ResumenPage() {
  return <DashboardPlaceholder title="Resumen" />;
}
