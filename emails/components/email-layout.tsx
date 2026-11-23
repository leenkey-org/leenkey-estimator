import { Fragment, type ReactNode } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { frLegal } from "@/lib/i18n/sections/legal";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails, legal: frLegal } as const;

// Common template of the emails (docs/DESIGN.md 14, SPEC-V2 section 18), in
// the brand of the site since 2026-11-23 (charte D, DECISIONS.md): light
// background, white card of 560 px with a 16 px radius, night band with
// « Leenkey » in white, Sora with an Arial fallback (mail clients rarely load
// a web font), one pill button in the brand gradient over a solid blue (the
// clients that drop gradients keep the blue), footer with the notification
// settings and the legal identity. Inline styles only: mail clients drop
// style sheets. Colours of the palette (DESIGN.md 2.1).

const t = fr.emails;

const FONT = "Sora, Arial, Helvetica, sans-serif";
const INK = "#0F172A";
const MUTED = "#5B6880";
const NIGHT = "#020D21";
// Under white text: the AA tones of the gradient (DESIGN.md 2.1).
const BUTTON_BLUE = "#2563EB";
const BUTTON_GRADIENT = "linear-gradient(90deg, #2563EB, #7C3AED)";
// Small coloured texts and marks: the indigo of the brand.
const BLUE = "#4338CA";
const BLUE_TINT = "#EEF2FF";
const LINE = "#E2E8F0";
const BACKGROUND = "#F1F5F9";

export const emailText = { margin: "0 0 16px", fontSize: "15px", lineHeight: "1.6", color: INK };

/**
 * Options of render() for the plain text version: the titles keep their case
 * (html-to-text writes them in capitals by default, DESIGN.md 16).
 */
export const EMAIL_PLAIN_TEXT = {
  plainText: true,
  htmlToTextOptions: {
    selectors: ["h1", "h2", "h3"].map((selector) => ({ selector, options: { uppercase: false } })),
  },
} as const;
export const emailLink = { color: BLUE, textDecoration: "underline" };
/** The words of another person (the excerpt of a message), set apart on the blue tint. */
export const emailQuote = {
  ...emailText,
  padding: "12px 16px",
  borderLeft: `3px solid ${BLUE}`,
  backgroundColor: BLUE_TINT,
};

export type EmailLayoutProps = {
  /** Line shown by the inbox after the subject. */
  preview: string;
  title: string;
  /** Address of the site, for the links of the footer. */
  siteUrl: string;
  action?: { href: string; label: string };
  /** A notification for the team of Leenkey: its own footer, no preferences. */
  internal?: boolean;
  /** Why the recipient gets it, when they do not sell (a buyer, L1-22). */
  why?: string;
  children: ReactNode;
};

export function EmailLayout({
  preview,
  title,
  siteUrl,
  action,
  internal = false,
  why = t.footer.why,
  children,
}: EmailLayoutProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{ margin: 0, padding: "24px 12px", backgroundColor: BACKGROUND, fontFamily: FONT }}
      >
        <Container
          style={{
            maxWidth: "560px",
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >
          <Section style={{ padding: "22px 32px", backgroundColor: NIGHT }}>
            <Text style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#FFFFFF" }}>
              {t.brand}
            </Text>
          </Section>
          <Section style={{ padding: "28px 32px 32px" }}>
            <Heading
              as="h1"
              style={{
                margin: "0 0 16px",
                fontSize: "24px",
                lineHeight: "1.25",
                fontWeight: 700,
                color: INK,
              }}
            >
              {title}
            </Heading>
            {children}
            {action ? (
              <Button
                href={action.href}
                style={{
                  display: "inline-block",
                  margin: "8px 0 24px",
                  padding: "14px 28px",
                  borderRadius: "999px",
                  backgroundColor: BUTTON_BLUE,
                  backgroundImage: BUTTON_GRADIENT,
                  color: "#FFFFFF",
                  fontSize: "15px",
                  fontWeight: 600,
                  lineHeight: "20px",
                  textDecoration: "none",
                }}
              >
                {action.label}
              </Button>
            ) : null}
            <Text style={{ ...emailText, margin: 0 }}>{t.signature}</Text>
          </Section>
        </Container>
        <Container style={{ maxWidth: "560px", padding: "16px 32px 0" }}>
          <Text style={{ margin: "0 0 8px", fontSize: "12px", lineHeight: "1.5", color: MUTED }}>
            {internal ? (
              t.footer.internal
            ) : (
              <>
                {why}{" "}
                <Link
                  href={`${siteUrl}/compte/notifications`}
                  style={{ color: MUTED, textDecoration: "underline" }}
                >
                  {t.footer.preferences}
                </Link>
              </>
            )}
          </Text>
          <Hr style={{ margin: "8px 0", borderColor: LINE }} />
          <Text style={{ margin: 0, fontSize: "12px", lineHeight: "1.5", color: MUTED }}>
            {fr.legal.company} · {fr.legal.address}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/**
 * The motive of a decision, set apart in the email. Its line breaks become
 * <br />: every mail client shows them, and the plain text keeps them.
 */
export function EmailQuote({ label, text }: { label: string; text: string }) {
  const lines = text.split(/\r?\n/);
  return (
    <Section
      style={{
        margin: "0 0 16px",
        padding: "12px 16px",
        borderLeft: `4px solid ${BLUE}`,
        backgroundColor: BLUE_TINT,
        borderRadius: "8px",
      }}
    >
      <Text style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 600, color: INK }}>
        {label}
      </Text>
      <Text style={{ margin: 0, fontSize: "15px", lineHeight: "1.6", color: INK }}>
        {lines.map((line, index) => (
          <Fragment key={index}>
            {index > 0 ? <br /> : null}
            {line}
          </Fragment>
        ))}
      </Text>
    </Section>
  );
}
