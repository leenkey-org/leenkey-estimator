import { describe, expect, it } from "vitest";
import { stepAction } from "@/core/steps/next-action";
import { currentStep, stepCount, toProgress, type StepRow } from "@/core/steps/progress";
import type { Progress } from "@/core/steps/types";
import { getNextAction, type SaleSituation } from "@/leenkey/properties/next-action";
import type { SellerProperty } from "@/leenkey/properties/queries";

// L1-23: the steps of a sale read from their template and the tasks done,
// and the next action of the seller (SPEC-V2 8.7). The database ticks the
// tasks and sets the current step (supabase/tests/rls_sale_engine.sql).

const id = "623efc8b-97d4-4902-ac43-406417498893";
const NOW = new Date("2026-10-26T12:00:00Z");

// The Autonomie template of supabase/seed/02_sale_steps.sql.
const TEMPLATE: [string, string, [string, string | null, string][]][] = [
  [
    "prepare",
    "Déterminer la valeur du bien et préparer tout ce qui est nécessaire avant la commercialisation",
    [
      ["estimation_linked", "estimation.linked", "seller"],
      ["property_complete", "property.complete", "seller"],
      ["photos_min6", "photos.min6", "seller"],
      ["checklist_viewed", "documents.checklist_viewed", "seller"],
      ["diagnostics_listed", "documents.diagnostics_listed", "seller"],
    ],
  ],
  [
    "publish",
    "Créer une annonce attractive et mettre le bien en vente sur Leenkey",
    [
      ["listing_written", "listing.draft_complete", "seller"],
      ["listing_submitted", "listing.submitted", "seller"],
      ["listing_published", "listing.published", "seller"],
    ],
  ],
  [
    "contacts_visits",
    "Centraliser les acquéreurs intéressés et organiser les visites",
    [
      ["first_contact", "conversation.created", "seller"],
      ["visit_slots_opened", "visit_slot.created", "seller"],
      ["first_visit_done", "visit.done", "seller"],
    ],
  ],
  [
    "offers",
    "Recevoir des offres structurées et décider de façon éclairée",
    [
      ["offer_received", "offer.submitted", "seller"],
      ["offer_accepted", "offer.accepted", "seller"],
    ],
  ],
  [
    "notary",
    "Préparer un dossier complet pour que le notaire prenne le relais",
    [
      ["notary_chosen", null, "seller"],
      ["notary_file_complete", "documents.notary_ready", "seller"],
      ["notary_file_sent", null, "seller"],
      ["precontract_signed", null, "both"],
    ],
  ],
  [
    "closing",
    "Suivre la transaction jusqu'à la signature définitive",
    [
      ["conditions_lifted", null, "both"],
      ["deed_signed", "listing.sold", "both"],
    ],
  ],
];

// Given in disorder, as PostgREST may give them.
const rows: StepRow[] = TEMPLATE.map(([code, description, tasks], index) => ({
  code,
  position: index + 1,
  title: `Étape ${code}`,
  description,
  tasks: tasks
    .map(([task, trigger, owner], position) => ({
      id: `task-${task}`,
      code: task,
      title: `Tâche ${task}`,
      required: true,
      auto_trigger: trigger,
      owner,
      position: position + 1,
    }))
    .reverse(),
})).reverse();

function progress(current: string, done: string[]): Progress {
  return toProgress(
    { template: "autonomie", currentStepCode: current },
    rows,
    done.map((task) => ({ task_id: `task-${task}`, done_at: "2026-10-20T09:00:00Z" })),
  );
}

const characteristics: SellerProperty["characteristics"] = {
  type: "appartement",
  surfaceM2: 68,
  carrezM2: null,
  rooms: 3,
  bedrooms: 2,
  floor: 3,
  floorsTotal: 5,
  buildYear: 1975,
  isNewBuild: false,
  dpe: "C",
  ges: "D",
  heating: null,
  features: [],
  chargesMonthlyEuros: null,
  propertyTaxYearlyEuros: null,
  coproLots: null,
};

