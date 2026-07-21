export type Consortium = {
  id: string;
  name: string;
  location: string;
  paymentAlias: string | null;
  billingEmail: string | null;
  driveLink: string | null;
  unitCount: number;
  contactCount: number;
};

export type ConsortiumDetail = Consortium & {
  amount: number;
};
