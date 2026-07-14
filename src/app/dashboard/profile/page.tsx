import type { Metadata } from "next";

import { getSession } from "@/lib/auth/session";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata: Metadata = {
  title: "Perfil — Konsorcio",
};

export default async function ProfilePage() {
  const session = await getSession();

  return <ProfileForm userName={session?.user.name ?? "Administrador"} />;
}
