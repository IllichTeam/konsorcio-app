import type { Metadata } from "next";

import { ExpenseEmailSendStatusScreen } from "@/components/expense-emails/expense-email-send-status-screen";
import { expenseSendTitle, getExpenseSendNumber } from "@/lib/metadata/page-titles";

type ExpenseEmailSendPageProps = {
  params: Promise<{ id: string; envioId: string }>;
};

export async function generateMetadata({ params }: ExpenseEmailSendPageProps): Promise<Metadata> {
  const { id, envioId } = await params;
  const sendNumber = await getExpenseSendNumber(id, envioId);

  return {
    title: expenseSendTitle(sendNumber),
  };
}

export default async function ExpenseEmailSendPage({ params }: ExpenseEmailSendPageProps) {
  const { id, envioId } = await params;

  return <ExpenseEmailSendStatusScreen consortiumId={id} sendId={envioId} />;
}
