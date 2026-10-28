"use client";

import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/shared/button";
import { facadeScope } from "@/components/shared/facade-root";
import { IconButton } from "@/components/shared/icon-button";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.listing.facts;

/**
 * « Afficher les 23 caractéristiques » (L1-60, the list of amenities of
 * Airbnb): every fact of the listing, grouped, in a dialog: the whole screen
 * on a phone, a box of 780 px from 768 px. The grid is drawn by the server
 * and handed over as children (its pictograms are components).
 */
export function FactsDialog({
  count,
  title,
  children,
}: {
  count: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <Button variant="outline-ink" className="self-start">
          {t.all(count)}
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-60 bg-lk-ink/40 duration-220",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 motion-reduce:animate-none",
          )}
        />
        <DialogPrimitive.Content
          // Its title says what it holds: no description.
          aria-describedby={undefined}
          className={cn(
            facadeScope,
            "fixed inset-0 z-60 flex flex-col bg-lk-surface md:inset-auto md:top-1/2 md:left-1/2 md:max-h-[85dvh] md:w-[min(48.75rem,calc(100vw-4rem))] md:-translate-1/2 md:rounded-lk-3xl md:shadow-lk-d-block",
            "duration-220 ease-out-lk data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 motion-reduce:animate-none",
          )}
        >
          <div className="flex items-center gap-3 border-b border-lk-line px-5 py-3 md:px-6">
            <DialogPrimitive.Close asChild>
              <IconButton variant="transparent" icon={X} aria-label={t.close} />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className="text-lk-title font-semibold text-lk-ink">
              {title}
            </DialogPrimitive.Title>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-6 md:px-8 md:py-7">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
