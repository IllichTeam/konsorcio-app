import { cookies } from "next/headers";

import { AUTH_SESSION_COOKIE } from "@/lib/auth/constants";
import type { Session, SessionUser } from "@/lib/auth/types";

const DEMO_USER: SessionUser = {
  id: "demo-user",
  name: "Admin Name",
  email: "consorcioa@gmail.com",
};

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  // TODO: validar sesión con Better Auth y/o base de datos.
  return { user: DEMO_USER };
}
