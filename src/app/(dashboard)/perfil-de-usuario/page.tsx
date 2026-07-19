import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata: Metadata = {
  title: "Perfil — Konsorcio",
};

export default async function PerfilDeUsuarioPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/");
  }

  return <ProfileForm user={session.user} />;
}
