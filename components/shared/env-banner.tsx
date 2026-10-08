import { isStaging } from "@/lib/env";
import { fr } from "@/lib/i18n/fr";

// Visible on every page of the preprod (CLAUDE.md section 4). Rendered on the
// server: NEXT_PUBLIC_ENV is fixed at build time for each Vercel project.
export function EnvBanner() {
  if (!isStaging()) return null;
  return (
    <div
      role="status"
      style={{
        // Colours move to the design tokens with L1-07.
        background: "#B45309",
        color: "#FFFFFF",
        font: "600 12px/1.4 system-ui, sans-serif",
        textAlign: "center",
        padding: "6px 12px",
      }}
    >
      {fr.env.stagingBanner} · {fr.env.stagingBannerDetail}
    </div>
  );
}
