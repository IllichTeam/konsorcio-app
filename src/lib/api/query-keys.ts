export const queryKeys = {
  consortiums: {
    history: (id: string) => ["consortiums", id, "history"] as const,
  },
  tenantEmails: {
    byConsortium: (consortiumId: string) => ["tenant-emails", consortiumId] as const,
  },
  profile: {
    current: ["profile", "current"] as const,
  },
} as const;
