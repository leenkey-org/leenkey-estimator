"use client";

import { useEffect } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { HtmlPage, preloadPage } from "@/components/site/HtmlPage";

export default function Index() {
  // Préchargement des autres pages en arrière-plan (idle) — navigation instantanée ensuite
  useEffect(() => {
    const idle =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => void })
        .requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 800));
    idle(() => {
      preloadPage("/pages/concept.html");
      preloadPage("/pages/investir.html");
    });
  }, []);

  return (
    <SiteLayout>
      <HtmlPage src="/pages/landing.html" />
    </SiteLayout>
  );
}
