"use client";

import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { Checkbox } from "@/components/shared/checkbox";
import { Textarea } from "@/components/shared/textarea";
import { fr } from "@/lib/i18n/fr";
import type { CaseCommand } from "@/lib/validations/admin";
import type { Database } from "@/types/database";
import { changeCase, type CaseCommandResult } from "../cases/actions";
import { caseFeedback } from "../feedback";
import { useModerationFeedback } from "./listing-moderation";

// The changes of a case from its sheet (L1-30c, SPEC-V2 section 17): its
// status, the admin who follows it, an internal note, the tasks of Leenkey of
// the current step. Each outcome shows at the top of the sheet
// (ModerationFeedback) and takes the focus; the page is read again by the
// action (revalidatePath).

const t = fr.adminCases;

type CaseStatus = Database["public"]["Enums"]["case_status"];

/** Sends a change and says its outcome; returns whether it was saved. */
function useCaseChange() {
  const report = useModerationFeedback();
  const router = useRouter();
  const [working, startTransition] = useTransition();
  const run = (command: CaseCommand, onDone?: () => void, onStart?: () => void) =>
    startTransition(async () => {
      onStart?.();
      let result: CaseCommandResult | null = null;
      try {
        result = await changeCase(command);
      } catch (error) {
        // The change may have been saved all the same: the message says so.
        console.error("[admin] case change request failed", error);
      }
      if (result?.ok === false && result.error === "not_found") router.refresh();
      if (result?.ok) onDone?.();
      report(caseFeedback(command, result));
    });
  return { working, run };
}

export function CaseDecisions({
  caseId,
  status,
  followed,
}: {
  caseId: string;
  status: CaseStatus;
  /** Whether the admin follows the case. */
  followed: boolean;
}) {
  const { working, run } = useCaseChange();
  return (
    <div
      role="group"
      aria-label={t.actions.label}
      aria-busy={working || undefined}
      className="flex flex-wrap items-center gap-2"
    >
      {status === "new" ? (
        <Button
          disabled={working}
          onClick={() => run({ action: "status", caseId, status: "in_progress" })}
        >
          {t.actions.start}
        </Button>
      ) : null}
      {status === "closed" ? (
        <Button
          variant="secondary"
          disabled={working}
          onClick={() => run({ action: "status", caseId, status: "in_progress" })}
        >
          {t.actions.reopen}
        </Button>
      ) : (
        <Button
          variant={status === "new" ? "secondary" : "primary"}
          disabled={working}
          onClick={() => run({ action: "status", caseId, status: "closed" })}
        >
          {t.actions.close}
        </Button>
      )}
      <Button
        variant="ghost"
        disabled={working}
        onClick={() => run({ action: "follow", caseId, follow: !followed })}
      >
        {followed ? t.actions.unfollow : t.actions.follow}
      </Button>
    </div>
  );
}

export function CaseNoteForm({ caseId }: { caseId: string }) {
  const { working, run } = useCaseChange();
  const [body, setBody] = useState("");
  const [invalid, setInvalid] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) {
      setInvalid(true);
      return;
    }
    run({ action: "note", caseId, body: body.trim() }, () => setBody(""));
  };
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <Textarea
        label={t.detail.noteField}
        value={body}
        maxLength={4000}
        rows={3}
        error={invalid ? t.errors.invalid : undefined}
        onChange={(event) => {
          setBody(event.target.value);
          if (invalid) setInvalid(false);
        }}
      />
      <Button type="submit" variant="secondary" loading={working} className="self-start">
        {t.detail.noteSubmit}
      </Button>
    </form>
  );
}

export function CaseTasks({
  caseId,
  tasks,
}: {
  caseId: string;
  tasks: readonly { id: string; title: string; done: boolean }[];
}) {
  const { working, run } = useCaseChange();
  // The box shows the click at once; the page read again after the change
  // (or its refusal) gives the state saved.
  const [shown, setShown] = useOptimistic(tasks, (state, change: { id: string; done: boolean }) =>
    state.map((task) => (task.id === change.id ? { ...task, done: change.done } : task)),
  );
  return (
    <ul aria-busy={working || undefined} className="flex flex-col gap-3">
      {shown.map((task) => (
        <li key={task.id}>
          <Checkbox
            label={task.title}
            checked={task.done}
            disabled={working}
            onChange={(event) => {
              const done = event.target.checked;
              run({ action: "task", caseId, taskId: task.id, done }, undefined, () =>
                setShown({ id: task.id, done }),
              );
            }}
          />
        </li>
      ))}
    </ul>
  );
}
