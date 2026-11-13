// The font reader that comes with @react-pdf/renderer, typed for what the
// test of the PDF fonts uses of it (no @types package installed).
declare module "fontkit" {
  export function openSync(path: string): {
    hasGlyphForCodePoint(codePoint: number): boolean;
  };
}
