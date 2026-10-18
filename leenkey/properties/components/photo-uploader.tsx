"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { flushSync } from "react-dom";
import { GripVertical, Loader2, Plus } from "lucide-react";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Photo } from "@/components/shared/photo";
import { NBSP } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import {
  addPhoto,
  captionPhoto,
  deletePhoto,
  listPhotos,
  reorderPhotos,
  type PhotoActionResult,
  type PhotoError,
} from "../photo-actions";
import { MAX_PHOTOS, PHOTO_MAX_BYTES, PHOTO_MINIMUM, PHOTO_TYPES, photoUrl } from "../photo-files";
import type { SellerPhoto } from "../photos";
import { PhotoSheet } from "./photo-sheet";
import { reducePhoto } from "./reduce-photo";

const t = fr.properties.photos;
const common = fr.properties.creation;

// PhotoUploader (docs/DESIGN.md 10.4, Bien.png): 4 columns of squares, the
// first marked « Principale », the counter « 4 / 15 », « Ajouter des
// photos » with a dashed border. Photos are sent one after the other as soon
// as chosen (or dropped), reduced beforehand in the browser when heavy, and
// saved at once: the form of the step does not carry them. Moved with the
// mouse (drag), the keyboard (arrows on a photo) or from the sheet of a
// photo (touch), which also gives its caption and deletes it. The server runs
// the changes one after the other: only the answer of the last one is shown,
// and a failure shows the photos as the server has them.

type Pending = { key: number; name: string };

function failure(error: PhotoError | "too_heavy", name: string): string {
  switch (error) {
    case "auth":
      return common.signedOut;
    case "not_found":
      return common.notFound;
    case "too_large":
      return t.errors.tooLarge(name);
    case "unsupported":
      return t.errors.unreadable(name);
    case "too_small":
      return t.errors.tooSmall(name, PHOTO_MINIMUM.long, PHOTO_MINIMUM.short);
    case "too_heavy":
      return t.errors.tooHeavy(name);
    case "full":
      return t.errors.full(name, MAX_PHOTOS);
    default:
      return t.errors.unavailable(name);
  }
}

