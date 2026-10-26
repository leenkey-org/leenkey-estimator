import Link from "next/link";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { computeEstimation, formatEUR, type EstimationResult } from "./estimation";
import type { LeenkeyForm } from "./types";
import { prixM2Dvf, type DvfResult } from "./dvf";
import { useEffect, useId, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertTriangle, Check, CheckCircle2, ChevronLeft, Circle, Loader2, X } from "lucide-react";
import { buttonVariants } from "@/components/shared/button";
import { facadeScope } from "@/components/shared/facade-root";
import { IconButton } from "@/components/shared/icon-button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { generateReportPDFBase64 } from "./generatePDF";

/** Mêmes libellés que l'étape Coordonnées, pour que le vendeur retrouve
 *  exactement ce qu'il a coché. */
const DISPO_LABELS: Record<string, string> = {
  matin: "Matin (8h–12h)",
  dejeuner: "Déjeuner (12h–14h)",
  apres_midi: "Après-midi (14h–17h)",
  soir: "Soir (17h–19h)",
  peu_importe: "Peu importe",
};

const monthLabel = (months: number): string => {
  if (months === 0) return "ce mois-ci";
  if (months === 1) return "il y a 1 mois";
  if (months < 12) return `il y a ${months} mois`;
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  if (years === 1 && restMonths === 0) return "il y a 1 an";
  if (restMonths === 0) return `il y a ${years} ans`;
  return `il y a ${years} an${years > 1 ? "s" : ""} et ${restMonths} mois`;
};

const dateFr = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
};

const typeLabel: Record<string, string> = {
  maison: "Maison",
  appartement: "Appartement",
  terrain: "Terrain",
  local_commercial: "Local commercial",
  immeuble: "Immeuble",
  atypique: "Bien atypique",
};

const fiabiliteLabel = {
  elevee: {
    txt: "Fiabilité élevée",
    cls: "bg-lk-success-bg text-lk-success-fg border-lk-success-bg",
  },
  moyenne: {
    txt: "Fiabilité moyenne",
    cls: "bg-lk-warning-bg text-lk-warning-fg border-lk-warning-bg",
  },
  faible: {
    txt: "Fiabilité faible",
    cls: "bg-lk-danger-bg text-lk-danger-fg border-lk-danger-bg",
  },
};

/**
 * La largeur de la fourchette dépend de ce que le vendeur a renseigné et du
 * type de bien. L'annoncer comme « resserrée » quelle que soit sa valeur était
 * faux dès qu'elle s'élargissait : mieux vaut dire pourquoi, et ce qui la
 * réduirait.
 */
const precisionLabel: Record<"elevee" | "moyenne" | "faible", string> = {
  elevee: "fourchette resserrée : votre dossier est complet",
  moyenne: "complétez votre dossier pour resserrer la fourchette",
  faible: "fourchette large : il manque des informations déterminantes",
};

const tensionLabel = {
  faible: "Marché détendu",
  moderee: "Marché actif",
  forte: "Marché tendu",
};

