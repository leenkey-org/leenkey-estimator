import { isStaging } from "@/lib/env";
import { fr } from "@/lib/i18n/fr";

// Visible on every page of the preprod (CLAUDE.md section 4). Rendered on the
// server: NEXT_PUBLIC_ENV is fixed at build time for each Vercel project.
export function EnvBanner() {
  if (!isStaging()) return null;
  return (
    <div
      role="status"
      // Façade tokens (white on --lk-warning, 5.02:1). The font stays the
      // system one: the banner also sits above the V1 pages.
      className="bg-lk-warning text-white"
      style={{
        font: "600 12px/1.4 system-ui, sans-serif",
        textAlign: "center",
        padding: "6px 12px",
      }}
    >
      {fr.env.stagingBanner} · {fr.env.stagingBannerDetail}
    </div>
  );
}
