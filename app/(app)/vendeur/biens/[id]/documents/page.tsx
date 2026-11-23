import type { Metadata } from "next";
import { FilterPills } from "@/components/shared/filter-pills";
import { FinancingBadge, FinancingMention } from "@/components/shared/financing-badge";
import { InfoNote } from "@/components/shared/info-note";
import { InlineAlert } from "@/components/shared/inline-alert";
import { ProgressBar } from "@/components/shared/progress-bar";
import { pillClassName } from "@/components/shared/status-badge";
import { TaskList, type TaskItem } from "@/components/shared/task-list";
import { propertyForSheet } from "@/leenkey/properties/load";
import { AnalysisRefresher } from "@/leenkey/sale-file/components/analysis-controls";
import { DdtCoverageEditor, DdtUploadForm } from "@/leenkey/sale-file/components/ddt-controls";
import { SellerDocumentAnalysis } from "@/leenkey/sale-file/components/document-analysis";
import {
  ExemptionButton,
  RemoveDocumentButton,
  RequestButtons,
  ShareButtons,
} from "@/leenkey/sale-file/components/seller-controls";
import { UploadForm } from "@/leenkey/sale-file/components/upload-form";
import {
  checklistProgress,
  checklistProperty,
  ddtInitialCoverage,
  type ChecklistLine,
} from "@/leenkey/sale-file/checklist";
import { sellerSaleFile } from "@/leenkey/sale-file/queries";
import {
  DDT_TYPE,
  ddtDiagnostics,
  DIAGNOSTIC_TYPES,
  DOCUMENT_ORDER,
  NOTARY_FILE_STAGES,
  OPTIONAL_DOCUMENTS,
  requiredDocuments,
  type DocumentStage,
  type DocumentType,
} from "@/lib/config/documents";
import { formatDateShort, formatDay } from "@/lib/format";
import { frSaleFile } from "@/lib/i18n/sections/saleFile";
import { cn } from "@/lib/utils";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { saleFile: frSaleFile } as const;

const t = fr.saleFile.seller;

export const metadata: Metadata = { title: t.metaTitle };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ etape?: string | string[] }>;
};

// The stage in the address (« ?etape=compromis »): the filter of the list.
const STAGE_PARAM: Record<DocumentStage, string> = {
  listing: "mise-en-vente",
  agreement: "compromis",
  deed: "signature",
};
const stageOfParam = (value: string | string[] | undefined): DocumentStage | null =>
  (Object.keys(STAGE_PARAM) as DocumentStage[]).find((stage) => STAGE_PARAM[stage] === value) ??
  null;

const card = "rounded-lk-xl border border-lk-line bg-lk-surface p-4";
const sectionTitle = "text-lk-body font-semibold text-lk-ink";
const stateTone = {
  filed: "bg-lk-success-bg text-lk-success-fg",
  exempt: "bg-lk-stone-2 text-lk-ink-2",
  missing: "bg-lk-warning-bg text-lk-warning-fg",
  optional: "bg-lk-stone-2 text-lk-ink-2",
} as const;

/** « Facultatif »: offered, not asked for, and nothing filed. */
const lineState = (line: ChecklistLine) =>
  !line.required && line.state === "missing" ? "optional" : line.state;
// The word of help of a line, when it has one.
const lineHelps: Partial<Record<DocumentType, string>> = t.lineHelp;
const lineHelp = (type: DocumentType): string | null => lineHelps[type] ?? null;

