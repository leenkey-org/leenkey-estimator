import type { UpgradePromptView } from "../upgrade-queries";
import { PropertyUpgradePrompt } from "./property-upgrade-prompt";

// Where a page shows its upgrade prompt (L2-09): at most one, read by the
// page itself with propertyUpgradePrompt, in parallel with its other reads
// (no Suspense boundary of its own: a page re-rendered by a server action
// must not hold an open stream, which kept a navigation waiting);
// nothing when none applies or when it cannot be read.
export function UpgradePromptSlot({
  prompt,
  headingAs,
  className,
}: {
  prompt: UpgradePromptView | null;
  headingAs?: "h2" | "h3";
  className?: string;
}) {
  if (!prompt) return null;
  // One state per prompt: a soft navigation to another property or offer starts afresh.
  return (
    <PropertyUpgradePrompt
      key={`${prompt.propertyId}:${prompt.trigger}:${prompt.subjectId ?? ""}`}
      prompt={prompt}
      headingAs={headingAs}
      className={className}
    />
  );
}
