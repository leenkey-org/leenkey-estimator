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
import { fr } from "@/lib/i18n/fr";

// Common template of the emails (docs/DESIGN.md 14, SPEC-V2 section 18):
// stone background, white card of 560 px, 8 px blue band (a top border,
// which Outlook keeps, unlike an empty block), « Leenkey » in text, Archivo
// titles with an Arial fallback (mail clients ignore font-stretch), one blue
// button, footer with the notification settings and the legal identity.
// Inline styles only: mail clients drop style sheets. Colours of the palette
// (DESIGN.md 2.1).

const t = fr.emails;

const FONT = "Archivo, Arial, Helvetica, sans-serif";
const INK = "#0F1E35";
const MUTED = "#5B6474";
const BLUE = "#1156FC";
const BLUE_TINT = "#EEF4FF";
const LINE = "#D9DBD3";
const BACKGROUND = "#F4F4F1";

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

export type EmailLayoutProps = {
  /** Line shown by the inbox after the subject. */
  preview: string;
  title: string;
  /** Address of the site, for the links of the footer. */
  siteUrl: string;
  action?: { href: string; label: string };
  children: ReactNode;
};

export function EmailLayout({ preview, title, siteUrl, action, children }: EmailLayoutProps) {
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
            borderTop: `8px solid ${BLUE}`,
            borderRadius: "6px",
          }}
        >
          <Section style={{ padding: "28px 32px 32px" }}>
            <Text style={{ margin: "0 0 24px", fontSize: "20px", fontWeight: 700, color: INK }}>
              {t.brand}
            </Text>
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
                  padding: "14px 24px",
                  borderRadius: "4px",
                  backgroundColor: BLUE,
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
            {t.footer.why}{" "}
            <Link href={`${siteUrl}/compte`} style={{ color: MUTED, textDecoration: "underline" }}>
              {t.footer.preferences}
            </Link>
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
        borderRadius: "4px",
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
