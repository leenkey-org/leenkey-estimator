import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { readProofFile } = await import("@/core/documents/proof-file");

// L2-02: a proof sent by a user, read from its content.

const MAX = 5 * 1024 * 1024;

describe("readProofFile", () => {
  it("keeps a PDF as it is", async () => {
    const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF");
    const result = await readProofFile(pdf, MAX);
    expect(result).toEqual({
      ok: true,
      data: { kind: "pdf", mimeType: "application/pdf", extension: "pdf", data: pdf },
    });
  });

  it("turns an image into a JPEG without its metadata, never larger than a page", async () => {
    const png = await sharp({
      create: {
        width: 3000,
        height: 1500,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .withExif({ IFD0: { Copyright: "secret" } })
      .png()
      .toBuffer();
    const result = await readProofFile(png, MAX);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.mimeType).toBe("image/jpeg");
    const meta = await sharp(result.data.data).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["jpeg", 2400, 1200]);
    expect(meta.exif).toBeUndefined();
  });

  it("refuses what is neither: by its content, whatever its name says", async () => {
    expect(await readProofFile(Buffer.from("MZ\u0090\u0000 not a document"), MAX)).toEqual({
      ok: false,
      error: "unsupported",
    });
    expect(await readProofFile(Buffer.alloc(0), MAX)).toEqual({ ok: false, error: "unsupported" });
    const gif = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "#ffffff" },
    })
      .gif()
      .toBuffer();
    expect(await readProofFile(gif, MAX)).toEqual({ ok: false, error: "unsupported" });
  });

  it("refuses a file heavier than what is kept", async () => {
    const pdf = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(2000)]);
    expect(await readProofFile(pdf, 1000)).toEqual({ ok: false, error: "too_heavy" });
  });
});
