import type { Metadata } from "next";

import { DashboardPlaceholder } from "@/components/dashboard/dashboard-placeholder";

export const metadata: Metadata = {
  title: "Reportes",
};

export default function ReportesPage() {
  return <DashboardPlaceholder title="Reportes" />;
}
