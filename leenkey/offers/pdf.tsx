import "server-only";
import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { frOffer } from "@/lib/i18n/sections/offer";
import type { DocumentBlock, OfferDocument } from "./document";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { offer: frOffer } as const;

// The PDF of an offer (SPEC-V2 13, docs/DESIGN.md 14): A4, margins of 20 mm,
// the title « OFFRE D'ACHAT LEENKEY », the seven sections and the notice of
// the document (leenkey/offers/document.ts), a blue rule under the header,
// reference, version and page at the foot. Drawn from the frozen offer each
// time it is asked for (DECISIONS.md 2026-11-13, L2-03): no file a client
// could replace. Sora embedded (leenkey/offers/fonts, OFL).

const FONTS = path.join(process.cwd(), "leenkey/offers/fonts");
Font.register({
  family: "Sora",
  fonts: [
    { src: path.join(FONTS, "Sora-400.ttf"), fontWeight: 400 },
    { src: path.join(FONTS, "Sora-600.ttf"), fontWeight: 600 },
    { src: path.join(FONTS, "Sora-700.ttf"), fontWeight: 700 },
  ],
});
// A word is never cut: an amount, a name, a reference stay whole.
Font.registerHyphenationCallback((word) => [word]);

// The blue of the PDF until Cédric confirms the charte for it (CLAUDE.md 16, Q65).
const BLUE = "#1156FC";
const INK = "#0F1E35";
const INK_2 = "#5B6474";
const TINT = "#EEF3FF";
const MARGIN = 56.7; // 20 mm

const styles = StyleSheet.create({
  page: {
    paddingTop: MARGIN,
    paddingHorizontal: MARGIN,
    paddingBottom: MARGIN + 18,
    fontFamily: "Sora",
    fontSize: 10,
    lineHeight: 1.5,
    color: INK,
  },
  title: { fontSize: 18, fontWeight: 700, lineHeight: 1.25 },
  meta: { fontSize: 9, color: INK_2 },
  rule: { marginTop: 10, marginBottom: 6, height: 2, backgroundColor: BLUE },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 5 },
  subtitle: { fontWeight: 600, marginTop: 6, marginBottom: 2 },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: "38%", color: INK_2, paddingRight: 8 },
  value: { width: "62%", fontWeight: 600 },
  text: { marginBottom: 3 },
  strong: { fontSize: 16, fontWeight: 700, marginVertical: 3 },
  check: { flexDirection: "row", marginBottom: 3 },
  box: {
    width: 8,
    height: 8,
    marginTop: 3.5,
    marginRight: 7,
    borderWidth: 1,
    borderColor: BLUE,
    backgroundColor: BLUE,
  },
  checkText: { flex: 1 },
  notice: {
    marginTop: 18,
    padding: 12,
    borderWidth: 1.5,
    borderColor: BLUE,
    backgroundColor: TINT,
    borderRadius: 4,
  },
  noticeTitle: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  footer: {
    position: "absolute",
    left: MARGIN,
    right: MARGIN,
    bottom: MARGIN - 18,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: INK_2,
  },
});

// Sora has no narrow no-break space (U+202F, lib/format.ts): a no-break space.
const clean = (text: string) => text.replace(/\u202F/g, "\u00A0");

function Block({ block }: { block: DocumentBlock }) {
  switch (block.kind) {
    case "rows":
      return (
        <View>
          {block.rows.map((row) => (
            <View key={row.label} style={styles.row} wrap={false}>
              <Text style={styles.label}>{clean(row.label)}</Text>
              <Text style={styles.value}>{clean(row.value)}</Text>
            </View>
          ))}
        </View>
      );
    case "subtitle":
      return (
        <Text style={styles.subtitle} minPresenceAhead={30}>
          {clean(block.text)}
        </Text>
      );
    case "strong":
      return <Text style={styles.strong}>{clean(block.text)}</Text>;
    case "checks":
      return (
        <View>
          {block.items.map((item) => (
            <View key={item} style={styles.check} wrap={false}>
              <View style={styles.box} />
              <Text style={styles.checkText}>{clean(item)}</Text>
            </View>
          ))}
        </View>
      );
    case "text":
      return <Text style={styles.text}>{clean(block.text)}</Text>;
  }
}

function OfferPdf({ document }: { document: OfferDocument }) {
  return (
    <Document title={`${document.title} ${document.footer}`} author="Leenkey" language="fr-FR">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{document.title}</Text>
        {document.meta.map((line) => (
          <Text key={line} style={styles.meta}>
            {clean(line)}
          </Text>
        ))}
        <View style={styles.rule} />
        {document.sections.map((section) => (
          <View key={section.number} style={styles.section}>
            <Text style={styles.sectionTitle} minPresenceAhead={40}>
              {section.number}. {clean(section.title)}
            </Text>
            {section.blocks.map((block, index) => (
              <Block key={index} block={block} />
            ))}
          </View>
        ))}
        <View style={styles.notice} wrap={false}>
          <Text style={styles.noticeTitle}>{clean(document.notice.title)}</Text>
          {document.notice.paragraphs.map((paragraph) => (
            <Text key={paragraph} style={styles.text}>
              {clean(paragraph)}
            </Text>
          ))}
        </View>
        <View style={styles.footer} fixed>
          <Text>{clean(document.footer)}</Text>
          <Text
            render={({ pageNumber, totalPages }) => fr.offer.document.page(pageNumber, totalPages)}
          />
        </View>
      </Page>
    </Document>
  );
}

/** The PDF of a document, as bytes. */
export function renderOfferPdf(document: OfferDocument): Promise<Buffer> {
  return renderToBuffer(<OfferPdf document={document} />);
}
