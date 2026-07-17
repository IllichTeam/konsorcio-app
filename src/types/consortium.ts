export type Consortium = {
  id: string;
  name: string;
  location: string;
};

export type ConsortiumDetail = Consortium & {
  amount: number;
  paymentAlias: string | null;
  billingEmail: string | null;
  driveLink: string | null;
};

export type ConsortiumHistoryEntry = {
  id: number;
  timestamp: string;
  description: string;
};
