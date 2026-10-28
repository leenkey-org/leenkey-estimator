"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/shared/button";
import { fr } from "@/lib/i18n/fr";
import { setSaleTaskDone } from "../task-actions";

const t = fr.saleDashboard.todo;

/**
 * Ticks (or unticks) by hand a task of the sale (L1-24): a task without
 * event where the seller acts (« Notaire choisi »). The page is read again
 * by the action (revalidatePath): the step may move on.
 */
export function TaskDoneButton({
  propertyId,
  taskId,
  title,
  done,
  label,
  variant = "secondary",
  size = "sm",
}: {
  propertyId: string;
  taskId: string;
  title: string;
  /** Done already: the button puts it back to do. */
  done: boolean;
  /** Its visible label; « Fait » or « Annuler » by default. */
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const visible = label ?? (done ? t.markUndone : t.markDone);
  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <Button
        type="button"
        variant={done ? "ghost" : variant}
        size={size}
        loading={pending}
        // The visible label first in its name (WCAG 2.5.3).
        aria-label={`${visible}, ${done ? t.markUndoneLabel(title) : t.markDoneLabel(title)}`}
        onClick={() => {
          setError("");
          startTransition(async () => {
            const result = await setSaleTaskDone({ propertyId, taskId, done: !done }).catch(
              () => null,
            );
            if (!result?.ok) setError(t.error);
          });
        }}
      >
        {visible}
      </Button>
      <span role="status" className="text-lk-caption text-lk-danger empty:hidden">
        {error}
      </span>
    </span>
  );
}
