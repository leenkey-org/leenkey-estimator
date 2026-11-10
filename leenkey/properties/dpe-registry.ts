import "server-only";
import {
  DEFAULT_DPE_REGISTRY_URL,
  DPE_FIXTURES,
  dpeDataset,
  dpeRegistryUrl,
  readDpeRecord,
  type DpeRecord,
} from "./dpe-record";

export type { DpeRecord } from "./dpe-record";

/** data: null when the register has no DPE for this number. */
export type DpeLookup = { ok: true; data: DpeRecord | null } | { ok: false; error: "unavailable" };

// One DPE asked to the register of ADEME by its number (L1-66), from the
// server, without a key. DPE_REGISTRY_URL changes the service,
// DPE_REGISTRY=fixtures answers from a short list (dpe-record.ts): end-to-end
// tests, environment without access; never in production. A register that
// does not answer never stops a seller: the values are then typed.

export async function lookupDpe(number: string): Promise<DpeLookup> {
  const dataset = dpeDataset(number);
  if (!dataset) return { ok: true, data: null };
  if (process.env.DPE_REGISTRY === "fixtures" && process.env.NEXT_PUBLIC_ENV !== "production") {
    return { ok: true, data: DPE_FIXTURES.find((record) => record.number === number) ?? null };
  }
  try {
    // Inside: a wrong DPE_REGISTRY_URL is said as unavailable too.
    const url = dpeRegistryUrl(
      process.env.DPE_REGISTRY_URL || DEFAULT_DPE_REGISTRY_URL,
      number,
      dataset,
    );
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    return { ok: true, data: readDpeRecord(number, dataset, await response.json()) };
  } catch (error) {
    console.error("[properties] DPE register lookup failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "unavailable" };
  }
}
