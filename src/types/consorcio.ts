export type Consorcio = {
  id: string;
  name: string;
  location: string;
};

export type ConsorcioDetail = Consorcio & {
  amount: number;
  paymentAlias: string;
  billingEmail: string;
  driveLink: string;
};

export type ConsorcioHistoryEntry = {
  id: number;
  timestamp: string;
  description: string;
};

export type CreateConsorcioCommentInput = {
  consorcioId: string;
  message: string;
};

export type UpdateConsorcioAmountInput = {
  consorcioId: string;
  amount: number;
};
