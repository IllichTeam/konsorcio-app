import type { UserProfile } from "@/types/user";

export type SessionUser = Pick<UserProfile, "id" | "name" | "email">;

export type Session = {
  user: SessionUser;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type SignInResult = { success: true } | { success: false; error: string };
