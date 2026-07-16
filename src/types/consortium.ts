export type Consortium = {
  id: string;
  name: string;
  location: string;
};

export type ConsortiumDetail = Consortium & {
  amount: number;
  paymentAlias: string;
  billingEmail: string;
  driveLink: string;
};

export type ConsortiumHistoryEntry = {
  id: number;
  timestamp: string;
  description: string;
};

export type CreateConsortiumCommentInput = {
  consortiumId: string;
  message: string;
};
