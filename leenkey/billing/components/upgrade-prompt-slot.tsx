import { propertyUpgradePrompt } from "../upgrade-queries";
import type { UpgradePlace } from "../upgrade-prompts";
import { PropertyUpgradePrompt } from "./property-upgrade-prompt";

// Where a page may show an upgrade prompt (L2-09): at most one, chosen on the
// server; nothing when none applies or when it cannot be read. Pages put it
// in a Suspense boundary: the page never waits for its proposal.
export async function UpgradePromptSlot({
  propertyId,
  place,
  headingAs,
  className,
}: {
  propertyId: string;
  place: UpgradePlace;
  headingAs?: "h2" | "h3";
  className?: string;
}) {
  const prompt = await propertyUpgradePrompt(propertyId, place);
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