function listing(
  status: NonNullable<SellerProperty["listing"]>["status"],
): NonNullable<SellerProperty["listing"]> {
  return {
    id: "0b7d4c1e-5f3a-4b8e-9c2d-1a6e8f4b3c27",
    reference: "LK-0042",
    slug: "appartement-3-pieces-epinay-sur-orge-lk0042",
    title: "Appartement 3 pièces lumineux",
    description: "Au calme, proche de la gare.",
    priceCents: 23_900_000,
    status,
    rejectionReason: status === "rejected" ? "Photos trop sombres." : null,
    suspensionReason: null,
    publishedAt: null,
    soldAt: null,
    soldPriceCents: null,
  };
}

function situation(
  status: NonNullable<SellerProperty["listing"]>["status"] | null,
  current: string,
  done: string[],
  waitingBuyers: SaleSituation["waitingBuyers"] = [],
): SaleSituation {
  return {
    property: {
      id,
      listingStatus: status,
      characteristics,
      listing: status ? listing(status) : null,
    },
    progress: progress(current, done),
    waitingBuyers,
  };
}

const PREPARED = ["estimation_linked", "property_complete", "photos_min6"];
const WRITTEN = [...PREPARED, "listing_written", "listing_submitted"];
const ONLINE = [...WRITTEN, "listing_published"];

describe("steps of a sale read from their template", () => {
  it("steps and tasks in their order, each task done or not", () => {
    const sale = progress("prepare", ["property_complete"]);
    expect(sale.steps.map((step) => step.code)).toEqual([
      "prepare",
      "publish",
      "contacts_visits",
      "offers",
      "notary",
      "closing",
    ]);
    const prepare = currentStep(sale);
    expect(prepare?.tasks.map((task) => task.code)).toEqual([
      "estimation_linked",
      "property_complete",
      "photos_min6",
      "checklist_viewed",
      "diagnostics_listed",
    ]);
    expect(prepare?.tasks[1]).toMatchObject({
      autoTrigger: "property.complete",
      owner: "seller",
      doneAt: "2026-10-20T09:00:00Z",
    });
    expect(prepare && stepCount(prepare)).toEqual({ done: 1, total: 5 });
  });

  it("a status without date, or of no task, ticks nothing", () => {
    const sale = toProgress({ template: "autonomie", currentStepCode: "prepare" }, rows, [
      { task_id: "task-photos_min6", done_at: null },
      { task_id: null, done_at: "2026-10-20T09:00:00Z" },
    ]);
    expect(sale.steps.flatMap((step) => step.tasks).every((task) => task.doneAt === null)).toBe(
      true,
    );
  });

  it("an unknown current step has no step and no action", () => {
    const sale = progress("unknown", []);
    expect(currentStep(sale)).toBeNull();
    expect(stepAction(sale, () => true)).toBeNull();
  });

  it("the first task not done that the user can do, else the advice of the step", () => {
    const sale = progress("prepare", ["estimation_linked"]);
    expect(stepAction(sale, () => true)).toMatchObject({
      kind: "task",
      task: { code: "property_complete" },
    });
    expect(stepAction(sale, (task) => task.code === "photos_min6")).toMatchObject({
      kind: "task",
      task: { code: "photos_min6" },
    });
    expect(stepAction(sale, () => false)).toMatchObject({
      kind: "advice",
      step: { code: "prepare" },
    });
  });
});

