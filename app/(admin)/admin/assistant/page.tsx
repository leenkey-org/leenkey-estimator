import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import {
  DataTable,
  DataTableCell,
  DataTableHeader,
  DataTableRow,
  DataTableRowHeader,
} from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterPills } from "@/components/shared/filter-pills";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { LinkTabs } from "@/components/shared/link-tabs";
import { SectionTitle } from "@/components/shared/section-title";
import { StatTile } from "@/components/shared/stat-tile";
import { requireAdmin } from "@/core/auth/session";
import {
  EmbedButton,
  KnowledgeImport,
} from "@/leenkey/admin/assistant/components/knowledge-import";
import { KnowledgeSearch } from "@/leenkey/admin/assistant/components/knowledge-search";
import {
  AI_LOG_LIMIT,
  AI_USAGE_DAYS,
  adminAiConversations,
  adminAiUsage,
  adminKnowledge,
  type KnowledgeRow,
} from "@/leenkey/admin/assistant/queries";
import { usageSummary } from "@/leenkey/admin/assistant/usage";
import { adminMetadata } from "@/leenkey/admin/metadata";
import { formatDateShort, formatDateTime, formatInteger } from "@/lib/format";
import { frAdminAssistant } from "@/lib/i18n/sections/adminAssistant";
import {
  AI_LOG_CONTEXT_PARAMS,
  AI_LOG_CONTEXTS,
  assistantHref,
  parseAssistantQuery,
  type AssistantQuery,
} from "@/lib/validations/admin-assistant";
import { AdminPage } from "../_components/admin-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminAssistant: frAdminAssistant } as const;

const t = fr.adminAssistant;

export const generateMetadata = adminMetadata({ title: t.metaTitle });

// The import and the embeddings of the FAQ (40 s or so when the function of
// the embeddings is cold).
export const maxDuration = 60;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const box = "rounded-lk-md border border-lk-line bg-lk-surface p-5";

function retry(href: string) {
  return (
    <Link href={href} className="font-semibold underline underline-offset-2 hover:no-underline">
      {t.retry}
    </Link>
  );
}

