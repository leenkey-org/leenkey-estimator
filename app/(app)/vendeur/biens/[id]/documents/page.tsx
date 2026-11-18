import type { Metadata } from "next";
import { FinancingBadge, FinancingMention } from "@/components/shared/financing-badge";
import { InlineAlert } from "@/components/shared/inline-alert";
import { ProgressBar } from "@/components/shared/progress-bar";
import { pillClassName } from "@/components/shared/status-badge";
import { propertyForSheet } from "@/leenkey/properties/load";
import {
  ExemptionButton,
  RemoveDocumentButton,
  RequestButtons,
  ShareButtons,
} from "@/leenkey/sale-file/components/seller-controls";
import { UploadForm } from "@/leenkey/sale-file/components/upload-form";
import { sellerSaleFile } from "@/leenkey/sale-file/queries";
import { DOCUMENT_CATEGORY, REQUIRED_DOCUMENTS, type DocumentType } from "@/lib/config/documents";
import { formatDateShort } from "@/lib/format";
import { frSaleFile } from "@/lib/i18n/sections/saleFile";
import { cn } from "@/lib/utils";
import { Constants } from "@/types/database";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { saleFile: frSaleFile } as const;

const t = fr.saleFile.seller;

export const metadata: Metadata = { title: t.metaTitle };

type Props = { params: Promise<{ id: string }> };

const card = "rounded-lk-xl border border-lk-line bg-lk-surface p-4";
const sectionTitle = "text-lk-body font-semibold text-lk-ink";
const stateTone = {
  filed: "bg-lk-success-bg text-lk-success-fg",
  exempt: "bg-lk-stone-2 text-lk-ink-2",
  missing: "bg-lk-warning-bg text-lk-warning-fg",
} as const;

