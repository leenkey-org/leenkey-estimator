// Steps and tasks of a process (SPEC-V2 section 9), generic: an entity follows
// the steps of its template, each task ticked by an event or by hand. The
// database keeps the current step (supabase/migrations, L1-23); the
// application says who does each task and where (leenkey/properties/).

export type StepTask = {
  id: string;
  code: string;
  title: string;
  /** Not done, it keeps its step current. */
  required: boolean;
  /** The event that ticks it; null: ticked by hand. */
  autoTrigger: string | null;
  /** Who does it, in the words of the application (the owner of its step when the task has none). */
  owner: string;
  doneAt: string | null;
};

export type Step = {
  code: string;
  position: number;
  title: string;
  /** What the step is for: its advice once nothing is left to do in it. */
  description: string;
  tasks: StepTask[];
};

export type Progress = {
  /** The template followed (a plan). */
  template: string;
  currentStepCode: string;
  /** In order of position. */
  steps: Step[];
};
