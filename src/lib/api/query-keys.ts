export const queryKeys = {
  consorcios: {
    all: ["consorcios"] as const,
    detail: (id: string) => ["consorcios", id] as const,
    history: (id: string) => ["consorcios", id, "history"] as const,
  },
  profile: {
    current: ["profile", "current"] as const,
  },
} as const;