async function FaqTab() {
  const knowledge = await adminKnowledge();
  if (!knowledge.ok) {
    return (
      <InlineAlert tone="danger" action={retry(assistantHref({ tab: "faq" }))}>
        {t.faq.error}
      </InlineAlert>
    );
  }
  const cards = knowledge.data;
  const missing = cards.filter((card) => !card.embedded).length;
  const byCategory = new Map<string, KnowledgeRow[]>();
  for (const card of cards) {
    byCategory.set(card.category, [...(byCategory.get(card.category) ?? []), card]);
  }
  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-lk-secondary text-lk-ink-2">{t.faq.summary(cards.length, missing)}</p>
        <EmbedButton missing={missing} />
      </div>
      <section aria-labelledby="recherche-test" className={`flex flex-col gap-3 ${box}`}>
        <SectionTitle id="recherche-test">{t.faq.search.title}</SectionTitle>
        <p className="text-lk-secondary text-lk-ink-3">{t.faq.search.text}</p>
        <KnowledgeSearch />
      </section>
      <section aria-labelledby="import" className={`flex flex-col gap-3 ${box}`}>
        <SectionTitle id="import">{t.faq.import.title}</SectionTitle>
        <p className="text-lk-secondary text-lk-ink-3">{t.faq.import.text}</p>
        <KnowledgeImport />
      </section>
      {cards.length === 0 ? (
        <EmptyState className="py-10" title={t.faq.empty} />
      ) : (
        <section aria-label={t.faq.list} className="flex flex-col gap-4">
          {[...byCategory.entries()].map(([category, rows]) => (
            <div key={category} className="flex flex-col gap-2">
              <h2 className="text-lk-label font-semibold text-lk-ink">
                {category} · {rows.length}
              </h2>
              <ul className="flex flex-col divide-y divide-lk-line rounded-lk-md border border-lk-line bg-lk-surface">
                {rows.map((card) => (
                  <li key={card.id} className="flex flex-col gap-0.5 px-4 py-3">
                    <p className="text-lk-secondary font-semibold text-lk-ink">{card.question}</p>
                    <p className="text-lk-caption text-lk-ink-3">
                      {[
                        t.faq.audience[card.audience],
                        card.stepCode ? t.faq.step(card.stepCode) : null,
                        card.sourceFile,
                        card.embedded ? null : t.faq.toEmbed,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

async function JournalTab({ query }: { query: AssistantQuery }) {
  const list = await adminAiConversations({ context: query.context, query: query.query });
  const pills = [
    {
      href: assistantHref({ tab: "journal", query: query.query }),
      label: t.journal.all,
      active: query.context === undefined,
    },
    ...AI_LOG_CONTEXTS.map((context) => ({
      href: assistantHref({ tab: "journal", context, query: query.query }),
      label: t.journal.contexts[context],
      active: query.context === context,
    })),
  ];
  const now = new Date();
  let content: ReactNode;
  if (!list.ok) {
    content = (
      <InlineAlert tone="danger" action={retry(assistantHref(query))}>
        {t.journal.error}
      </InlineAlert>
    );
  } else if (list.data.rows.length === 0) {
    content = <EmptyState className="py-10" title={t.journal.empty} />;
  } else {
    content = (
      <>
        {list.data.limited ? (
          <InlineAlert tone="info">{t.journal.limited(AI_LOG_LIMIT)}</InlineAlert>
        ) : null}
        <ul
          aria-label={t.journal.list}
          className="flex flex-col divide-y divide-lk-line rounded-lk-md border border-lk-line bg-lk-surface"
        >
          {list.data.rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/admin/assistant/${row.id}`}
                className="flex min-h-14 flex-col gap-0.5 px-4 py-3 transition-colors duration-140 ease-out-lk hover:bg-lk-stone-2 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-lk-brand-blue focus-visible:outline-solid"
              >
                <span className="text-lk-caption font-semibold text-lk-ink-2">
                  {[
                    t.journal.context[row.context],
                    t.journal.kinds[row.kind] ?? row.kind,
                    row.context === "visitor" ? t.journal.visitor : (row.name ?? t.journal.noName),
                    row.reference,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span className="line-clamp-2 text-lk-secondary text-lk-ink">
                  {row.firstQuestion ?? t.journal.noQuestion}
                </span>
                <span className="text-lk-caption text-lk-ink-3">
                  {[
                    formatDateTime(row.lastAt, now),
                    t.journal.messages(row.messages),
                    t.journal.tokens(
                      formatInteger(row.inputTokens),
                      formatInteger(row.outputTokens),
                    ),
                  ].join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </>
    );
  }
  return (
    <>
      <div className="flex flex-col gap-3">
        <form
          key={assistantHref(query)}
          role="search"
          action="/admin/assistant"
          className="flex items-end gap-2 md:max-w-md"
        >
          <input type="hidden" name="onglet" value="journal" />
          {query.context ? (
            <input type="hidden" name="contexte" value={AI_LOG_CONTEXT_PARAMS[query.context]} />
          ) : null}
          <Input
            type="search"
            name="q"
            label={t.journal.search.label}
            hideLabel
            placeholder={t.journal.search.placeholder}
            defaultValue={query.query}
            maxLength={100}
            compact
            containerClassName="flex-1"
          />
          <Button type="submit" variant="secondary" className="h-11">
            {t.journal.search.submit}
          </Button>
        </form>
        <FilterPills label={t.journal.filters} items={pills} />
      </div>
      {content}
    </>
  );
}

async function UsageTab() {
  const usage = await adminAiUsage();
  if (!usage.ok) {
    return (
      <InlineAlert tone="danger" action={retry(assistantHref({ tab: "consommation" }))}>
        {t.usage.error}
      </InlineAlert>
    );
  }
  const summary = usageSummary(usage.data);
  const cost = (value: number | null) =>
    value === null ? t.usage.costUnknown : t.usage.costValue(value);
  const environment = t.environment[process.env.NEXT_PUBLIC_ENV ?? "local"] ?? t.environment.local;
  const now = new Date();
  return (
    <>
      <p className="text-lk-secondary text-lk-ink-2">
        {environment} · {t.usage.days(AI_USAGE_DAYS)}
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile value={formatInteger(summary.total.answers)} label={t.usage.answers} />
        <StatTile value={formatInteger(summary.total.inputTokens)} label={t.usage.input} />
        <StatTile value={formatInteger(summary.total.outputTokens)} label={t.usage.output} />
        <StatTile value={cost(summary.total.cost)} label={t.usage.cost} />
      </div>
      <p className="text-lk-caption text-lk-ink-3">{t.usage.note}</p>
      {summary.days.length === 0 ? (
        <EmptyState className="py-10" title={t.usage.empty} />
      ) : (
        <>
          <section aria-labelledby="par-contexte" className="flex flex-col gap-3">
            <SectionTitle id="par-contexte">{t.usage.byContext}</SectionTitle>
            <DataTable label={t.usage.contextTable}>
              <DataTableHeader
                columns={[
                  t.usage.context,
                  t.usage.answers,
                  t.usage.input,
                  t.usage.output,
                  t.usage.cost,
                ]}
              />
              <tbody>
                {summary.contexts.map((row) => (
                  <DataTableRow key={row.context}>
                    <DataTableRowHeader>
                      {t.journal.contexts[row.context] ?? row.context}
                    </DataTableRowHeader>
                    <DataTableCell className="tabular">{formatInteger(row.answers)}</DataTableCell>
                    <DataTableCell className="tabular">
                      {formatInteger(row.inputTokens)}
                    </DataTableCell>
                    <DataTableCell className="tabular">
                      {formatInteger(row.outputTokens)}
                    </DataTableCell>
                    <DataTableCell className="tabular">{cost(row.cost)}</DataTableCell>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </section>
          <section aria-labelledby="par-jour" className="flex flex-col gap-3">
            <SectionTitle id="par-jour">{t.usage.byDay}</SectionTitle>
            <DataTable label={t.usage.table}>
              <DataTableHeader
                columns={[
                  t.usage.day,
                  t.usage.answers,
                  t.usage.input,
                  t.usage.output,
                  t.usage.cost,
                ]}
              />
              <tbody>
                {summary.days.map((row) => (
                  <DataTableRow key={row.day}>
                    <DataTableRowHeader>
                      {formatDateShort(`${row.day}T12:00:00Z`, now)}
                    </DataTableRowHeader>
                    <DataTableCell className="tabular">{formatInteger(row.answers)}</DataTableCell>
                    <DataTableCell className="tabular">
                      {formatInteger(row.inputTokens)}
                    </DataTableCell>
                    <DataTableCell className="tabular">
                      {formatInteger(row.outputTokens)}
                    </DataTableCell>
                    <DataTableCell className="tabular">{cost(row.cost)}</DataTableCell>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </section>
        </>
      )}
    </>
  );
}

// L1-30d: the assistant as the team follows it (SPEC-V2 17): the FAQ it
// answers from (cards, test search, import of a file), the log of its
// conversations (filtered by context, searched) and what the model costs
// (tokens by day and by context, in this environment). Tabs in the address.
// The page checks the admin role itself, not only the layout.
export default async function AdminAssistantPage({ searchParams }: Props) {
  await requireAdmin();
  const query = parseAssistantQuery(await searchParams);
  const tabs = [
    { href: assistantHref({ tab: "faq" }), label: t.tabs.faq },
    { href: assistantHref({ tab: "journal" }), label: t.tabs.journal },
    { href: assistantHref({ tab: "consommation" }), label: t.tabs.usage },
  ];
  return (
    <AdminPage title={t.title}>
      <LinkTabs label={t.tabs.label} tabs={tabs} current={assistantHref({ tab: query.tab })} />
      {query.tab === "journal" ? (
        <JournalTab query={query} />
      ) : query.tab === "consommation" ? (
        <UsageTab />
      ) : (
        <FaqTab />
      )}
    </AdminPage>
  );
}
