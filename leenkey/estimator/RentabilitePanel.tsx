import type { statsLocatives } from "./immeuble-calc";

type Stats = ReturnType<typeof statsLocatives>;

/**
 * Panneau latéral de l'étape Situation locative.
 *
 * Les chiffres se recalculent à chaque loyer saisi. Posés en tête de page, ils
 * défilaient hors de vue dès le troisième lot, au moment précis où le vendeur
 * a besoin de voir l'effet de ce qu'il tape.
 */
export function RentabilitePanel({ stats }: { stats: Stats }) {
  const vacance = 100 - stats.tauxOccupation;

  return (
    <aside className="rounded-lk-md lg:sticky lg:top-40 lg:z-20 border border-lk-blue-line bg-lk-surface p-5">
      <div className="text-lk-micro font-bold text-lk-blue">Rentabilité de l'immeuble</div>

      {/* Quand rien n'est loué, « Revenus annuels : 0 € » restait figé pendant
          la saisie des loyers attendus — le vendeur croyait le panneau cassé.
          Le chiffre principal bascule alors sur le revenu attendu, qui se met
          à jour à chaque frappe. */}
      <div className="mt-4">
        <div className="text-lk-caption font-semibold text-lk-ink-2">
          {stats.surLoyersAttendus ? "Revenus annuels attendus" : "Revenus annuels"}
        </div>
        <div className="text-wide text-lk-price font-bold leading-tight text-lk-ink">
          {(stats.surLoyersAttendus
            ? stats.revenusPotentiels
            : stats.revenusAnnuels
          ).toLocaleString("fr-FR")}{" "}
          €
        </div>
        <p className="mt-1 text-lk-micro leading-relaxed text-lk-ink-3">
          {stats.surLoyersAttendus
            ? "Aucun lot loué aujourd'hui : montant calculé à partir des loyers attendus que vous saisissez."
            : "C'est ce revenu, plus que la surface, qui fixe le prix d'un immeuble de rapport."}
        </p>
      </div>

      {/* Les loyers saisis sur les lots vides ne sont pas des revenus perçus :
          ils ne peuvent pas grossir la ligne des revenus réels. Mais les taire
          donnait l'impression qu'ils n'étaient pas pris en compte. Redondant
          quand le chiffre principal affiche déjà le potentiel. */}
      {stats.potentielVacance > 0 && !stats.surLoyersAttendus && (
        <div className="mt-4 rounded-lk-sm border border-dashed border-lk-blue-line bg-lk-blue-tint p-3">
          <div className="text-lk-caption font-semibold text-lk-ink-2">
            Une fois l'immeuble plein
          </div>
          <div className="text-wide text-lk-h3 font-bold text-lk-ink">
            {stats.revenusPotentiels.toLocaleString("fr-FR")} €
            <span className="ml-1 text-lk-caption font-semibold text-lk-ink-2">par an</span>
          </div>
          <p className="mt-1 text-lk-micro leading-relaxed text-lk-ink-3">
            {stats.potentielVacance.toLocaleString("fr-FR")} € de loyers à récupérer sur les lots
            libres
            {stats.potentielDeclare > 0 ? ", d'après les loyers que vous avez indiqués." : "."}
          </p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        {[
          {
            l: stats.surLoyersAttendus ? "Loyer moyen attendu" : "Loyer moyen",
            v: `${stats.loyerMoyen.toLocaleString("fr-FR")} €`,
            u: "par mois",
          },
          {
            l: stats.surLoyersAttendus ? "Loyer attendu au m²" : "Loyer au m²",
            v: stats.loyerM2 ? `${stats.loyerM2} €` : "—",
            u: "par mois",
          },
        ].map((s) => (
          <div key={s.l} className="rounded-lk-sm bg-lk-blue-tint p-3">
            <div className="text-lk-micro font-semibold text-lk-ink-2">{s.l}</div>
            <div className="mt-0.5 text-wide text-lk-body font-bold text-lk-ink">{s.v}</div>
            <div className="text-lk-micro text-lk-ink-3">{s.u}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-lk-line pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-lk-caption font-semibold text-lk-ink-2">Taux d'occupation</span>
          <span
            className={
              "text-wide text-lk-h3 font-bold " +
              (stats.tauxOccupation === 100
                ? "text-lk-success"
                : stats.tauxOccupation >= 70
                  ? "text-lk-ink"
                  : "text-lk-danger")
            }
          >
            {stats.tauxOccupation} %
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-lk-blue-tint">
          <div
            className={
              "h-full rounded-full transition-all duration-500 " +
              (stats.tauxOccupation === 100 ? "bg-lk-success" : "bg-lk-blue")
            }
            style={{ width: `${stats.tauxOccupation}%` }}
          />
        </div>
        <div className="mt-1.5 text-lk-micro text-lk-ink-3">
          {stats.nbOccupes} lot{stats.nbOccupes > 1 ? "s" : ""} loué
          {stats.nbOccupes > 1 ? "s" : ""} sur {stats.nbLots}
        </div>
      </div>

      {vacance > 0 && (
        <div className="mt-4 rounded-lk-sm border border-lk-warning-bg bg-lk-warning-bg p-3">
          <div className="text-lk-caption font-bold text-lk-warning-fg">{vacance} % de vacance</div>
          <p className="mt-1 text-lk-micro leading-relaxed text-lk-warning-fg">
            Un acquéreur y verra soit un risque, soit un potentiel de revalorisation. Renseignez le
            loyer attendu de chaque lot libre pour montrer le second.
          </p>
        </div>
      )}

      <div className="mt-5 rounded-lk-md border border-lk-blue-line bg-lk-blue-tint p-4">
        <div className="text-lk-caption font-bold text-lk-blue">À retenir</div>
        <p className="mt-1.5 text-lk-caption leading-relaxed text-lk-ink">
          {stats.surLoyersAttendus
            ? "Immeuble vide mais loyers attendus chiffrés : un acquéreur y lira le revenu atteignable. Pensez à renseigner chaque lot."
            : stats.revenusAnnuels === 0
              ? "Sans loyer déclaré, l'immeuble sera valorisé sur son seul patrimoine, ce qui le dessert le plus souvent."
              : stats.tauxOccupation === 100
                ? "Immeuble entièrement loué : le revenu est démontré, c'est l'argument le plus solide face à un investisseur."
                : "Renseignez les loyers de tous les lots, y compris libres, pour montrer le revenu atteignable."}
        </p>
      </div>
    </aside>
  );
}
