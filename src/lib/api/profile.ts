import type { UserProfile } from "@/types/user";

const DEMO_PROFILE: UserProfile = {
  id: "demo-user",
  name: "Admin Name",
  email: "consorcioa@gmail.com",
  phone: "+123456789",
  address: "CABA ejemplo",
};

/** Perfil del usuario autenticado. Sustituir por fetch('/api/profile') o query Drizzle. */
export async function getCurrentProfile(): Promise<UserProfile> {
  return DEMO_PROFILE;
}

/** Actualiza perfil. Sustituir por PATCH /api/profile. */
export async function updateProfile(_profile: Partial<UserProfile>): Promise<UserProfile> {
  // TODO: persistir cambios en base de datos.
  return DEMO_PROFILE;
}