// L3-04: the tab « Documents » of a property (SPEC-V2 15): « Dossier
// notaire : 12 / 18 pièces », the access requests of buyers (first), the
// three stages of the file with what is to file now (DECISIONS.md
// 2026-11-23: « Dès la mise en vente », « Avant le compromis », « Avant la
// signature »), the deposit, the checklist in three categories (« Documents
// du bien », « Documents de copropriété », « Documents pour le notaire »),
// each line with its stage, the list filtered by stage from the address, and
// what is shared with each buyer in relation with the property. Open to the
// three plans. L3-05: under each document, its reading aid by the assistant
// (being written, written, or why there is none), the facts the seller may
// show on the listing, and « À actualiser » on a line whose document is old
// for its type. The diagnostics are one group of « Documents du bien »
// (DECISIONS.md 2026-11-23, level A): first « Déposer mon DDT (un seul
// fichier) », the one file of the diagnostician with the diagnostics it
// holds, then the diagnostic lines, each still filed alone if need be; a
// line the DDT covers reads « Fourni dans votre DDT ».
export default async function PropertyDocumentsPage({ params, searchParams }: Props) {
  const [{ id }, { etape }] = await Promise.all([params, searchParams]);
  const property = await propertyForSheet(id);
  if (!property) return null;
  const checked = checklistProperty(property.characteristics);
  const result = await sellerSaleFile(
    property.id,
    checked,
    property.characteristics.dpeExempt ? (property.characteristics.dpeExemptionReason ?? "") : null,
  );
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
  const required = requiredDocuments(checked.type, checked.coOwnership);
  const types: DocumentType[] = [
    ...required,
    ...DOCUMENT_ORDER.filter((type) => !required.includes(type)),
  ];
  const analysisOf = new Map(documents.map((document) => [document.id, document]));
  const allIds = documents.map((document) => document.id);
  // « Partager les diagnostics »: each diagnostic, and the DDT.
  const diagnosticIds = documents
    .filter((document) => DIAGNOSTIC_TYPES.includes(document.type) || document.type === DDT_TYPE)
    .map((document) => document.id);
  // What a DDT may cover here: the diagnostic lines of this property. One
  // file for one line makes no group, unless a DDT is already there.
  const diagnostics = ddtDiagnostics(checked.type, checked.coOwnership);
  const ddtGroup = diagnostics.length > 1 || checklist.ddt.length > 0;

  // The stage chosen in the address, among those that have a line.
  const tab = `/vendeur/biens/${property.id}/documents`;
  const stageHref = (stage: DocumentStage | null) =>
    `${tab}${stage ? `?etape=${STAGE_PARAM[stage]}` : ""}#pieces`;
  const lines = checklist.groups.flatMap((group) => group.lines);
  const stagesWithLines = checklist.stages.filter((item) =>
    lines.some((line) => line.stage === item.stage),
  );
  const chosen = stageOfParam(etape);
  const stage = stagesWithLines.some((item) => item.stage === chosen) ? chosen : null;
  const groups = checklist.groups
    .map((group) => {
      const shown = stage ? group.lines.filter((line) => line.stage === stage) : group.lines;
      return { ...group, lines: shown, ...checklistProgress(shown) };
    })
    .filter((group) => group.lines.length > 0);
  // The stages something is asked for: done, the one to work on now, later.
  const stageItems: TaskItem[] = checklist.stages
    .filter((item) => item.total > 0)
    .map((item) => {
      const progress = t.stageProgress(item.done, item.total);
      const current = item.stage === checklist.currentStage;
      return {
        id: item.stage,
        title: fr.saleFile.stages[item.stage],
        // « maintenant » for what the notary file counts; the « état daté » comes later.
        detail: current
          ? t.stageMissing(
              progress,
              t.missingNames(item.missing.map((type) => fr.saleFile.types[type])),
              NOTARY_FILE_STAGES.includes(item.stage),
            )
          : progress,
        state: item.done === item.total ? "done" : current ? "current" : "todo",
        href: stageHref(item.stage),
      };
    });

  // An analysis is being written: the tab reads itself again, once for all of them.
  const analysing = documents.some(
    (document) => document.analysis?.status === "pending" && !document.analysis.delayed,
  );

  const renderLine = (line: ChecklistLine) => (
    <li key={line.type} className="flex flex-col gap-2 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-lk-secondary font-medium text-lk-ink">
            {fr.saleFile.types[line.type]}
          </p>
          <p className="text-lk-caption text-pretty text-lk-ink-3">
            {[
              fr.saleFile.stages[line.stage],
              line.required || OPTIONAL_DOCUMENTS.includes(line.type) ? null : t.optional,
              lineHelp(line.type),
            ]
              .filter((part) => part !== null)
              .join(" · ")}
          </p>
        </div>
        <span className="flex max-w-[55%] shrink-0 flex-wrap justify-end gap-1.5">
          {line.toRefresh ? (
            <span
              className={cn(
                pillClassName,
                "px-2.5 py-1.25 text-lk-micro font-semibold",
                stateTone.missing,
              )}
            >
              {fr.saleFile.analysis.refresh.state}
            </span>
          ) : null}
          <span
            className={cn(
              pillClassName,
              "px-2.5 py-1.25 text-lk-micro font-semibold",
              stateTone[lineState(line)],
            )}
          >
            {t.states[lineState(line)]}
          </span>
        </span>
      </div>
      {line.toRefresh ? (
        <p className="text-lk-caption text-pretty text-lk-ink-2">
          {fr.saleFile.analysis.refresh.text(
            formatDay(line.toRefresh.date),
            fr.saleFile.analysis.refresh.age(line.toRefresh.months),
            DIAGNOSTIC_TYPES.includes(line.type)
              ? "diagnostiqueur"
              : line.type === "pre_etat_date" || line.type === "etat_date"
                ? "syndic"
                : "notaire",
          )}
        </p>
      ) : null}
      {line.documents.map((document) => (
        <div key={document.id} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="flex min-w-0 flex-col">
              <a
                href={`/documents/vente/${document.id}`}
                target="_blank"
                rel="noopener noreferrer"
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
          <SellerDocumentAnalysis
            propertyId={property.id}
            document={analysisOf.get(document.id) ?? { ...document, analysis: null }}
          />
        </div>
      ))}
      {line.coveredBy.map((document) => (
        <a
          key={document.id}
          href={`/documents/vente/${document.id}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t.ddt.openAbout(fr.saleFile.types[line.type])}
          className="inline-flex min-h-11 items-center self-start text-lk-secondary font-semibold text-lk-blue underline underline-offset-2 hover:no-underline"
        >
          {t.ddt.provided}
        </a>
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
  );
  const list = "flex flex-col divide-y divide-lk-line py-1";
  // The diagnostics follow one another in the order of the lines.
  const diagnosticPlaces = DIAGNOSTIC_TYPES.map((type) => DOCUMENT_ORDER.indexOf(type));
  const firstDiagnostic = Math.min(...diagnosticPlaces);
  const lastDiagnostic = Math.max(...diagnosticPlaces);

  return (
    <div className="flex flex-col gap-8">
      {analysing ? <AnalysisRefresher /> : null}
      <div className="flex flex-col gap-3">
        <h2 className="text-lk-h3 font-bold text-wide text-lk-ink">{t.title}</h2>
        <p className="text-lk-secondary text-pretty text-lk-ink-2">{t.intro}</p>
        <div className={card}>
          <ProgressBar
            label={checklist.complete ? t.complete : t.progress(checklist.done, checklist.total)}
            value={checklist.total === 0 ? 0 : (checklist.done / checklist.total) * 100}
          />
        </div>
        {checklist.stages.some((item) => item.stage === "deed" && item.total > 0) ? (
          <p className="text-lk-caption text-pretty text-lk-ink-3">{t.notaryScope}</p>
        ) : null}
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

      {stageItems.length > 0 ? (
        <section aria-labelledby="file-stages" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h3 id="file-stages" className={sectionTitle}>
              {t.stagesTitle}
            </h3>
            <p className="text-lk-caption text-pretty text-lk-ink-3">{t.stagesIntro}</p>
          </div>
          <TaskList items={stageItems} stateLabels={t.stageStates} />
        </section>
      ) : null}

      <div className={cn(card, "flex flex-col gap-3")}>
        <UploadForm propertyId={property.id} types={types} />
        <p className="text-lk-caption text-pretty text-lk-ink-3">{fr.saleFile.analysis.notice}</p>
      </div>

      {/* The list, by category; the stage of the address filters it. */}
      <div id="pieces" className="flex scroll-mt-24 flex-col gap-8">
        <FilterPills
          label={t.filter.label}
          items={[
            { href: stageHref(null), label: t.filter.all, active: stage === null },
            ...stagesWithLines.map((item) => ({
              href: stageHref(item.stage),
              label: fr.saleFile.stages[item.stage],
              active: stage === item.stage,
            })),
          ]}
        />
        {groups.map((group) => (
          <section
            key={group.category}
            aria-labelledby={`file-${group.category}`}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <h3 id={`file-${group.category}`} className={sectionTitle}>
                  {fr.saleFile.categories[group.category]}
                </h3>
                {group.total > 0 ? (
                  <p className="shrink-0 text-lk-secondary font-medium text-lk-ink-2 tabular">
                    {t.categoryProgress(group.done, group.total)}
                  </p>
                ) : null}
              </div>
              {group.category === "coownership" ? (
                <p className="text-lk-caption text-pretty text-lk-ink-3">
                  {t.categoryHelp.coownership}
                </p>
              ) : null}
            </div>
            {group.category === "property" &&
            ddtGroup &&
            group.lines.some((line) => DIAGNOSTIC_TYPES.includes(line.type)) ? (
              // The diagnostics as one group, between the lines before and after them.
              <>
                {group.lines.some((line) => DOCUMENT_ORDER.indexOf(line.type) < firstDiagnostic) ? (
                  <ul className={cn(card, list)}>
                    {group.lines
                      .filter((line) => DOCUMENT_ORDER.indexOf(line.type) < firstDiagnostic)
                      .map(renderLine)}
                  </ul>
                ) : null}
                <div className={cn(card, "flex flex-col gap-3")}>
                  <div className="flex flex-col gap-1">
                    <h4
                      id="file-diagnostics"
                      className="text-lk-secondary font-semibold text-lk-ink"
                    >
                      {t.ddt.title}
                    </h4>
                    <p className="text-lk-caption text-pretty text-lk-ink-3">{t.ddt.intro}</p>
                  </div>
                  {checklist.ddt.length === 0 ? (
                    <DdtUploadForm
                      propertyId={property.id}
                      diagnostics={diagnostics}
                      ticked={ddtInitialCoverage(checklist, diagnostics)}
                    />
                  ) : (
                    checklist.ddt.map((document) => (
                      <div
                        key={document.id}
                        className="flex flex-col gap-2 rounded-lk-md bg-lk-stone-2 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <div className="flex min-w-0 flex-col">
                            <a
                              href={`/documents/vente/${document.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
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
                            description={t.ddt.removeDescription}
                          />
                        </div>
                        <p className="text-lk-caption text-pretty text-lk-ink-2">
                          {t.ddt.filedCovers(
                            (document.covers ?? []).map((type) => fr.saleFile.types[type]),
                          )}
                        </p>
                        <div className="-ml-3">
                          <DdtCoverageEditor
                            propertyId={property.id}
                            documentId={document.id}
                            diagnostics={diagnostics}
                            covers={document.covers ?? []}
                          />
                        </div>
                        <SellerDocumentAnalysis
                          propertyId={property.id}
                          document={analysisOf.get(document.id) ?? { ...document, analysis: null }}
                        />
                      </div>
                    ))
                  )}
                  <p className="text-lk-caption text-pretty text-lk-ink-3">{t.ddt.alone}</p>
                  <ul
                    aria-labelledby="file-diagnostics"
                    className={cn(list, "border-t border-lk-line py-0")}
                  >
                    {group.lines
                      .filter((line) => DIAGNOSTIC_TYPES.includes(line.type))
                      .map(renderLine)}
                  </ul>
                </div>
                {group.lines.some((line) => DOCUMENT_ORDER.indexOf(line.type) > lastDiagnostic) ? (
                  <ul className={cn(card, list)}>
                    {group.lines
                      .filter((line) => DOCUMENT_ORDER.indexOf(line.type) > lastDiagnostic)
                      .map(renderLine)}
                  </ul>
                ) : null}
              </>
            ) : (
              <ul className={cn(card, list)}>{group.lines.map(renderLine)}</ul>
            )}
            {group.category === "notary" && (stage === null || stage === "deed") ? (
              <InfoNote title={t.identity.title}>
                <p>{t.identity.text}</p>
              </InfoNote>
            ) : null}
          </section>
        ))}
      </div>

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
