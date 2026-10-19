// A text with its bold parts and links, rendered by RichText
// (leenkey/site/components/rich-text.tsx): « La formule », { strong:
// « Autonomie est gratuite » }, « pendant… »; { link: « politique cookies »,
// href: « /cookies » }.

export type RichPart =
  | string
  | { readonly strong: string }
  | { readonly link: string; readonly href: string };

export type Rich = readonly RichPart[];
