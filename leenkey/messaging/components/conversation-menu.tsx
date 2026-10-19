"use client";

import { useRef, useState } from "react";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { MoreVertical } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { facadeScope } from "@/components/shared/facade-root";
import { IconButton } from "@/components/shared/icon-button";
import { Textarea } from "@/components/shared/textarea";
import { reportConversation } from "@/core/messaging/actions";
import { REPORT_REASON_MAX } from "@/lib/validations/messaging";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.messaging;

const itemClassName = cn(
  "flex h-11 cursor-pointer select-none items-center rounded-lk-sm px-3",
  "text-lk-compact font-medium text-lk-ink",
  "transition-colors duration-140 ease-out-lk data-[highlighted]:bg-lk-stone-2",
);

/**
 * Menu of a conversation (MoreVertical, docs/DESIGN.md 10.5): « Signaler la
 * conversation » (SPEC-V2 8.6), with its reason, for the Leenkey team. The
 * menu as the AccountMenu (Radix, not modal); the reason in a dialog
 * (10.8), after which the focus comes back to the menu button.
 */
export function ConversationMenu({
  conversationId,
  onReported,
}: {
  conversationId: string;
  onReported: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const confirm = async () => {
    setWorking(true);
    setError(null);
    const result = await reportConversation({ conversationId, reason });
    setWorking(false);
    if (result.ok) {
      setOpen(false);
      setReason("");
      onReported();
      return;
    }
    if (result.error === "tooShort" || result.error === "tooLong") {
      setFieldError(t.report[result.error]);
    } else {
      setError(t.report.unavailable);
    }
  };

  return (
    <>
      <MenuPrimitive.Root modal={false}>
        <MenuPrimitive.Trigger asChild>
          <IconButton
            ref={triggerRef}
            icon={MoreVertical}
            variant="transparent"
            aria-label={t.thread.menu}
          />
        </MenuPrimitive.Trigger>
        <MenuPrimitive.Portal>
          <MenuPrimitive.Content
            align="end"
            sideOffset={8}
            collisionPadding={12}
            className={cn(
              facadeScope,
              "z-50 min-w-55 rounded-lk-md border border-lk-line bg-lk-surface p-1.5 shadow-float",
              "duration-220 ease-out-lk data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[side=bottom]:slide-in-from-top-2",
              "motion-reduce:animate-none",
            )}
          >
            <MenuPrimitive.Item
              className={itemClassName}
              onSelect={() => {
                setFieldError(null);
                setError(null);
                setOpen(true);
              }}
            >
              {t.thread.report}
            </MenuPrimitive.Item>
          </MenuPrimitive.Content>
        </MenuPrimitive.Portal>
      </MenuPrimitive.Root>
      <ConfirmDialog
        open={open}
        title={t.report.title}
        description={t.report.text}
        confirmLabel={t.report.confirm}
        labels={t.dialog}
        working={working}
        error={error}
        onConfirm={() => void confirm()}
        onClose={() => setOpen(false)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      >
        <Textarea
          label={t.report.reason}
          value={reason}
          maxLength={REPORT_REASON_MAX}
          error={fieldError ?? undefined}
          onChange={(event) => {
            setReason(event.target.value);
            setFieldError(null);
          }}
        />
      </ConfirmDialog>
    </>
  );
}
