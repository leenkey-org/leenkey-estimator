"use client";

import { useId, useOptimistic, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Input } from "@/components/shared/input";
import { Select } from "@/components/shared/select";
import { frFavorites } from "@/lib/i18n/sections/favorites";
import { cn } from "@/lib/utils";
import {
  FAVORITE_LIST_NAME_MAX,
  FAVORITE_LISTS_MAX,
  isReservedListName,
} from "@/lib/validations/favorites";
import {
  createFavoriteList,
  deleteFavoriteList,
  moveFavoriteToList,
  renameFavoriteList,
  type FavoriteListError,
} from "../actions";
import { inListFilter } from "../lists";
import { announceFavoriteLists, clearFavoriteListsStatus } from "./favorite-lists-status";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { favorites: frFavorites } as const;

const t = fr.favorites.lists;

// Named lists of favourites (DECISIONS.md 2026-11-26): « Nouvelle liste »,
// « Renommer » and « Supprimer la liste » in a dialog (docs/DESIGN.md 10.8),
// and the menu that files a favourite, under its card.

type NameError = { field: string | null; dialog: string | null };

/** Where the refusal of a name is said: under the field, or in the dialog. */
function nameError(error: FavoriteListError, name: string): NameError {
  switch (error) {
    case "invalid":
      return {
        field: name.trim() === "" ? t.errors.required : t.errors.tooLong(FAVORITE_LIST_NAME_MAX),
        dialog: null,
      };
    case "reserved":
      return { field: t.errors.reserved, dialog: null };
    case "duplicate":
      return { field: t.errors.duplicate, dialog: null };
    case "limit":
      return { field: null, dialog: t.errors.limit(FAVORITE_LISTS_MAX) };
    case "missing":
      return { field: null, dialog: t.errors.missing };
    case "auth":
      return { field: null, dialog: fr.favorites.signedOut };
    default:
      return { field: null, dialog: t.errors.unavailable };
  }
}

/** The dialog that asks the name of a list, new or renamed. */
function ListNameDialog({
  open,
  title,
  description,
  confirmLabel,
  initialName,
  save,
  onSaved,
  onClose,
  onCloseAutoFocus,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  initialName: string;
  /** Creates the list of this name, or gives this name to the list. */
  save: (
    name: string,
  ) => Promise<
    { ok: true; data: { id: string; name: string } } | { ok: false; error: FavoriteListError }
  >;
  onSaved: (list: { id: string; name: string }) => void;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<NameError>({ field: null, dialog: null });
  const [working, setWorking] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  /** Said under the field, and read: the focus goes back to it (DESIGN.md 15). */
  const fail = (next: NameError) => {
    flushSync(() => {
      setWorking(false);
      setError(next);
    });
    if (next.field) field.current?.focus();
  };

  const confirm = async () => {
    if (name.trim() === "") {
      fail({ field: t.errors.required, dialog: null });
      return;
    }
    if (isReservedListName(name)) {
      fail({ field: t.errors.reserved, dialog: null });
      return;
    }
    setWorking(true);
    setError({ field: null, dialog: null });
    let result: Awaited<ReturnType<typeof save>> | null = null;
    try {
      result = await save(name);
    } catch (caught) {
      console.error("[favorites] list not saved", caught);
    }
    // Null: the action did not answer (network, a page older than the deployment).
    if (!result) {
      fail({ field: null, dialog: t.errors.unavailable });
      return;
    }
    if (!result.ok) {
      fail(nameError(result.error, name));
      return;
    }
    setWorking(false);
    onSaved(result.data);
  };

  return (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      labels={t.dialog}
      working={working}
      error={error.dialog}
      onConfirm={() => void confirm()}
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <Input
        ref={field}
        // The dialog opens on its only field (Radix keeps a focus already inside).
        autoFocus
        label={t.nameLabel}
        help={t.nameHelp(FAVORITE_LIST_NAME_MAX)}
        value={name}
        maxLength={FAVORITE_LIST_NAME_MAX}
        // Read-only, not disabled, while it is saved: the focus stays in the field.
        readOnly={working}
        autoComplete="off"
        enterKeyHint="done"
        error={error.field ?? undefined}
        onChange={(event) => {
          setName(event.target.value);
          setError({ field: null, dialog: null });
        }}
      />
    </ConfirmDialog>
  );
}

/**
 * « Nouvelle liste »: the list appears among the filters, the page stays.
 * With 20 lists the button is off, and the reason is written beside it.
 */
export function NewFavoriteList({
  scope,
  full,
  className,
}: {
  scope: string;
  /** The account has its 20 lists. */
  full: boolean;
  className?: string;
}) {
  const limitId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  // A new dialog at each opening: an empty field, no error of the time before.
  const [opened, setOpened] = useState(0);
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("flex flex-col items-start gap-1.5 md:items-end", className)}>
      <Button
        ref={trigger}
        variant="secondary"
        size="sm"
        disabled={full}
        aria-describedby={full ? limitId : undefined}
        onClick={() => {
          clearFavoriteListsStatus();
          setOpened((count) => count + 1);
          setOpen(true);
        }}
      >
        <Plus aria-hidden="true" className="size-4" />
        {t.create}
      </Button>
      {full ? (
        <p id={limitId} className="text-lk-caption text-lk-ink-3 md:max-w-70 md:text-right">
          {t.errors.limit(FAVORITE_LISTS_MAX)}
        </p>
      ) : null}
      <ListNameDialog
        key={opened}
        open={open}
        title={t.createTitle}
        description={t.createText}
        confirmLabel={t.createConfirm}
        initialName=""
        save={(name) => createFavoriteList({ name })}
        onSaved={(list) => {
          setOpen(false);
          announceFavoriteLists(t.created(list.name), scope);
        }}
        onClose={() => setOpen(false)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          trigger.current?.focus();
        }}
      />
    </div>
  );
}

