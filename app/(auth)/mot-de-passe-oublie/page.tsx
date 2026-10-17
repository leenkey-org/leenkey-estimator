import type { Metadata } from "next";
import { fr } from "@/lib/i18n/fr";
import { AuthShell } from "../_components/auth-shell";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: fr.auth.forgot.metaTitle };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title={fr.auth.forgot.title} lead={fr.auth.forgot.lead}>
      <ForgotForm />
    </AuthShell>
  );
}
