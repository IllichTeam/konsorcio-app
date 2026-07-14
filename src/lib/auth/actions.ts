"use server";

import { cookies } from "next/headers";

import { AUTH_SESSION_COOKIE } from "@/lib/auth/constants";
import type { SignInInput, SignInResult } from "@/lib/auth/types";

export async function signIn(input: SignInInput): Promise<SignInResult> {
  const email = input.email.trim();
  const password = input.password;

  if (!email || password.length < 8) {
    return { success: false, error: "Credenciales inválidas" };
  }

  // TODO: reemplazar por authClient.signIn.email({ email, password }).
  const cookieStore = await cookies();
  cookieStore.set(AUTH_SESSION_COOKIE, "demo", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return { success: true };
}

export async function signOut(): Promise<void> {
  // TODO: reemplazar por authClient.signOut().
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_SESSION_COOKIE);
}
