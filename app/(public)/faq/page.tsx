"use client";

import { SiteLayout } from "@/components/site/SiteLayout";
import { HtmlPage } from "@/components/site/HtmlPage";

export default function Faq() {
  return (
    <SiteLayout>
      <HtmlPage src="/pages/faq.html" />
    </SiteLayout>
  );
}
