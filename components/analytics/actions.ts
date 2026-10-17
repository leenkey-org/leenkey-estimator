"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { CONSENT_COOKIE, CONSENT_MAX_AGE, consentDay, serializeConsent } from "@/lib/consent";

type Result = { ok: true } | { ok: false; error: string };

const choiceSchema = z.boolean();

/**
 * Keeps the consent choice six months (L1-37). Set by the server: Safari and
 * every iOS browser limit a cookie written by a script to seven days.
 * Readable by the page script (not httpOnly), which applies the choice.
 */
export async function saveConsent(analytics: unknown): Promise<Result> {
  const parsed = choiceSchema.safeParse(analytics);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const proto = (await headers()).get("x-forwarded-proto")?.split(",")[0]?.trim();
  (await cookies()).set(
    CONSENT_COOKIE,
    serializeConsent({ analytics: parsed.data, date: consentDay() }),
    { path: "/", maxAge: CONSENT_MAX_AGE, sameSite: "lax", secure: proto === "https" },
  );
  return { ok: true };
}
