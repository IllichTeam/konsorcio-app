import type { Metadata } from "next";

import { ExpenseEmailSendStatusScreen } from "@/components/expense-emails/expense-email-send-status-screen";

type ExpenseEmailSendPageProps = {
  params: Promise<{ id: string; envioId: string }>;
};

export async function generateMetadata({ params }: ExpenseEmailSendPageProps): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Estado del envío — Consorcio ${id.toUpperCase()} — Konsorcio`,
  };
}

export default async function ExpenseEmailSendPage({ params }: ExpenseEmailSendPageProps) {
  const { id, envioId } = await params;

  return <ExpenseEmailSendStatusScreen consortiumId={id} sendId={envioId} />;
}