/** « Renommer » and « Supprimer la liste », beside the name of the list shown. */
export function FavoriteListActions({
  list,
  allHref,
  className,
}: {
  list: { id: string; name: string };
  /** The favourites page without a filter, where a deleted list leads. */
  allHref: string;
  className?: string;
}) {
  const router = useRouter();
  const renameTrigger = useRef<HTMLButtonElement>(null);
  const removeTrigger = useRef<HTMLButtonElement>(null);
  const [opened, setOpened] = useState(0);
  const [dialog, setDialog] = useState<"rename" | "remove" | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  // Deleted: the page changes, nothing of this one takes the focus back.
  const removed = useRef(false);

  const remove = async () => {
    setRemoving(true);
    setRemoveError(null);
    let result: Awaited<ReturnType<typeof deleteFavoriteList>> | null = null;
    try {
      result = await deleteFavoriteList({ listId: list.id });
    } catch (caught) {
      console.error("[favorites] list not deleted", caught);
    }
    setRemoving(false);
    if (!result?.ok) {
      setRemoveError(
        result?.error === "auth" ? fr.favorites.signedOut : t.errors.removeUnavailable,
      );
      return;
    }
    removed.current = true;
    // Said on the page of every favourite, where the focus goes.
    announceFavoriteLists(t.removed(list.name), "all", true);
    setDialog(null);
    router.replace(allHref);
  };

  return (
    <div className={className}>
      <Button
        ref={renameTrigger}
        variant="ghost"
        size="sm"
        onClick={() => {
          clearFavoriteListsStatus();
          setOpened((count) => count + 1);
          setDialog("rename");
        }}
      >
        {t.rename}
      </Button>
      <Button
        ref={removeTrigger}
        variant="ghost"
        size="sm"
        onClick={() => {
          clearFavoriteListsStatus();
          setRemoveError(null);
          setDialog("remove");
        }}
      >
        {t.remove}
      </Button>
      <ListNameDialog
        key={opened}
        open={dialog === "rename"}
        title={t.renameTitle}
        description={t.renameText(list.name)}
        confirmLabel={t.renameConfirm}
        initialName={list.name}
        save={(name) => renameFavoriteList({ listId: list.id, name })}
        onSaved={(saved) => {
          setDialog(null);
          announceFavoriteLists(t.renamed(saved.name), list.id);
        }}
        onClose={() => setDialog(null)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          renameTrigger.current?.focus();
        }}
      />
      <ConfirmDialog
        open={dialog === "remove"}
        title={t.removeTitle(list.name)}
        description={t.removeText}
        confirmLabel={t.remove}
        confirmVariant="danger"
        labels={t.dialog}
        working={removing}
        error={removeError}
        onConfirm={() => void remove()}
        onClose={() => setDialog(null)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (!removed.current) removeTrigger.current?.focus();
        }}
      />
    </div>
  );
}

/**
 * « Ranger dans une liste », under the card of a favourite: a native select
 * (the picker of the phone), « Sans liste » then the lists. The choice shows
 * at once and comes back if it cannot be saved; the page says the outcome
 * (FavoriteListsStatus), and takes the focus when the card leaves the list
 * shown.
 */
export function FavoriteListSelect({
  listingId,
  listId,
  lists,
  property,
  scope,
  className,
}: {
  listingId: string;
  /** The list the favourite is in, as the server read it. */
  listId: string | null;
  lists: readonly { id: string; name: string }[];
  /** The property, in the name of the menu: several follow each other. */
  property: string;
  /** The filter of the page (lists.ts, listFilterKey). */
  scope: string;
  className?: string;
}) {
  const [shown, setShown] = useOptimistic(listId);
  const [, startTransition] = useTransition();

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* What the menu is for, for the eye; its label names the property. */}
      <span aria-hidden="true" className="shrink-0 text-lk-caption font-medium text-lk-ink-3">
        {t.moveShort}
      </span>
      <Select
        label={t.moveProperty(property)}
        hideLabel
        compact
        containerClassName="min-w-0 flex-1"
        value={shown ?? ""}
        onChange={(event) => {
          const next = event.target.value || null;
          clearFavoriteListsStatus();
          startTransition(async () => {
            setShown(next);
            let result: Awaited<ReturnType<typeof moveFavoriteToList>> | null = null;
            try {
              result = await moveFavoriteToList({ listingId, listId: next });
            } catch (caught) {
              // Network, server error or an action unknown since a deployment.
              console.error("[favorites] favourite not filed", caught);
            }
            if (result?.ok) {
              const name = lists.find((list) => list.id === next)?.name;
              announceFavoriteLists(
                name ? t.moved(name) : t.unfiled,
                scope,
                !inListFilter(next, scope),
              );
            } else {
              announceFavoriteLists(
                result?.error === "auth"
                  ? fr.favorites.signedOut
                  : result?.error === "missing"
                    ? t.moveMissing
                    : t.moveError,
                scope,
                false,
                "danger",
              );
            }
          });
        }}
      >
        <option value="">{t.none}</option>
        {lists.map((list) => (
          <option key={list.id} value={list.id}>
            {list.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
