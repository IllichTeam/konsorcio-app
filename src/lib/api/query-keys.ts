export const queryKeys = {
  consorcios: {
    all: ["consorcios"] as const,
    detail: (id: string) => ["consorcios", id] as const,
    history: (id: string) => ["consorcios", id, "history"] as const,
  },
  tenantEmails: {
    byConsorcio: (consorcioId: string) => ["tenant-emails", consorcioId] as const,
  },
  profile: {
    current: ["profile", "current"] as const,
  },
} as const;