// L3-04: the tab « Documents » of a property (SPEC-V2 15): the checklist of
// the sale file by category, the deposit, « Dossier notaire : 12 / 15
// pièces », the access requests of buyers (first), and what is shared with
// each buyer in relation with the property. Open to the three plans.
export default async function PropertyDocumentsPage({ params }: Props) {
  const { id } = await params;
  const property = await propertyForSheet(id);
  if (!property) return null;
  const propertyType = property.characteristics.type;
  const result = await sellerSaleFile(property.id, propertyType);
  if (!result.ok) {
    return (
      <InlineAlert tone="danger" live={false}>
        {t.loadError}
      </InlineAlert>
    );
  }
  const { checklist, documents, contacts, requests } = result.data;
  const now = new Date();
  // The types of the checklist first, then every other one.
  const required = REQUIRED_DOCUMENTS[propertyType ?? "autre"];
  const types: DocumentType[] = [
    ...required,
    ...Constants.public.Enums.document_type.filter((type) => !required.includes(type)),
  ];
  const allIds = documents.map((document) => document.id);
  const diagnosticIds = documents
    .filter((document) => DOCUMENT_CATEGORY[document.type] === "diagnostics")
    .map((document) => document.id);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-lk-h3 font-bold text-wide text-lk-ink">{t.title}</h2>
        <p className="text-lk-secondary text-pretty text-lk-ink-2">{t.intro}</p>
        <div className={card}>
          <ProgressBar
            label={checklist.complete ? t.complete : t.progress(checklist.done, checklist.total)}
            value={checklist.total === 0 ? 0 : (checklist.done / checklist.total) * 100}
          />
        </div>
        <p className="text-lk-caption text-pretty text-lk-ink-3">{t.disclaimer}</p>
      </div>

      {requests.length > 0 ? (
        <section aria-labelledby="file-requests" className="flex flex-col gap-3">
          <h3 id="file-requests" className={sectionTitle}>
            {t.requests.title}
          </h3>
          <ul className="flex flex-col gap-3">
            {requests.map((request) => (
              <li key={request.id} className={cn(card, "flex flex-col gap-3")}>
                <div className="flex flex-col gap-1">
                  <p className="text-lk-body font-semibold text-lk-ink">
                    {t.requests.asks(request.firstName)}
                  </p>
                  <FinancingBadge status={request.financingStatus} className="self-start" />
                  <p className="text-lk-caption text-lk-ink-3">{t.requests.grantHelp}</p>
                </div>
                <RequestButtons
                  propertyId={property.id}
                  requestId={request.id}
                  name={request.firstName ?? t.share.someone}
                />
              </li>
            ))}
          </ul>
          <FinancingMention />
        </section>
      ) : null}

      <div className={card}>
        <UploadForm propertyId={property.id} types={types} />
      </div>

      {checklist.groups.map((group) => (
        <section
          key={group.category}
          aria-labelledby={`file-${group.category}`}
          className="flex flex-col gap-3"
        >
          <h3 id={`file-${group.category}`} className={sectionTitle}>
            {fr.saleFile.categories[group.category]}
          </h3>
          <ul className={cn(card, "flex flex-col divide-y divide-lk-line py-1")}>
            {group.lines.map((line) => (
              <li key={line.type} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                  <p className="min-w-0 text-lk-secondary font-medium text-lk-ink">
                    {fr.saleFile.types[line.type]}
                  </p>
                  <span
                    className={cn(
                      pillClassName,
                      "px-2.5 py-1.25 text-lk-micro font-semibold",
                      stateTone[line.state],
                    )}
                  >
                    {t.states[line.state]}
                  </span>
                </div>
                {!line.required ? (
                  <p className="text-lk-caption text-lk-ink-3">{t.optional}</p>
                ) : null}
                {line.documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"
                  >
                    <div className="flex min-w-0 flex-col">
                      <a
                        href={`/documents/vente/${document.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t.openAbout(document.title)}
                        className="truncate text-lk-secondary font-semibold text-lk-blue underline underline-offset-2 hover:no-underline"
                      >
                        {document.title}
                      </a>
                      <span className="text-lk-caption text-lk-ink-3">
                        {t.filedOn(formatDateShort(document.createdAt, now))}
                      </span>
                    </div>
                    <RemoveDocumentButton
                      propertyId={property.id}
                      documentId={document.id}
                      title={document.title}
                    />
                  </div>
                ))}
                {line.state === "exempt" && line.reason ? (
                  <p className="text-lk-caption text-lk-ink-2">{t.reason(line.reason)}</p>
                ) : null}
                {line.exemptible && line.state !== "filed" ? (
                  <div className="-ml-3">
                    <ExemptionButton
                      propertyId={property.id}
                      type={line.type}
                      exempt={line.state === "exempt"}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section aria-labelledby="file-share" className="flex flex-col gap-3">
        <h3 id="file-share" className={sectionTitle}>
          {t.share.title}
        </h3>
        {contacts.length === 0 ? (
          <p className={cn(card, "text-lk-secondary text-lk-ink-2")}>{t.share.empty}</p>
        ) : (
          <>
            {documents.length === 0 ? (
              <InlineAlert tone="info">{t.share.noDocument}</InlineAlert>
            ) : null}
            <ul className="flex flex-col gap-3">
              {contacts.map((contact) => {
                const name = contact.firstName ?? t.share.someone;
                return (
                  <li key={contact.buyerId} className={cn(card, "flex flex-col gap-3")}>
                    <div className="flex flex-col gap-1">
                      <p className="text-lk-body font-semibold text-lk-ink">{name}</p>
                      <FinancingBadge status={contact.financingStatus} className="self-start" />
                      <p className="text-lk-caption text-lk-ink-3 tabular">
                        {t.share.shared(contact.shared, documents.length)}
                      </p>
                    </div>
                    {documents.length > 0 ? (
                      <ShareButtons
                        propertyId={property.id}
                        buyerId={contact.buyerId}
                        name={name}
                        allIds={allIds}
                        diagnosticIds={diagnosticIds}
                        shared={contact.shared}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <FinancingMention />
          </>
        )}
      </section>
    </div>
  );
}
