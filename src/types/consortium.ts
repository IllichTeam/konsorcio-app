export type Consortium = {
  id: string;
  name: string;
  location: string;
  paymentAlias: string | null;
  billingEmail: string | null;
  driveLink: string | null;
};

export type ConsortiumDetail = Consortium & {
  amount: number;
};

export type ConsortiumHistoryEntry = {
  id: number;
  timestamp: string;
  description: string;
};
