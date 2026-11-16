"use client";

import { useEffect, useRef, useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";
import { frUpgrade } from "@/lib/i18n/sections/upgrade";
import { recordUpgradePrompt } from "../upgrade-actions";
import type { UpgradePromptView } from "../upgrade-queries";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { upgrade: frUpgrade } as const;

const t = fr.upgrade;

// The upgrade prompt of a property (L2-09, SPEC-V2 11 bis): recorded as
// shown once on the page, hidden for good by its X, recorded as opened
// before the plans page opens. A failed recording never stops the seller:
// the prompt still hides, the link still opens.

export function PropertyUpgradePrompt({
  prompt,
  headingAs,
  className,
}: {
  prompt: UpgradePromptView;
  headingAs?: "h2" | "h3";
  className?: string;
}) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const [opening, startTransition] = useTransition();
  const shown = useRef(false);
  const base = {
    propertyId: prompt.propertyId,
    trigger: prompt.trigger,
    subjectId: prompt.subjectId,
  };

  const record = async (event: "shown" | "clicked" | "dismissed") => {
    try {
      await recordUpgradePrompt({ ...base, event });
    } catch (error) {
      console.error("[billing] upgrade prompt request failed", error);
    }
  };

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    void record("shown");
    // Once per prompt shown on the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt.trigger, prompt.subjectId]);

  if (hidden) return null;

  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    // A new tab or window opens as a link does; the click is recorded on the way.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      void record("clicked");
      return;
    }
    event.preventDefault();
    startTransition(async () => {
      await record("clicked");
      router.push(prompt.action.href);
    });
  };

  return (
    <UpgradePrompt
      id={`proposition-${prompt.trigger}`}
      title={prompt.title}
      headingAs={headingAs}
      className={className}
      dismissLabel={t.dismiss}
      onDismiss={() => {
        setHidden(true);
        void record("dismissed");
      }}
      action={
        <a
          href={prompt.action.href}
          onClick={open}
          aria-busy={opening || undefined}
          className="inline-flex min-h-11 items-center gap-1.5 text-lk-label font-semibold text-lk-blue underline-offset-2 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-lk-brand-blue md:min-h-0"
        >
          {prompt.action.label}
          <ArrowRight aria-hidden="true" className="size-4" />
        </a>
      }
    >
      <p>{prompt.text}</p>
    </UpgradePrompt>
  );
}
