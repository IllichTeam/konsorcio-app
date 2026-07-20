export const queryKeys = {
  tenantEmails: {
    byConsortium: (consortiumId: string) => ["tenant-emails", consortiumId] as const,
  },
} as const;