export function EstimationDashboard({
  form,
  ref_,
  aiAnalyse,
  dvfData,
  listingHref,
  onRestart,
}: {
  form: LeenkeyForm;
  ref_: string;
  aiAnalyse?: string;
  dvfData?: DvfResult | null;
  /** The creation of the listing from this analysis (L1-13b). */
  listingHref: string;
  onRestart: () => void;
}) {
  // Même règle que le wizard : sans échantillon fiable, DVF ne pilote rien.
  const dvfPrixM2 = prixM2Dvf(dvfData);
  const r: EstimationResult = computeEstimation(form, dvfPrixM2);

  // État pour le bouton "Recevoir par email"
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // État pour le modal "Être rappelé"
  const [contactOpen, setContactOpen] = useState(false);
  // The fields of the dialog, named by their labels.
  const contactIds = { dispo: useId(), message: useId() };
  const [contactStatus, setContactStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [contactMsg, setContactMsg] = useState("");
  const [contactDispo, setContactDispo] = useState(
    () =>
      (form.disponibilites ?? [])
        .map((d) => DISPO_LABELS[d])
        .filter(Boolean)
        .join(", ") || "Dès que possible",
  );

  // Cocher « je souhaite être contacté » suffit : la demande part toute seule,
  // sans fenêtre de confirmation. Le bandeau vert du rapport et l'email de
  // confirmation informent le vendeur ; Cédric reçoit l'alerte et rappelle.
  // Garde en localStorage : sans elle, chaque rechargement de la page
  // renverrait la demande (le state React ne survit pas au reload).
  const [rappelEnvoye, setRappelEnvoye] = useState(() => {
    try {
      return localStorage.getItem(`lk_rappel_${ref_}`) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (form.contact_conseiller && !rappelEnvoye) {
      setRappelEnvoye(true);
      try {
        localStorage.setItem(`lk_rappel_${ref_}`, "1");
      } catch {
        /* stockage indisponible : on tente quand même l'envoi unique */
      }
      void sendContactRequest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.contact_conseiller, rappelEnvoye]);

  const sendContactRequest = async () => {
    setContactStatus("sending");
    try {
      // 1. Génère le PDF en base64 pour l'attacher aux 2 emails (admin + client)
      let pdfBase64: string | undefined;
      let pdfFilename: string | undefined;
      try {
        const pdf = await generateReportPDFBase64({
          form,
          ref: ref_,
          r,
          aiAnalyse,
          dvfData,
        });
        pdfBase64 = pdf.base64;
        pdfFilename = pdf.filename;
      } catch (e) {
        console.warn("Génération PDF échouée, envoi sans pièce jointe:", e);
      }

      // 2. POST vers /api/contact (qui envoie à l'admin + au client)
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "rappel-conseiller",
          sendToClient: true,
          pdfBase64,
          pdfFilename,
          data: {
            ref_dossier: ref_,
            prenom: form.prenom,
            nom: form.nom,
            email: form.email,
            telephone: form.telephone,
            bien: `${form.type} · ${r.surface} m² · ${form.ville || ""}`,
            valeur_estimee: `${r.prixEstime.toLocaleString("fr-FR")} €`,
            disponibilite: contactDispo,
            message: contactMsg || "Demande de contact suite à une valorisation.",
          },
        }),
      });
      if (!res.ok) throw new Error("send failed");
      setContactStatus("sent");
      setTimeout(() => {
        setContactOpen(false);
        setContactStatus("idle");
        setContactMsg("");
      }, 2500);
    } catch {
      setContactStatus("error");
      setTimeout(() => setContactStatus("idle"), 4000);
    }
  };
  const sendEmailRecap = async () => {
    setEmailStatus("sending");
    try {
      // Le PDF est généré côté navigateur puis joint à l'email : c'est le seul
      // moyen d'obtenir le rapport, le téléchargement direct ayant été retiré.
      let pdfBase64: string | undefined;
      let pdfFilename: string | undefined;
      try {
        const pdf = await generateReportPDFBase64({ form, ref: ref_, r, aiAnalyse, dvfData });
        pdfBase64 = pdf.base64;
        pdfFilename = pdf.filename;
      } catch (e) {
        console.warn("Génération PDF échouée, envoi du récapitulatif seul:", e);
      }

      const res = await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: ref_,
          contact: {
            prenom: form.prenom,
            nom: form.nom,
            email: form.email,
            telephone: form.telephone,
          },
          bien: {
            type: form.type,
            adresse: form.adresse,
            code_postal: form.code_postal,
            ville: form.ville,
            surface_habitable: form.surface_habitable,
          },
          result: {
            prix_median: r.prixEstime,
            prix_bas: r.prixBas,
            prix_haut: r.prixHaut,
            prix_m2: r.prixM2,
            delai_vente: r.delaiVente,
            analyse: aiAnalyse ?? "",
          },
          pdfBase64,
          pdfFilename,
        }),
      });
      if (!res.ok) throw new Error("Send failed");
      // Pas de retour automatique à l'état initial : la confirmation reste, sans
      // quoi le vendeur retrouve un bouton bleu et doute que l'envoi ait eu lieu.
      setEmailStatus("sent");
    } catch {
      // L'erreur, elle, se réarme : il faut pouvoir réessayer.
      setEmailStatus("error");
      setTimeout(() => setEmailStatus("idle"), 5000);
    }
  };
  const fiab = fiabiliteLabel[r.fiabilite];

  // The main content of /estimer once the analysis is done (L1-43), in
  // Façade (L1-44): white cards on the background of the site, under its
  // header (the logo of the V1 is no longer repeated here).
  return (
    <main className="min-h-screen bg-lk-surface">
      {/* Header */}
      <header className="border-b border-lk-line bg-lk-surface">
        <div className="lk-frame flex justify-end py-3">
          <div className="text-lk-compact text-lk-ink-2">
            Réf. dossier · <span className="font-semibold text-lk-ink">{ref_}</span>
          </div>
        </div>
      </header>

      <div className="lk-frame py-10">
        {/* Demande de rappel : la case cochée à l'étape coordonnées ne
            produisait aucun retour visible. */}
        {form.contact_conseiller && (
          <div className="mb-8 flex items-start gap-3 rounded-lk-md bg-lk-success-bg p-5">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-lk-success" />
            <div>
              <div className="text-wide text-lk-body font-bold text-lk-ink">
                Votre demande de rappel est enregistrée
              </div>
              <p className="mt-1 text-lk-compact text-lk-ink-2">
                Un conseiller Leenkey vous appelle sous 24&nbsp;h
                {form.telephone ? ` au ${form.telephone}` : ""}
                {form.disponibilites.length
                  ? `, selon vos disponibilités (${form.disponibilites.join(", ")})`
                  : ""}
                .
              </p>
            </div>
          </div>
        )}

        {/* Intro */}
        <div className="fade-up mb-8">
          {/* No label over the title (DESIGN.md 13.2, L1-44). */}
          <h1 className="text-wide text-lk-h1 font-bold text-lk-ink lg:text-lk-h1-lg">
            {/* Without a first name, « Bonjour, voici… », not « Bonjour , voici… ». */}
            Bonjour{form.prenom ? ` ${form.prenom}` : ""}, voici la valeur estimée de votre bien
          </h1>
          <p className="mt-2 text-lk-ink-2">
            {typeLabel[form.type ?? "maison"]} · {r.surface} m² · {form.ville || "—"}
          </p>
        </div>

        {/* Hero card */}
        <section
          className="fade-up relative overflow-hidden rounded-lk-md border border-lk-line bg-lk-surface p-5 md:p-8"
          style={{ animationDelay: "0.05s" }}
        >
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-start">
            <div className="flex-1">
              <div className="text-lk-compact font-semibold text-lk-ink-2">Prix estimé</div>
              <div className="mt-2 text-wide tabular text-lk-display font-bold text-lk-ink lg:text-lk-display-lg">
                {formatEUR(r.prixEstime)}
              </div>
              <div className="mt-2 text-lk-ink-2 text-lk-compact">
                Précision{" "}
                <span className="font-semibold text-lk-ink">
                  ±{Math.round(((r.prixHaut - r.prixEstime) / r.prixEstime) * 100)}%
                </span>{" "}
                · {precisionLabel[r.fiabilite]}
              </div>

              {/* Barre de fourchette visuelle */}
              <div className="mt-6 max-w-md">
                <div className="relative h-2 rounded-full bg-lk-blue-line">
                  <div
                    className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-lk-blue"
                    style={{ left: "10%", right: "10%" }}
                  />
                  <div
                    className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-white bg-lk-blue"
                    style={{ left: "calc(50% - 10px)" }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-lk-caption font-semibold tabular text-lk-ink-2">
                  <span>{formatEUR(r.prixBas)}</span>
                  <span className="text-lk-blue">{formatEUR(r.prixEstime)}</span>
                  <span>{formatEUR(r.prixHaut)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-lk-caption font-semibold",
                  fiab.cls,
                )}
              >
                <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                {fiab.txt} · {r.fiabiliteScore}%
              </span>
              <div className="md:text-right">
                <div className="text-lk-compact text-lk-ink-2">Prix au m²</div>
                <div className="text-wide tabular text-lk-h2-lg font-bold text-lk-ink">
                  {r.prixM2.toLocaleString("fr-FR")} €/m²
                </div>
                <div className="mt-1 text-lk-caption text-lk-ink-2">
                  Marché : {r.prixM2Marche.toLocaleString("fr-FR")} €/m²
                </div>
              </div>
              {/* Mini-jauge fiabilité */}
              <div className="w-full max-w-[160px] md:max-w-[200px]">
                <div className="mb-1 flex justify-between text-lk-caption text-lk-ink-2">
                  <span>Fiabilité</span>
                  <span className="font-semibold text-lk-ink">{r.fiabiliteScore}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-lk-blue-line">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      r.fiabilite === "elevee"
                        ? "bg-lk-success"
                        : r.fiabilite === "moyenne"
                          ? "bg-lk-warning"
                          : "bg-lk-danger",
                    )}
                    style={{ width: `${r.fiabiliteScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KPI grid */}
        <section
          className="fade-up mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          style={{ animationDelay: "0.1s" }}
        >
          <Kpi
            label="vs marché local"
            value={`${r.deltaMarche >= 0 ? "+" : ""}${r.deltaMarche}%`}
            tone={r.deltaMarche >= 0 ? "pos" : "neg"}
            sub={`Moy. ${r.prixM2Marche.toLocaleString("fr-FR")} €/m²`}
          />
          <Kpi label="Délai de vente attendu" value={r.delaiVente} sub="À prix de marché" />
          <Kpi
            label="Score d'attractivité"
            value={`${r.scoreAttractivite}/100`}
            tone={r.scoreAttractivite >= 70 ? "pos" : r.scoreAttractivite >= 50 ? "neutral" : "neg"}
            sub="DPE · état · prestations"
          />
          <Kpi
            label="Tension du marché"
            value={tensionLabel[r.tensionMarche]}
            sub={`Département ${(form.departement || form.code_postal || "").slice(0, 2) || "—"}`}
          />
        </section>

        {/* Two columns */}
        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Récap */}
          <Card className="fade-up lg:col-span-2" delay="0.15s">
            <h2 className="mb-4 text-wide text-lk-h3 font-bold text-lk-ink">Votre bien</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-lk-compact">
              <Row k="Type" v={typeLabel[form.type ?? ""] ?? "—"} />
              <Row k="Surface" v={`${r.surface} m²`} />
              <Row k="Pièces" v={form.pieces ?? "—"} />
              <Row k="Chambres" v={form.chambres ?? "—"} />
              <Row k="Salles de bain" v={form.salles_bain ?? "—"} />
              {form.type === "appartement" && (
                <Row k="Étage" v={form.dernier_etage ? "Dernier" : (form.etage ?? "—")} />
              )}
              <Row k="DPE" v={form.dpe ?? "—"} />
              <Row k="État" v={form.etat ?? "—"} />
            </dl>
            {(form.exterieur.length > 0 || form.prestations.length > 0) && (
              <div className="mt-5 border-t border-lk-line pt-4">
                <div className="text-lk-caption font-semibold text-lk-ink-2">Atouts</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...form.exterieur, ...form.prestations].map((p) => (
                    <span
                      key={p}
                      className="rounded-lk-sm border border-lk-blue-line bg-lk-blue-tint px-2.5 py-1 text-lk-caption font-medium text-lk-blue"
                    >
                      {p.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Analyse IA Claude */}
          {aiAnalyse && (
            <Card className="fade-up lg:col-span-3" delay="0.18s">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="text-wide text-lk-h3 font-bold text-lk-ink">Analyse du marché</h2>
                <span className="ml-auto rounded-lk-sm bg-lk-blue-tint px-2 py-0.5 text-lk-caption font-semibold text-lk-blue">
                  Alimenté par IA
                </span>
              </div>
              <p className="max-w-lk-prose text-lk-compact leading-relaxed text-lk-ink-2">
                {aiAnalyse}
              </p>
            </Card>
          )}

          {/* Comparables DVF — données officielles data.gouv.fr */}
          {dvfData?.available && dvfData.comparables.length > 0 && (
            <Card className="fade-up lg:col-span-3" delay="0.19s">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="text-wide text-lk-h3 font-bold text-lk-ink">
                  Ventes réelles dans votre secteur
                </h2>
                <span className="ml-auto rounded-lk-sm bg-lk-success-bg px-2 py-0.5 text-lk-caption font-semibold text-lk-success-fg">
                  Données DVF · data.gouv.fr
                </span>
              </div>

              <InlineAlert tone="warning" live={false} className="mb-4">
                <strong>Données historiques</strong> · Les ventes ci-dessous proviennent de la base
                DVF officielle (DGFiP). Elles sont publiées avec un délai d'environ 6 mois. Le
                marché peut avoir évolué depuis. Notre analyse tient compte de cette ancienneté.
              </InlineAlert>

              {/* Stats résumées */}
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lk-sm bg-lk-stone-2 p-3">
                  <div className="text-lk-caption font-semibold text-lk-ink-2">
                    Comparables trouvés
                  </div>
                  <div className="mt-1 text-wide tabular text-lk-h2 font-bold text-lk-ink">
                    {dvfData.nbComparables}
                  </div>
                </div>
                <div className="rounded-lk-sm bg-lk-stone-2 p-3">
                  <div className="text-lk-caption font-semibold text-lk-ink-2">Prix médian /m²</div>
                  <div className="mt-1 text-wide tabular text-lk-h2 font-bold text-lk-ink">
                    {dvfData.stats.prixM2Median.toLocaleString("fr-FR")} €
                  </div>
                </div>
                <div className="rounded-lk-sm bg-lk-stone-2 p-3">
                  <div className="text-lk-caption font-semibold text-lk-ink-2">Min /m²</div>
                  <div className="mt-1 text-wide tabular text-lk-h2 font-bold text-lk-ink">
                    {dvfData.stats.prixM2Min.toLocaleString("fr-FR")} €
                  </div>
                </div>
                <div className="rounded-lk-sm bg-lk-stone-2 p-3">
                  <div className="text-lk-caption font-semibold text-lk-ink-2">Max /m²</div>
                  <div className="mt-1 text-wide tabular text-lk-h2 font-bold text-lk-ink">
                    {dvfData.stats.prixM2Max.toLocaleString("fr-FR")} €
                  </div>
                </div>
              </div>

              {/* Liste des ventes comparables */}
              <h3 className="mb-3 text-lk-compact font-semibold text-lk-ink">
                Dernières ventes comparables ({dvfData.comparables.length})
              </h3>
              <div className="space-y-2">
                {dvfData.comparables.map((c, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 gap-2 rounded-lk-sm border border-lk-line bg-lk-surface p-3 text-lk-compact sm:grid-cols-4"
                  >
                    <div>
                      <div className="text-lk-caption text-lk-ink-2">Vente</div>
                      <div className="font-semibold text-lk-ink">{dateFr(c.date)}</div>
                      <div className="text-lk-caption text-lk-ink-2">{monthLabel(c.monthsAgo)}</div>
                    </div>
                    <div>
                      <div className="text-lk-caption text-lk-ink-2">Bien</div>
                      <div className="font-semibold text-lk-ink">{c.type}</div>
                      <div className="text-lk-caption text-lk-ink-2">
                        {c.surface} m² {c.pieces > 0 ? `· ${c.pieces} p.` : ""}
                      </div>
                    </div>
                    <div>
                      <div className="text-lk-caption text-lk-ink-2">Prix</div>
                      <div className="font-semibold tabular text-lk-ink">{formatEUR(c.prix)}</div>
                      <div className="text-lk-caption text-lk-ink-2">
                        {c.prixM2.toLocaleString("fr-FR")} €/m²
                      </div>
                    </div>
                    <div>
                      <div className="text-lk-caption text-lk-ink-2">Localisation</div>
                      <div className="font-semibold text-lk-ink line-clamp-1">{c.ville}</div>
                      {c.adresse && (
                        <div className="text-lk-caption text-lk-ink-2 line-clamp-1">
                          {c.adresse}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-lk-caption italic text-lk-ink-2">
                Source : base de données publique DVF (Demandes de Valeurs Foncières) · data.gouv.fr
              </p>
            </Card>
          )}

          {/* Facteurs */}
          <Card className="fade-up lg:col-span-3" delay="0.2s">
            <h2 className="mb-1 text-wide text-lk-h3 font-bold text-lk-ink">
              Facteurs de valorisation
            </h2>
            <p className="mb-5 text-lk-compact text-lk-ink-2">
              Impact estimé de chaque critère par rapport au prix de marché.
            </p>
            <div className="space-y-4">
              {r.facteurs.map((f) => (
                <FactorBar key={f.label} f={f} />
              ))}
            </div>
          </Card>
        </section>

        {/* Recommandations */}
        <section className="fade-up mt-6" style={{ animationDelay: "0.25s" }}>
          <h2 className="mb-4 text-wide text-lk-h3 font-bold text-lk-ink">
            Comment valoriser votre bien
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {r.recommandations.map((rec, i) => (
              <div key={i} className="rounded-lk-md border border-lk-line bg-lk-surface p-5">
                <h3 className="text-lk-body font-semibold text-lk-ink">{rec.title}</h3>
                <p className="mt-1.5 text-lk-compact text-lk-ink-2">{rec.description}</p>
                {rec.uplift && (
                  <div className="mt-3 inline-flex rounded-lk-sm bg-lk-success-bg px-2 py-0.5 text-lk-caption font-semibold text-lk-success-fg">
                    Potentiel {rec.uplift}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Prochaines étapes */}
        <section
          className="fade-up mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2"
          style={{ animationDelay: "0.3s" }}
        >
          {/* L1-13b: the analysis becomes the listing (SPEC-V2 8.3), first. */}
          <Card className="lg:col-span-2">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="mb-2 text-wide text-lk-h3 font-bold text-lk-ink">
                  {fr.estimator.listing.title}
                </h2>
                <p className="text-lk-compact text-lk-ink-2">{fr.estimator.listing.text}</p>
              </div>
              <Link
                href={listingHref}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "inline-flex shrink-0 items-center justify-center",
                )}
              >
                {fr.estimator.listing.action}
              </Link>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-wide text-lk-h3 font-bold text-lk-ink">Prochaines étapes</h2>
            <ol className="space-y-3">
              {[
                { l: "Rapport généré", done: true },
                {
                  // Suit l'envoi réel : figé sur « envoyé » non coché, la liste
                  // contredisait le panneau « Rapport envoyé » d'à côté.
                  l:
                    emailStatus === "sent"
                      ? `Rapport détaillé envoyé à ${form.email || "votre email"}`
                      : "Recevoir le rapport détaillé par email",
                  done: emailStatus === "sent",
                },
                {
                  l:
                    rappelEnvoye || contactStatus === "sent"
                      ? "Rappel demandé — un conseiller vous appelle sous 24 h"
                      : "Appel avec un conseiller Leenkey",
                  done: rappelEnvoye || contactStatus === "sent",
                },
                { l: "Mise en vente sans agence", done: false },
              ].map((it, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-3 rounded-lk-md border p-3",
                    it.done
                      ? "border-lk-success-bg bg-lk-success-bg"
                      : "border-lk-line bg-lk-surface",
                  )}
                >
                  {it.done ? (
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 size-4.5 shrink-0 text-lk-success"
                    />
                  ) : (
                    <Circle aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-lk-ink-3" />
                  )}
                  <span
                    className={cn(
                      "text-lk-compact font-medium",
                      it.done ? "text-lk-ink" : "text-lk-ink-2",
                    )}
                  >
                    <span className="sr-only">
                      {it.done ? fr.estimator.nextStep.done : fr.estimator.nextStep.todo}{" "}
                    </span>
                    {it.l}
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <h2 className="mb-2 text-wide text-lk-h3 font-bold text-lk-ink">Aller plus loin</h2>
            <p className="mb-4 text-lk-compact text-lk-ink-2">
              Recevez le rapport complet en PDF par email, ou échangez avec un conseiller pour
              affiner votre projet.
            </p>
            <div className="flex flex-col gap-3">
              {/* La confirmation reste affichée : elle remplace le bouton au lieu
                  de le recolorer quelques secondes. Un CTA redevenu bleu laisse
                  croire que l'envoi n'a pas eu lieu. */}
              {emailStatus === "sent" ? (
                <div className="lk-sent flex items-start gap-3 rounded-lk-md border border-lk-success bg-lk-success-bg p-4">
                  <span className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center">
                    <span className="lk-sent-ring absolute inset-0 rounded-full bg-lk-success" />
                    <span className="lk-sent-badge relative flex h-8 w-8 items-center justify-center rounded-full bg-lk-success">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                        <path
                          className="lk-sent-check"
                          d="M5 12.5l4.5 4.5L19 7.5"
                          fill="none"
                          stroke="white"
                          strokeWidth="2.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-wide text-lk-compact font-bold text-lk-success-fg">
                      Rapport envoyé
                    </p>
                    <p className="mt-0.5 break-words text-lk-caption text-lk-ink-2">
                      Votre rapport complet en PDF vient de partir
                      {form.email ? (
                        <>
                          {" "}
                          à <strong className="text-lk-ink">{form.email}</strong>
                        </>
                      ) : null}
                      . Pensez à vérifier vos spams.
                    </p>
                    <button
                      onClick={sendEmailRecap}
                      className="-ml-2 inline-flex min-h-11 items-center px-2 text-lk-caption font-semibold text-lk-blue underline-offset-2 hover:underline"
                    >
                      Renvoyer
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={sendEmailRecap}
                  disabled={emailStatus === "sending"}
                  aria-busy={emailStatus === "sending" || undefined}
                  className={cn(
                    buttonVariants({ variant: emailStatus === "error" ? "danger" : "secondary" }),
                    // Its label takes two lines on a phone.
                    "inline-flex h-auto min-h-11 items-center justify-center py-2.5 leading-tight text-balance",
                  )}
                >
                  {emailStatus === "sending" && (
                    <span className="inline-flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          fill="none"
                          stroke="currentColor"
                          strokeOpacity="0.3"
                          strokeWidth="3"
                        />
                        <path
                          d="M21 12a9 9 0 0 0-9-9"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                      Préparation de votre rapport…
                    </span>
                  )}
                  {emailStatus === "error" && "Envoi impossible — réessayer"}
                  {emailStatus === "idle" && "Recevoir mon rapport complet par email"}
                </button>
              )}

              {/* Demande de rappel par un conseiller : the dialog of DESIGN.md 10.8
                  (full screen on a phone, 520 px in the centre from 768 px), closed
                  by Échap, its cross or « Annuler », never while the request is
                  sent; the focus comes back to « Prendre contact ». */}
              <DialogPrimitive.Root
                open={contactOpen}
                onOpenChange={(next) => {
                  if (next || contactStatus !== "sending") setContactOpen(next);
                }}
              >
                <DialogPrimitive.Trigger asChild>
                  <button
                    type="button"
                    className={cn(
                      buttonVariants({ variant: "secondary" }),
                      "inline-flex h-auto min-h-11 items-center justify-center py-2.5 leading-tight text-balance",
                    )}
                  >
                    Prendre contact avec un conseiller
                  </button>
                </DialogPrimitive.Trigger>
                <DialogPrimitive.Portal>
                  <DialogPrimitive.Overlay
                    className={cn(
                      "fixed inset-0 z-60 bg-lk-ink/40 duration-220",
                      "data-[state=open]:animate-in data-[state=open]:fade-in-0",
                    )}
                  />
                  <DialogPrimitive.Content
                    className={cn(
                      facadeScope,
                      "fixed inset-0 z-60 flex flex-col overflow-y-auto bg-lk-surface outline-none",
                      "md:top-1/2 md:right-auto md:bottom-auto md:left-1/2 md:max-h-[85vh] md:w-130 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lk-md md:shadow-float",
                      "duration-220 ease-out-lk data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none",
                    )}
                  >
                    {contactStatus === "sent" ? (
                      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                        <div
                          aria-hidden="true"
                          className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-lk-success-bg text-lk-success"
                        >
                          <Check className="size-8" />
                        </div>
                        <DialogPrimitive.Title className="mb-2 text-wide text-lk-h2 font-bold text-lk-ink">
                          Demande envoyée !
                        </DialogPrimitive.Title>
                        <DialogPrimitive.Description className="text-lk-compact text-lk-ink-2">
                          Un conseiller Leenkey vous contactera dans les plus brefs délais.
                        </DialogPrimitive.Description>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-lk-line px-5 pt-5 pb-3.5 md:flex md:items-start md:border-0 md:px-6 md:pt-6 md:pb-0">
                          <DialogPrimitive.Close asChild>
                            <IconButton
                              icon={ChevronLeft}
                              variant="stone"
                              aria-label={fr.estimator.contactDialog.back}
                              disabled={contactStatus === "sending"}
                              className="md:hidden"
                            />
                          </DialogPrimitive.Close>
                          <DialogPrimitive.Title className="min-w-0 flex-1 text-center text-lk-title font-semibold text-balance text-lk-ink md:text-left md:text-lk-h2 md:font-bold md:text-wide">
                            Prendre contact avec un conseiller
                          </DialogPrimitive.Title>
                          <DialogPrimitive.Close asChild>
                            <IconButton
                              icon={X}
                              aria-label={fr.estimator.contactDialog.close}
                              variant="transparent"
                              size="sm"
                              disabled={contactStatus === "sending"}
                              className="hidden md:inline-flex"
                            />
                          </DialogPrimitive.Close>
                          <span aria-hidden="true" className="size-11 md:hidden" />
                        </div>

                        <div className="flex flex-col gap-4 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-6 md:pb-6">
                          <DialogPrimitive.Description className="text-lk-secondary text-pretty text-lk-ink-2">
                            {form.contact_conseiller
                              ? "Vous avez demandé à être rappelé. Confirmez et un conseiller vous contactera sous 24 h."
                              : "Un conseiller Leenkey vous contactera sous 24 h."}
                          </DialogPrimitive.Description>

                          <div className="rounded-lk-sm bg-lk-blue-tint p-4 text-lk-compact">
                            <div className="font-semibold text-lk-ink">
                              {form.prenom} {form.nom}
                            </div>
                            <div className="text-lk-ink-2">
                              {form.email} · {form.telephone}
                            </div>
                            <div className="mt-1 text-lk-caption text-lk-ink-2">
                              Réf. dossier : <span className="tabular">{ref_}</span>
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor={contactIds.dispo}
                              className="mb-2 block text-lk-label font-medium text-lk-ink"
                            >
                              Quand préférez-vous être contacté&nbsp;?
                            </label>
                            <select
                              id={contactIds.dispo}
                              value={contactDispo}
                              onChange={(e) => setContactDispo(e.target.value)}
                              className="h-12 w-full rounded-lk-sm border-[1.5px] border-lk-field bg-lk-surface px-3.5 text-lk-body text-lk-ink focus:border-lk-blue focus:outline-none focus:ring-3 focus:ring-lk-blue-line"
                            >
                              <option>Dès que possible</option>
                              {Object.values(DISPO_LABELS).map((l) => (
                                <option key={l}>{l}</option>
                              ))}
                              {contactDispo !== "Dès que possible" &&
                                !Object.values(DISPO_LABELS).includes(contactDispo) && (
                                  <option>{contactDispo}</option>
                                )}
                            </select>
                          </div>

                          <div>
                            <label
                              htmlFor={contactIds.message}
                              className="mb-2 block text-lk-label font-medium text-lk-ink"
                            >
                              Votre message{" "}
                              <span className="font-normal text-lk-ink-2 text-lk-caption">
                                (optionnel)
                              </span>
                            </label>
                            <textarea
                              id={contactIds.message}
                              value={contactMsg}
                              onChange={(e) => setContactMsg(e.target.value)}
                              rows={4}
                              placeholder="Décrivez votre projet, vos questions, vos attentes…"
                              className="w-full resize-none rounded-lk-sm border-[1.5px] border-lk-field bg-lk-surface px-3.5 py-3 text-lk-body text-lk-ink focus:border-lk-blue focus:outline-none focus:ring-3 focus:ring-lk-blue-line"
                            />
                          </div>

                          {/* In the dialog from its opening, so that the error is read. */}
                          <div
                            aria-live="polite"
                            className={cn(contactStatus !== "error" && "sr-only")}
                          >
                            {contactStatus === "error" ? (
                              <InlineAlert tone="danger" live={false}>
                                Erreur d'envoi, réessayez ou contactez-nous directement à
                                contact.leenkey@gmail.com
                              </InlineAlert>
                            ) : null}
                          </div>

                          <div className="flex flex-col-reverse gap-2.5 pt-2 md:flex-row md:justify-end">
                            <DialogPrimitive.Close asChild>
                              <button
                                type="button"
                                disabled={contactStatus === "sending"}
                                className={cn(
                                  buttonVariants({ variant: "outline-ink" }),
                                  "inline-flex items-center justify-center",
                                )}
                              >
                                Annuler
                              </button>
                            </DialogPrimitive.Close>
                            <button
                              type="button"
                              onClick={() => void sendContactRequest()}
                              disabled={contactStatus === "sending"}
                              aria-busy={contactStatus === "sending" || undefined}
                              className={cn(
                                buttonVariants(),
                                "inline-flex items-center justify-center gap-2",
                              )}
                            >
                              {contactStatus === "sending" ? (
                                <>
                                  <Loader2
                                    aria-hidden="true"
                                    className="size-4 motion-safe:animate-spin"
                                  />
                                  Envoi…
                                </>
                              ) : (
                                "Envoyer ma demande"
                              )}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </DialogPrimitive.Content>
                </DialogPrimitive.Portal>
              </DialogPrimitive.Root>
              <button
                onClick={onRestart}
                className={cn(
                  buttonVariants({ variant: "ghost", muted: true }),
                  "inline-flex items-center justify-center",
                )}
              >
                Refaire une analyse
              </button>
            </div>
          </Card>
        </section>

        {/* Disclaimer juridique obligatoire */}
        <div className="mt-10 rounded-lk-md border border-lk-warning-bg bg-lk-warning-bg p-5">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle aria-hidden="true" className="size-4.5 shrink-0 text-lk-warning-fg" />
            <h3 className="text-wide text-lk-compact font-bold text-lk-warning-fg">
              Avertissement légal
            </h3>
          </div>
          <p className="max-w-lk-prose text-lk-compact leading-relaxed text-lk-warning-fg">
            Ce document constitue une <strong>analyse automatisée</strong> basée sur les
            informations renseignées et les données de marché disponibles. Il est fourni{" "}
            <strong>à titre informatif uniquement</strong> et ne constitue ni une expertise
            immobilière ni une estimation réalisée par un professionnel habilité au sens de la loi
            Hoguet. Les valeurs indiquées sont des ordres de grandeur basés sur des modèles
            statistiques et peuvent différer significativement du prix réel de vente. Pour une
            évaluation officielle opposable, consultez un expert immobilier agréé ou un notaire.
          </p>
        </div>
      </div>
    </main>
  );
}

/* ============ Helpers ============ */

function Card({
  children,
  className,
  delay,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: string;
}) {
  return (
    <div
      className={cn("rounded-lk-md border border-lk-line bg-lk-surface p-6", className)}
      style={delay ? { animationDelay: delay } : undefined}
    >
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "neg" | "neutral";
}) {
  const toneCls =
    tone === "pos" ? "text-lk-success" : tone === "neg" ? "text-lk-danger" : "text-lk-ink";
  return (
    <div className="rounded-lk-md border border-lk-line bg-lk-surface p-5">
      <div className="text-lk-caption font-semibold text-lk-ink-2">{label}</div>
      <div className={cn("mt-2 text-wide tabular text-lk-h2-lg font-bold", toneCls)}>{value}</div>
      {sub && <div className="mt-1 text-lk-caption text-lk-ink-2">{sub}</div>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt className="text-lk-ink-2">{k}</dt>
      <dd className="text-right font-semibold text-lk-ink">{v ?? "—"}</dd>
    </>
  );
}

function FactorBar({ f }: { f: { label: string; impact: number; detail: string } }) {
  const pos = f.impact >= 0;
  const width = Math.min(Math.abs(f.impact) * 4, 100); // 25% impact = full bar
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-lk-compact">
        <span className="font-semibold text-lk-ink">{f.label}</span>
        <span
          className={cn(
            "text-wide text-lk-compact font-bold",
            pos ? "text-lk-success" : "text-lk-danger",
          )}
        >
          {pos ? "+" : ""}
          {f.impact}%
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-lk-stone-2">
        <div
          className={cn(
            "absolute top-0 h-full rounded-full",
            pos ? "bg-lk-success left-1/2" : "bg-lk-danger right-1/2",
          )}
          style={{ width: `${width / 2}%` }}
        />
        <div className="absolute left-1/2 top-0 h-full w-px bg-lk-line" />
      </div>
      <div className="mt-1 text-lk-caption text-lk-ink-2">{f.detail}</div>
    </div>
  );
}