describe("next action of the seller (SPEC-V2 8.7)", () => {
  it("1) a refused listing is corrected first, through the steps of the creation", () => {
    expect(
      getNextAction(
        situation("rejected", "publish", PREPARED, [
          { conversationId: "c1", firstName: "Chloé", since: "2026-10-20T08:00:00Z" },
        ]),
        NOW,
      ),
    ).toEqual({
      rule: "listingRejected",
      href: `/vendeur/biens/${id}/apercu`,
      reason: "Photos trop sombres.",
    });
  });

  it("5) a buyer waiting for more than 24 h, the one waiting the longest first", () => {
    const waiting = [
      { conversationId: "recent", firstName: "Bruno", since: "2026-10-26T00:00:00Z" },
      { conversationId: "later", firstName: "Chloé", since: "2026-10-24T08:00:00Z" },
      { conversationId: "first", firstName: "David", since: "2026-10-23T08:00:00Z" },
    ];
    expect(getNextAction(situation("published", "contacts_visits", ONLINE, waiting), NOW)).toEqual({
      rule: "buyerWaiting",
      href: "/messages/first",
      firstName: "David",
      since: "2026-10-23T08:00:00Z",
    });
  });

  it("an answer due within 24 h does not come before the tasks", () => {
    const action = getNextAction(
      situation(
        "draft",
        "prepare",
        ["estimation_linked"],
        [{ conversationId: "recent", firstName: "Bruno", since: "2026-10-25T13:00:00Z" }],
      ),
      NOW,
    );
    expect(action).toMatchObject({ rule: "task", task: { code: "property_complete" } });
  });

  it("6) the first task the seller does on a screen, where it is done", () => {
    // The analysis of value is made before the property: not a next action.
    expect(getNextAction(situation(null, "prepare", []), NOW)).toMatchObject({
      rule: "task",
      task: { code: "property_complete" },
      href: `/vendeur/biens/${id}/caracteristiques`,
    });
    expect(getNextAction(situation(null, "prepare", ["property_complete"]), NOW)).toMatchObject({
      rule: "task",
      task: { code: "photos_min6" },
      href: `/vendeur/biens/${id}/photos`,
    });
    // Online, the characteristics change from the page of change (L1-14b).
    expect(getNextAction(situation("published", "prepare", ["photos_min6"]), NOW)).toMatchObject({
      rule: "task",
      href: `/vendeur/biens/${id}/modifier/caracteristiques`,
    });
  });

  it("the listing written at step 3 of the creation, then sent from its preview", () => {
    expect(getNextAction(situation(null, "publish", PREPARED), NOW)).toMatchObject({
      rule: "task",
      task: { code: "listing_written" },
      href: `/vendeur/biens/${id}/prix`,
    });
    expect(
      getNextAction(situation("draft", "publish", [...PREPARED, "listing_written"]), NOW),
    ).toMatchObject({
      rule: "task",
      task: { code: "listing_submitted" },
      href: `/vendeur/biens/${id}/apercu`,
    });
  });

  it("7) nothing the seller can do yet: the advice of the step", () => {
    // In review: Leenkey publishes it.
    expect(getNextAction(situation("pending", "publish", WRITTEN), NOW)).toMatchObject({
      rule: "advice",
      step: {
        code: "publish",
        description: "Créer une annonce attractive et mettre le bien en vente sur Leenkey",
      },
    });
    // The documents to prepare come with lot 3, the contacts from the buyers.
    expect(getNextAction(situation(null, "prepare", PREPARED), NOW)).toMatchObject({
      rule: "advice",
      step: { code: "prepare" },
    });
    expect(getNextAction(situation("published", "contacts_visits", ONLINE), NOW)).toMatchObject({
      rule: "advice",
      step: { code: "contacts_visits" },
    });
  });

  it("a task ticked by hand has no address: it is ticked from the list of the tasks", () => {
    expect(getNextAction(situation("published", "notary", ONLINE), NOW)).toEqual({
      rule: "task",
      step: expect.objectContaining({ code: "notary" }),
      task: expect.objectContaining({ code: "notary_chosen", autoTrigger: null }),
      href: null,
    });
  });

  it("the deed signed is the listing marked as sold, from the page of the property", () => {
    expect(
      getNextAction(situation("published", "closing", [...ONLINE, "conditions_lifted"]), NOW),
    ).toMatchObject({ rule: "task", task: { code: "deed_signed" }, href: `/vendeur/biens/${id}` });
    // Suspended by Leenkey: it cannot be marked as sold.
    expect(
      getNextAction(situation("suspended", "closing", [...ONLINE, "conditions_lifted"]), NOW),
    ).toMatchObject({ rule: "advice", step: { code: "closing" } });
  });

  it("never a task of Leenkey", () => {
    const sale = situation("pending", "publish", WRITTEN);
    const publish = sale.progress.steps.find((step) => step.code === "publish");
    publish?.tasks.unshift({
      id: "task-listing_reviewed",
      code: "listing_reviewed",
      title: "Annonce relue et optimisée par le conseiller",
      required: false,
      autoTrigger: null,
      owner: "leenkey",
      doneAt: null,
    });
    expect(getNextAction(sale, NOW)).toMatchObject({ rule: "advice" });
  });

  it("nothing once sold: the summary of the sale takes its place", () => {
    expect(getNextAction(situation("sold", "closing", ONLINE), NOW)).toBeNull();
  });
});
