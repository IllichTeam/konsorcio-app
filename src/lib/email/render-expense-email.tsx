import "server-only";

import { render } from "react-email";

import { ExpensaMensual, type ExpensaMensualProps } from "@/emails/expensa-mensual";

/**
 * Renders the monthly expense template to HTML.
 * Used by `sendExpenseEmail` and by `expenseEmails.preview` so both surfaces
 * share the exact same template.
 */
export async function renderExpenseEmailHtml(props: ExpensaMensualProps): Promise<string> {
  return render(<ExpensaMensual {...props} />);
}

export type { ExpensaMensualProps };
