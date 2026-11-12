import type { Metadata } from "next";
import { frAuth } from "@/lib/i18n/sections/auth";
import { AuthShell } from "../_components/auth-shell";
import { ForgotForm } from "./forgot-form";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { auth: frAuth } as const;

export const metadata: Metadata = { title: fr.auth.forgot.metaTitle };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title={fr.auth.forgot.title} lead={fr.auth.forgot.lead}>
      <ForgotForm />
    </AuthShell>
  );
}
