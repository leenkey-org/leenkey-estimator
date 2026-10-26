import type { Progress, Step } from "./types";

// A progress read from the template of its steps (sale_steps and
// sale_step_tasks) and the tasks done (sale_task_status). Pure: unit tested.

export type StepRow = {
  code: string;
  position: number;
  title: string;
  description: string;
  owner: string;
  tasks: {
    id: string;
    code: string;
    title: string;
    required: boolean;
    auto_trigger: string | null;
    owner: string | null;
    position: number;
  }[];
};

export type DoneRow = { task_id: string | null; done_at: string | null };

export function toProgress(
  progress: { template: string; currentStepCode: string },
  steps: readonly StepRow[],
  done: readonly DoneRow[],
): Progress {
  const doneAt = new Map(
    done.flatMap((row) => (row.task_id && row.done_at ? [[row.task_id, row.done_at]] : [])),
  );
  return {
    ...progress,
    steps: [...steps]
      .sort((a, b) => a.position - b.position)
      .map((step) => ({
        code: step.code,
        position: step.position,
        title: step.title,
        description: step.description,
        tasks: [...step.tasks]
          .sort((a, b) => a.position - b.position)
          .map((task) => ({
            id: task.id,
            code: task.code,
            title: task.title,
            required: task.required,
            autoTrigger: task.auto_trigger,
            // A task without owner is the one of its step (SPEC-V2 section 4).
            owner: task.owner ?? step.owner,
            doneAt: doneAt.get(task.id) ?? null,
          })),
      })),
  };
}

export function currentStep(progress: Progress): Step | null {
  return progress.steps.find((step) => step.code === progress.currentStepCode) ?? null;
}

/** Tasks done and the total of a step, for « 2 sur 5 ». */
export function stepCount(step: Step): { done: number; total: number } {
  return {
    done: step.tasks.filter((task) => task.doneAt !== null).length,
    total: step.tasks.length,
  };
}
