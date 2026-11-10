import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NO_ENERGY } from "@/leenkey/listings/energy-mentions";
import type { DpeLookup, DpeRecord } from "@/leenkey/properties/dpe-registry";

// L1-66: the DPE of a listing against the register of ADEME, on its sheet in
// the back office. The register is lookupDpe, mocked.

const record: DpeRecord = {
  number: "2491E0000001A",
  kind: "logement",
  dpe: "C",
  ges: "B",
  date: "2024-03-12",
  validUntil: "2034-03-11",
  energyKwhM2Year: 148,
  gesKgM2Year: 21,
  postalCode: "91360",
};

const mocks = vi.hoisted(() => ({ lookup: vi.fn<(number: string) => Promise<DpeLookup>>() }));
vi.mock("server-only", () => ({}));
vi.mock("@/leenkey/properties/dpe-registry", () => ({ lookupDpe: mocks.lookup }));

const entered = {
  number: record.number,
  date: "2024-03-12",
  kwhM2Year: 148,
  gesKgM2Year: 21,
  listing: { dpe: "C", ges: "B", postalCode: "91360", energy: NO_ENERGY },
} as const;

async function sheet(props: Partial<typeof entered> | Record<string, unknown> = {}) {
  const { DpeRegistryCheck } = await import("@/leenkey/admin/components/dpe-registry-check");
  const html = renderToStaticMarkup(await DpeRegistryCheck({ ...entered, ...props }));
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");
}

describe("DpeRegistryCheck", () => {
  beforeEach(() => {
    mocks.lookup.mockReset();
    mocks.lookup.mockResolvedValue({ ok: true, data: record });
  });

  it("says what the seller entered is what the register holds", async () => {
    const text = await sheet();
    expect(text).toContain("DPE n° 2491E0000001A au registre de l'ADEME");
    expect(text).toContain("Valable jusqu'au 11 mars 2034.");
    expect(text).toContain("La saisie du vendeur correspond au registre de l'ADEME.");
    expect(text).not.toContain("différent de la saisie");
  });

  it("shows a class that differs, and asks for the certificate of a new label", async () => {
    const text = await sheet({ listing: { ...entered.listing, dpe: "F" } });
    expect(text).toContain("(différent de la saisie)");
    expect(text).toContain("La saisie diffère du registre de l'ADEME.");
    expect(text).not.toContain("correspond au registre");
  });

  it("never reads a figure the seller left empty as a difference", async () => {
    const text = await sheet({ kwhM2Year: null, gesKgM2Year: null });
    expect(text).toContain("La saisie du vendeur correspond au registre de l'ADEME.");
  });

  it("says a DPE of another property, of another kind, or no longer valid, before the rest", async () => {
    expect(
      await sheet({ listing: { ...entered.listing, postalCode: "91600", dpe: "F" } }),
    ).toContain("c'est peut-être celui d'un autre bien");
    expect(
      await sheet({
        listing: { ...entered.listing, energy: { ...NO_ENERGY, kind: "tertiaire" } },
      }),
    ).toContain("Ce numéro est celui d'un DPE de logement");
    mocks.lookup.mockResolvedValue({ ok: true, data: { ...record, validUntil: "2024-12-31" } });
    expect(await sheet()).toContain("ce DPE n'est plus valable depuis le 31 décembre 2024");
  });

  it("says a number unknown to the register, and a register that does not answer", async () => {
    mocks.lookup.mockResolvedValue({ ok: true, data: null });
    expect(await sheet()).toContain(
      "Le DPE n° 2491E0000001A n'est pas dans les données ouvertes de l'ADEME",
    );
    mocks.lookup.mockResolvedValue({ ok: false, error: "unavailable" });
    expect(await sheet()).toContain("Le registre de l'ADEME ne répond pas");
  });
});
