"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "./button";
import { fieldControlClassName } from "./field";
import { cn } from "@/lib/utils";

export type ComposerProps = {
  value: string;
  onValueChange: (value: string) => void;
  /** The text is not empty, and no message is on its way. */
  onSend: () => void;
  /** A message is on its way: the field waits, the button spins. */
  sending: boolean;
  /** Name of the field, for screen readers, and its placeholder: « Votre message ». */
  label: string;
  /** Name of the button: « Envoyer ». */
  sendLabel: string;
  maxLength: number;
  /** The error shown above, read with the field. */
  errorId?: string;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  className?: string;
};

/**
 * Message field of a conversation (docs/DESIGN.md 10.5): white, top border,
 * padding 10 × 12 × 22 (the iOS safe area included). The field starts at
 * 44 px, rectangular, radius 4, --lk-field border, and grows up to five
 * lines; the send button is 44 × 44, primary, radius 4. Enter sends with a
 * keyboard and a mouse (Shift + Enter: a new line); on a touch screen, Enter
 * makes a new line and the button sends.
 */
export function Composer({
  value,
  onValueChange,
  onSend,
  sending,
  label,
  sendLabel,
  maxLength,
  errorId,
  textareaRef,
  className,
}: ComposerProps) {
  const id = useId();
  const ownRef = useRef<HTMLTextAreaElement>(null);
  const fieldRef = textareaRef ?? ownRef;
  const empty = value.trim().length === 0;

  // Height of the text, within the limits of the CSS (min-h-11, max-h-33).
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.style.height = "auto";
    const borders = field.offsetHeight - field.clientHeight;
    field.style.height = `${field.scrollHeight + borders}px`;
  }, [value, fieldRef]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!sending && !empty) onSend();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className={cn(
        "flex items-end gap-2 border-t border-lk-line bg-lk-surface px-3 pt-2.5 pb-[max(1.375rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        ref={fieldRef}
        rows={1}
        value={value}
        maxLength={maxLength}
        placeholder={label}
        readOnly={sending}
        aria-describedby={errorId}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={onKeyDown}
        className={cn(
          fieldControlClassName,
          "h-auto max-h-33 min-h-11 flex-1 resize-none overflow-y-auto py-2 leading-normal",
        )}
      />
      {/* Disabled while the field is empty, never while sending: the focus stays on it. */}
      <Button
        type="submit"
        aria-label={sendLabel}
        aria-busy={sending || undefined}
        disabled={empty && !sending}
        className="size-11 shrink-0 px-0 [&_svg]:size-5"
      >
        {sending ? (
          <Loader2 aria-hidden="true" className="motion-safe:animate-spin" />
        ) : (
          <Send aria-hidden="true" />
        )}
      </Button>
    </form>
  );
}
