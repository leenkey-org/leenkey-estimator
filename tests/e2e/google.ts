import type { BrowserContext } from "@playwright/test";

// Google's scripts are replaced by stand-ins in the E2E tests: no real hit
// ever reaches the GA property of Leenkey, and the tests do not depend on the
// network. The stand-in of gtag.js sets the GA cookies, like the real one.
export const GOOGLE = /google|gstatic/;

const FAKE_GTAG = `document.cookie = "_ga=GA1.1.123456789.1700000000; path=/; max-age=34128000";
document.cookie = "_ga_27N3E3WP2D=GS1.1.1700000000.1.0.1700000000.0.0.0; path=/; max-age=34128000";`;

export async function fakeGoogle(context: BrowserContext) {
  await context.route(/googletagmanager\.com|google-analytics\.com/, async (route) => {
    const url = route.request().url();
    if (url.includes("/gtag/js")) {
      await route.fulfill({ contentType: "text/javascript", body: FAKE_GTAG });
    } else if (url.includes("/gtm.js")) {
      await route.fulfill({ contentType: "text/javascript", body: "/* gtm stand-in */" });
    } else {
      await route.fulfill({ status: 204, body: "" });
    }
  });
}

/** Consent cookie value for a choice made today. */
export function consentValue(analytics: boolean): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  return `v1.${analytics ? 1 : 0}.${day}`;
}
