import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";
import { requireProfile } from "@/core/auth/session";
import { fr } from "@/lib/i18n/fr";
import { SpacePage } from "../_components/space-page";

const t = fr.placeholders.messages;

export const metadata: Metadata = { title: t.metaTitle };

// Placeholder until the messaging (L1-21), reached from the bottom tabs.
export default async function MessagesPage() {
  await requireProfile();
  return (
    <SpacePage title={t.title}>
      <ComingSoon className="mt-6" title={t.comingTitle} text={t.comingText} />
    </SpacePage>
  );
}
