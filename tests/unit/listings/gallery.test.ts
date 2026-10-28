import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The font is loaded by the compiler of Next.js, absent here.
vi.mock("next/font/google", () => ({
  Sora: () => ({ className: "sora", variable: "--font-sora", style: {} }),
}));
const { Gallery } = await import("@/components/shared/gallery");

// The desktop mosaic shows five photos; the fifth says how many are left.
// Each tile is named with what it shows (WCAG 2.5.3, label in name).

const property = "623efc8b-97d4-4902-ac43-406417498893";
const photos = Array.from({ length: 7 }, (_, index) => ({
  src: `/img/${property}/0b7d4c1e-5f3a-4b8e-9c2d-1a6e8f4b3c2${index}-1600.webp`,
  alt: `Photo ${index + 1}`,
}));

describe("gallery", () => {
  it("opens every photo from « Afficher toutes les photos » (L1-60)", () => {
    const html = renderToStaticMarkup(createElement(Gallery, { photos }));
    expect(html).toContain('aria-label="Agrandir la photo 4 sur 7"');
    expect(html).toContain('aria-label="Agrandir la photo 5 sur 7"');
    expect(html).toContain("Afficher toutes les photos</button>");
  });

  it("shows the photos sent by the server without waiting for the JavaScript", () => {
    const html = renderToStaticMarkup(createElement(Gallery, { photos }));
    expect(html).toContain("opacity-100");
    expect(html).not.toContain("opacity-0");
  });

  it("names the last tile as the others, and no button for a single photo", () => {
    const html = renderToStaticMarkup(createElement(Gallery, { photos: photos.slice(0, 5) }));
    expect(html).toContain('aria-label="Agrandir la photo 5 sur 5"');
    const single = renderToStaticMarkup(createElement(Gallery, { photos: photos.slice(0, 1) }));
    expect(single).not.toContain("Afficher toutes les photos");
  });
});
