"use client";

import { ConsentBanner, type ConsentBannerProps } from "@/components/shared/consent-banner";
import { facadeScope } from "@/components/shared/facade-root";

// The banner in the Façade scope. Loaded on demand by ConsentManager: the V1
// pages only receive Sora when the banner is actually shown (L1-07).
export default function ConsentDialog(props: ConsentBannerProps) {
  return (
    <div className={facadeScope}>
      <ConsentBanner {...props} />
    </div>
  );
}