export function PhotoUploader({
  propertyId,
  initial,
  onBusyChange,
}: {
  propertyId: string;
  initial: SellerPhoto[];
  /** Photos are being sent or changed: the step waits before going on. */
  onBusyChange?: (busy: boolean) => void;
}) {
  const titleId = useId();
  const hintId = useId();
  const [photos, setPhotos] = useState(initial);
  const [pending, setPending] = useState<Pending[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  // The sheet hides the page from screen readers: its own messages.
  const [notice, setNotice] = useState("");
  const [sheet, setSheet] = useState<{ id: string; error: string | null } | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);
  const [dropping, setDropping] = useState(false);
  const [working, startWorking] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const tiles = useRef(new Map<string, HTMLButtonElement>());
  const queue = useRef<{ key: number; file: File }[]>([]);
  const running = useRef(false);
  const lastKey = useRef(0);
  // Number of the last change sent: an older answer is not shown.
  const latest = useRef(0);
  // Where the focus goes once the sheet is closed (a deleted photo is gone).
  const afterSheet = useRef<HTMLElement | null>(null);

  const busy = pending.length > 0 || working;
  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);

  // A photo dropped beside the block would open in the tab, and the photos
  // still to send would be lost.
  useEffect(() => {
    const keep = (event: globalThis.DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };
    window.addEventListener("dragover", keep);
    window.addEventListener("drop", keep);
    return () => {
      window.removeEventListener("dragover", keep);
      window.removeEventListener("drop", keep);
    };
  }, []);

  /** The same message twice is read twice: a space added the second time. */
  function announce(message: string) {
    setStatus((current) => (current === message ? `${message}${NBSP}` : message));
  }

  /** On a failure: the photos as the server has them, the place of each one. */
  async function reload() {
    try {
      const result = await listPhotos({ propertyId });
      if (result.ok) setPhotos(result.data);
    } catch (caught) {
      console.error("[properties] photos reload failed", caught);
    }
  }

  const full = photos.length + pending.length >= MAX_PHOTOS;
  const open = sheet ? photos.findIndex((photo) => photo.id === sheet.id) : -1;

  async function send(file: File): Promise<string | null> {
    const reduced = await reducePhoto(file);
    if (!reduced.ok)
      return failure(reduced.error === "unreadable" ? "unsupported" : "too_heavy", file.name);
    const data = new FormData();
    data.set("propertyId", propertyId);
    data.set("file", reduced.blob, file.name);
    const mine = ++latest.current;
    let result: PhotoActionResult | null = null;
    try {
      result = await addPhoto(data);
    } catch (caught) {
      console.error("[properties] photo upload failed", caught);
    }
    if (!result?.ok) {
      if (mine === latest.current) await reload();
      return failure(result?.error ?? "unavailable", file.name);
    }
    // A change sent meanwhile answers after this one, with this photo.
    if (mine === latest.current) setPhotos(result.data);
    announce(t.added(result.data.length, MAX_PHOTOS));
    return null;
  }

  /** One photo after the other: the order of the choice is kept. */
  async function run() {
    if (running.current) return;
    running.current = true;
    for (let item = queue.current.shift(); item; item = queue.current.shift()) {
      const { key, file } = item;
      const error = await send(file);
      setPending((current) => current.filter((entry) => entry.key !== key));
      if (error) setErrors((current) => [...current, error]);
    }
    running.current = false;
  }

  function addFiles(list: FileList | readonly File[]) {
    const files = Array.from(list);
    if (files.length === 0) return;
    const refused: string[] = [];
    const accepted: { key: number; file: File }[] = [];
    let room = MAX_PHOTOS - photos.length - pending.length;
    for (const file of files) {
      if (!PHOTO_TYPES.some((type) => type === file.type)) refused.push(t.errors.format(file.name));
      else if (file.size > PHOTO_MAX_BYTES) refused.push(t.errors.tooLarge(file.name));
      else if (room <= 0) refused.push(t.errors.full(file.name, MAX_PHOTOS));
      else {
        room -= 1;
        lastKey.current += 1;
        accepted.push({ key: lastKey.current, file });
      }
    }
    setErrors(refused);
    if (accepted.length === 0) return;
    setPending((current) => [
      ...current,
      ...accepted.map(({ key, file }) => ({ key, name: file.name })),
    ]);
    queue.current.push(...accepted);
    void run();
  }

  /** A change of the photos, shown at once (next) and saved. */
  function change(
    next: SellerPhoto[] | null,
    action: () => Promise<PhotoActionResult>,
    onDone?: (photos: SellerPhoto[]) => void,
  ) {
    if (next) setPhotos(next);
    const mine = ++latest.current;
    startWorking(async () => {
      let result: PhotoActionResult | null = null;
      try {
        result = await action();
      } catch (caught) {
        console.error("[properties] photo change failed", caught);
      }
      if (result?.ok) {
        if (mine === latest.current) setPhotos(result.data);
        onDone?.(result.data);
        return;
      }
      if (mine === latest.current) await reload();
      const message =
        result?.error === "auth"
          ? common.signedOut
          : result?.error === "not_found"
            ? common.notFound
            : next
              ? t.errors.order
              : t.errors.change;
      if (sheet) setSheet((current) => current && { ...current, error: message });
      else setErrors([message]);
    });
  }

  function move(from: number, to: number, focus: boolean) {
    if (from === to || to < 0 || to >= photos.length) return;
    const order = [...photos];
    const [photo] = order.splice(from, 1);
    order.splice(to, 0, photo);
    const next = order.map((entry, index) => ({ ...entry, isCover: index === 0 }));
    // The tile keeps the focus where it lands.
    flushSync(() => setPhotos(next));
    if (focus) tiles.current.get(photo.id)?.focus();
    announce(t.moved(to + 1, next.length));
    change(next, () => reorderPhotos({ propertyId, photoIds: next.map((entry) => entry.id) }));
  }

  function onTileKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      move(index, index + (event.key === "ArrowLeft" ? -1 : 1), true);
    }
  }

  function onDragOver(event: DragEvent<HTMLElement>) {
    if (event.dataTransfer.types.includes("Files")) {
      event.preventDefault();
      setDropping(true);
    }
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    if (event.dataTransfer.files.length === 0) return;
    event.preventDefault();
    setDropping(false);
    addFiles(event.dataTransfer.files);
  }

  return (
    <section
      aria-labelledby={titleId}
      onDragOver={onDragOver}
      onDragLeave={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node && event.currentTarget.contains(next))) setDropping(false);
      }}
      onDrop={onDrop}
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-lk-md",
        dropping && "outline-2 outline-offset-4 outline-lk-blue outline-dashed",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={titleId} className="text-lk-label font-medium text-lk-ink">
          {t.title}
        </h3>
        <p className="text-lk-label text-lk-ink-3 tabular">
          <span aria-hidden="true">{t.count(photos.length, MAX_PHOTOS)}</span>
          <span className="sr-only">{t.countLabel(photos.length, MAX_PHOTOS)}</span>
        </p>
      </div>
      <p className="text-lk-caption text-lk-ink-3">{t.help}</p>
      <p id={hintId} className="sr-only">
        {t.hint}
      </p>

      {photos.length + pending.length > 0 ? (
        <ul className="grid grid-cols-4 gap-2">
          {photos.map((photo, index) => (
            <li key={photo.id} className="relative aspect-square">
              <button
                ref={(node) => {
                  if (node) tiles.current.set(photo.id, node);
                  else tiles.current.delete(photo.id);
                }}
                type="button"
                draggable
                aria-label={t.tile(index + 1, photos.length, photo.caption, index === 0)}
                aria-describedby={hintId}
                onClick={(event) => {
                  afterSheet.current = event.currentTarget;
                  setNotice("");
                  setSheet({ id: photo.id, error: null });
                }}
                onKeyDown={(event) => onTileKey(event, index)}
                onDragStart={(event) => {
                  setDragged(index);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", photo.id);
                }}
                onDragOver={(event) => {
                  if (dragged === null) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  if (dragged === null) return;
                  event.preventDefault();
                  event.stopPropagation();
                  move(dragged, index, false);
                  setDragged(null);
                }}
                onDragEnd={() => setDragged(null)}
                className={cn(
                  "group relative block size-full cursor-grab overflow-hidden rounded-lk-sm bg-lk-stone-2",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue",
                  dragged === index && "opacity-45",
                )}
              >
                <Photo src={photoUrl(photo.path)} alt="" sizes="(min-width: 768px) 132px, 25vw" />
                {index === 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1.5 left-1.5 rounded-full bg-lk-surface px-2 py-0.5 text-lk-micro font-semibold text-lk-ink"
                  >
                    {t.main}
                  </span>
                ) : null}
                {/* The grip, shown with the keyboard focus: the arrows move the photo. */}
                <GripVertical
                  aria-hidden="true"
                  className="absolute top-1 right-1 hidden size-6 rounded-lk-sm bg-lk-surface p-0.5 text-lk-ink group-focus-visible:block"
                />
              </button>
            </li>
          ))}
          {pending.map((entry) => (
            <li
              key={`pending-${entry.key}`}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lk-sm bg-lk-stone-2 text-lk-caption text-lk-ink-3"
            >
              <Loader2 aria-hidden="true" className="size-5 motion-safe:animate-spin" />
              <span>{t.sending}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        ref={addButton}
        type="button"
        disabled={full}
        onClick={() => input.current?.click()}
        className={cn(
          "mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-lk-sm border-[1.5px] border-dashed border-lk-blue-line text-lk-button-md font-semibold text-lk-blue",
          "transition-colors duration-140 ease-out-lk not-disabled:hover:bg-lk-blue-tint",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue",
          "disabled:cursor-not-allowed disabled:opacity-45",
        )}
      >
        <Plus aria-hidden="true" className="size-4" />
        {full ? t.full(MAX_PHOTOS) : t.add}
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept={PHOTO_TYPES.join(",")}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(event) => {
          if (event.target.files) addFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {errors.map((error, index) => (
        <InlineAlert key={`${index}-${error}`} tone="danger">
          {error}
        </InlineAlert>
      ))}
      {/* Always in the page: a live region added with its text is not read. */}
      <p role="status" className="sr-only">
        {status}
      </p>

      <PhotoSheet
        photo={open >= 0 ? photos[open] : null}
        index={open}
        total={photos.length}
        working={working}
        error={sheet?.error ?? null}
        notice={notice}
        onClose={() => setSheet(null)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const target = afterSheet.current;
          (target?.isConnected ? target : addButton.current)?.focus();
        }}
        onCaption={(caption) => {
          const photo = photos[open];
          if (!photo) return;
          setSheet((current) => current && { ...current, error: null });
          setNotice("");
          change(
            null,
            () => captionPhoto({ propertyId, photoId: photo.id, caption }),
            () => {
              announce(t.captionSaved);
              setNotice(t.captionSaved);
            },
          );
        }}
        onMove={(to) => {
          setSheet((current) => current && { ...current, error: null });
          setNotice(t.moved(to + 1, photos.length));
          move(open, to, false);
        }}
        onDelete={() => {
          const photo = photos[open];
          if (!photo) return;
          // The focus then goes to the photo that takes its place, or to the button.
          const neighbour = photos[open + 1] ?? photos[open - 1];
          setSheet((current) => current && { ...current, error: null });
          change(
            null,
            () => deletePhoto({ propertyId, photoId: photo.id }),
            () => {
              afterSheet.current = neighbour ? (tiles.current.get(neighbour.id) ?? null) : null;
              setSheet(null);
              announce(t.deleted);
            },
          );
        }}
      />
    </section>
  );
}
