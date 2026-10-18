"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/shared/button";
import { facadeScope } from "@/components/shared/facade-root";
import { IconButton } from "@/components/shared/icon-button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Photo } from "@/components/shared/photo";
import { Input } from "@/components/shared/input";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { photoCaptionMax } from "@/lib/validations/photos";
import { photoUrl } from "../photo-files";
import type { SellerPhoto } from "../photos";

const t = fr.properties.photos.sheet;

// Sheet of one photo of the PhotoUploader: full screen on a phone (the
// AppHeader with its back button), a dialog of 520 px from 768 px, as the
// dialogs of the back office. Its caption, its place (main photo, before,
// after: what dragging does with the mouse) and its deletion, confirmed.

type SheetProps = {
  photo: SellerPhoto | null;
  /** Place of the photo, from 0. */
  index: number;
  total: number;
  working: boolean;
  error: string | null;
  /** What the last change did (« Légende enregistrée. »), read in the sheet. */
  notice: string;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
  onCaption: (caption: string) => void;
  onMove: (to: number) => void;
  onDelete: () => void;
};

export function PhotoSheet({
  photo,
  index,
  total,
  working,
  onClose,
  onCloseAutoFocus,
  ...body
}: SheetProps) {
  return (
    <DialogPrimitive.Root
      open={photo !== null}
      onOpenChange={(open) => {
        if (!open && !working) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-60 bg-lk-ink/40 duration-220",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          onCloseAutoFocus={onCloseAutoFocus}
          aria-describedby={undefined}
          className={cn(
            facadeScope,
            "fixed inset-0 z-60 flex flex-col overflow-y-auto bg-lk-surface outline-none",
            "md:top-1/2 md:right-auto md:bottom-auto md:left-1/2 md:max-h-[85vh] md:w-130 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lk-md md:shadow-float",
            "duration-220 ease-out-lk data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none",
          )}
        >
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-lk-line px-5 pt-5 pb-3.5 md:flex md:border-0 md:px-6 md:pt-6 md:pb-0">
            <DialogPrimitive.Close asChild>
              <IconButton
                icon={ChevronLeft}
                variant="stone"
                aria-label={t.back}
                disabled={working}
                className="md:hidden"
              />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-center text-lk-title font-semibold text-lk-ink md:text-left md:text-lk-h2 md:font-bold md:text-wide">
              {t.title(index + 1, total)}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <IconButton
                icon={X}
                aria-label={t.close}
                variant="transparent"
                size="sm"
                disabled={working}
                className="hidden md:inline-flex"
              />
            </DialogPrimitive.Close>
            <span aria-hidden="true" className="size-11 md:hidden" />
          </div>

          {/* Keyed by photo: another photo opens with its own caption, no deletion pending. */}
          {photo ? (
            <SheetBody
              key={photo.id}
              photo={photo}
              index={index}
              total={total}
              working={working}
              {...body}
            />
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SheetBody({
  photo,
  index,
  total,
  working,
  error,
  notice,
  onCaption,
  onMove,
  onDelete,
}: Omit<SheetProps, "photo" | "onClose" | "onCloseAutoFocus"> & { photo: SellerPhoto }) {
  const [caption, setCaption] = useState(photo.caption ?? "");
  const [confirming, setConfirming] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const wasWorking = useRef(working);

  // A deletion that failed: its button, disabled while it was sent, takes the
  // focus back (on success the sheet closes).
  useEffect(() => {
    const lost = !root.current?.contains(document.activeElement);
    if (wasWorking.current && !working && confirming && lost) confirmButton.current?.focus();
    wasWorking.current = working;
  }, [working, confirming]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!working) onCaption(caption);
  };

  // Unavailable while a change is sent, or at the end of the row, but never
  // disabled: the button used keeps the keyboard focus (aria-disabled).
  const unavailable = "aria-disabled:cursor-not-allowed aria-disabled:opacity-45";
  const move = (to: number, possible: boolean) => () => {
    if (!working && possible) onMove(to);
  };

  return (
    <div
      ref={root}
      className="flex flex-col gap-5 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-6 md:pb-6"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-lk-sm bg-lk-stone-2">
        <Photo
          src={photoUrl(photo.path)}
          alt={photo.caption ?? ""}
          sizes="(min-width: 768px) 472px, 100vw"
          fit="contain"
        />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <Input
          label={t.caption}
          optional
          help={t.captionHelp}
          placeholder={t.captionPlaceholder}
          value={caption}
          maxLength={photoCaptionMax}
          onChange={(event) => setCaption(event.target.value)}
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          aria-disabled={working}
          className={unavailable}
        >
          {t.saveCaption}
        </Button>
      </form>

      {total > 1 ? (
        <div className="flex flex-col gap-2.5">
          {/* Stays once used, saying so: the focus is not lost. */}
          <Button
            variant="outline-ink"
            aria-disabled={working || index === 0}
            onClick={move(0, index > 0)}
            className={unavailable}
          >
            {index === 0 ? t.isMain : t.makeMain}
          </Button>
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              variant="outline-ink"
              aria-disabled={working || index === 0}
              onClick={move(index - 1, index > 0)}
              className={unavailable}
            >
              {t.before}
            </Button>
            <Button
              variant="outline-ink"
              aria-disabled={working || index === total - 1}
              onClick={move(index + 1, index < total - 1)}
              className={unavailable}
            >
              {t.after}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Out of the layout while empty, but in the page: a region shown with its text is not read. */}
      <p
        aria-live="polite"
        className={cn("text-lk-caption text-lk-success-fg", !notice && "sr-only")}
      >
        {notice}
      </p>
      {/* In the page from the opening, so that an error is read; out of the layout while empty. */}
      <div aria-live="polite" className={cn(!error && "sr-only")}>
        {error ? (
          <InlineAlert tone="danger" live={false}>
            {error}
          </InlineAlert>
        ) : null}
      </div>

      {confirming ? (
        <div className="flex flex-col gap-2.5 rounded-lk-md border border-lk-danger-bg bg-lk-danger-bg/40 p-4">
          <p className="text-lk-secondary text-lk-ink">{t.deleteWarning}</p>
          <div className="flex flex-col-reverse gap-2.5 md:flex-row md:justify-end">
            <Button variant="outline-ink" disabled={working} onClick={() => setConfirming(false)}>
              {t.cancel}
            </Button>
            <Button ref={confirmButton} variant="danger" loading={working} onClick={onDelete}>
              {t.confirmDelete}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="danger" disabled={working} onClick={() => setConfirming(true)}>
          {t.delete}
        </Button>
      )}
    </div>
  );
}
