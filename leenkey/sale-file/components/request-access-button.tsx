"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { frSaleFile } from "@/lib/i18n/sections/saleFile";
import { requestDocumentAccess } from "../actions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { saleFile: frSaleFile } as const;

const t = fr.saleFile.buyer.ask;

/** « Demander l'accès » to the documents of a property the buyer is in contact with. */
export function RequestAccessButton({ propertyId, title }: { propertyId: string; title: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-start gap-2">
      {notice?.tone === "success" ? null : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={pending}
          aria-label={t.actionAbout(title)}
          onClick={() =>
            start(async () => {
              setNotice(null);
              const result = await requestDocumentAccess(propertyId).catch(() => null);
              if (!result?.ok) {
                return setNotice({
                  tone: "danger",
                  text: t.errors[result?.error ?? "unavailable"],
                });
              }
              setNotice({ tone: "success", text: t.sent });
              router.refresh();
            })
          }
        >
          {t.action}
        </Button>
      )}
      {notice ? <InlineAlert tone={notice.tone}>{notice.text}</InlineAlert> : null}
    </div>
  );
}
