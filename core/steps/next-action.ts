import { currentStep } from "./progress";
import type { Progress, Step, StepTask } from "./types";

// The last rules of the next action (SPEC-V2 8.7, rules 6 and 7), generic:
// the first task not done of the current step that the user can do, else the
// advice of that step. The rules before them belong to the application
// (leenkey/properties/next-action.ts).

export type StepAction =
  | { kind: "task"; step: Step; task: StepTask }
  | { kind: "advice"; step: Step };

/**
 * Rule 6, then rule 7: the first task not done of the current step, in its
 * order, among those `canDo` gives to the user (a task of Leenkey, or one
 * without a screen yet, is not theirs); else the advice of the step.
 */
export function stepAction(
  progress: Progress,
  canDo: (task: StepTask) => boolean,
): StepAction | null {
  const step = currentStep(progress);
  if (!step) return null;
  const task = step.tasks.find((candidate) => candidate.doneAt === null && canDo(candidate));
  return task ? { kind: "task", step, task } : { kind: "advice", step };
}
