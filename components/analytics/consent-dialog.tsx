"use client";

import { ConsentBanner, type ConsentBannerProps } from "@/components/shared/consent-banner";
import { facadeScope } from "@/components/shared/facade-root";

// The banner in the Façade scope, in the page sent by the server (P-06).
export default function ConsentDialog(props: ConsentBannerProps) {
  return (
    <div className={facadeScope}>
      <ConsentBanner {...props} />
    </div>
  );
}
