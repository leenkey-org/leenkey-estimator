import { afterEach, describe, expect, it, vi } from "vitest";

// L1-66: the register of ADEME asked for one DPE. The network is a script of
// answers; what the register answers is read in dpe-record.test.ts.

vi.mock("server-only", () => ({}));

const line = {
  numero_dpe: "2611E0031228S",
  etiquette_dpe: "C",
  etiquette_ges: "A",
  date_etablissement_dpe: "2026-01-07",
  date_fin_validite_dpe: "2036-01-06",
  conso_5_usages_par_m2_ep: 139,
  emission_ges_5_usages_par_m2: 5,
  code_postal_ban: "11000",
};

const answer = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("lookupDpe", () => {
  it("asks the dataset of the number, and reads its DPE", async () => {
    const fetch = vi.fn(async (url: string) =>
      url ? answer({ total: 1, results: [line] }) : answer(null),
    );
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("DPE_REGISTRY", "");
    const { lookupDpe } = await import("@/leenkey/properties/dpe-registry");
    expect(await lookupDpe("2611E0031228S")).toMatchObject({
      ok: true,
      data: { number: "2611E0031228S", kind: "logement", dpe: "C", energyKwhM2Year: 139 },
    });
    expect(String(fetch.mock.calls[0]?.[0])).toMatch(
      /^https:\/\/data\.ademe\.fr\/data-fair\/api\/v1\/datasets\/dpe03existant\/lines\?/,
    );
  });

  it("asks nothing for what is not the number of a DPE", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { lookupDpe } = await import("@/leenkey/properties/dpe-registry");
    expect(await lookupDpe("2611A0031228S")).toEqual({ ok: true, data: null });
    expect(await lookupDpe("https://exemple.test/")).toEqual({ ok: true, data: null });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("says the register does not answer: an error, a refusal, a wrong address", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("DPE_REGISTRY", "");
    const { lookupDpe } = await import("@/leenkey/properties/dpe-registry");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => answer({ error: "busy" }, 503)),
    );
    expect(await lookupDpe("2611E0031228S")).toEqual({ ok: false, error: "unavailable" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("The operation timed out.", "TimeoutError");
      }),
    );
    expect(await lookupDpe("2611E0031228S")).toEqual({ ok: false, error: "unavailable" });
    vi.stubEnv("DPE_REGISTRY_URL", "pas une adresse");
    expect(await lookupDpe("2611E0031228S")).toEqual({ ok: false, error: "unavailable" });
  });

  it("answers from the DPE of the tests when asked to, never in production", async () => {
    const fetch = vi.fn(async () => answer({ total: 0, results: [] }));
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("DPE_REGISTRY", "fixtures");
    vi.stubEnv("NEXT_PUBLIC_ENV", "local");
    const { lookupDpe } = await import("@/leenkey/properties/dpe-registry");
    expect(await lookupDpe("2491E0000001A")).toMatchObject({
      ok: true,
      data: { dpe: "C", ges: "B", date: "2024-03-12", postalCode: "91360" },
    });
    expect(await lookupDpe("2491E9999999Z")).toEqual({ ok: true, data: null });
    expect(fetch).not.toHaveBeenCalled();
    // In production the register is asked, whatever the variable says.
    vi.stubEnv("NEXT_PUBLIC_ENV", "production");
    expect(await lookupDpe("2491E0000001A")).toEqual({ ok: true, data: null });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
