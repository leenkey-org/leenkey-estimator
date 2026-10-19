import { AlertTriangle, Check } from "lucide-react";
import { profilEnergetique } from "./energie";
import type { LeenkeyForm } from "./types";

/**
 * Panneau latéral de l'étape Énergie.
 *
 * Il rend visible, pendant la saisie, ce que chaque réponse fait à la valeur.
 * Le vendeur découvrait jusqu'ici l'effet du DPE seulement à la fin, dans le
 * rapport.
 */
/** « −2 % à 0 % », « +4 % » : le signe est porté par chaque borne. */
function formatImpact(min: number, max: number): string {
  const signe = (n: number) => `${n > 0 ? "+" : ""}${n} %`;
  return min === max ? signe(max) : `${signe(min)} à ${signe(max)}`;
}

export function ProfilEnergetiquePanel({ form }: { form: LeenkeyForm }) {
  const p = profilEnergetique(form);

  // Jauge circulaire : 2πr pour r = 34.
  const circonference = 2 * Math.PI * 34;
  const rempli = (p.score / 100) * circonference;
  // Façade colours (DESIGN.md 2.1), as CSS variables for the SVG.
  const couleur =
    p.score >= 60
      ? "var(--color-lk-success)"
      : p.score >= 40
        ? "var(--color-lk-warning)"
        : "var(--color-lk-danger)";

  return (
    <aside className="rounded-lk-md lg:sticky lg:top-40 lg:z-20 border border-lk-blue-line bg-lk-surface p-5">
      <div className="text-lk-micro font-bold text-lk-blue">Votre profil énergétique</div>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative size-21.5 shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="var(--color-lk-line)"
              strokeWidth="7"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke={couleur}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${rempli} ${circonference}`}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-wide text-lk-h2 font-bold leading-none text-lk-ink">
              {p.score}
              <span className="text-lk-caption font-semibold text-lk-ink-2">/100</span>
            </span>
            <span className="mt-0.5 text-lk-micro font-semibold text-lk-ink-2">{p.mention}</span>
          </div>
        </div>
        <div>
          <div className="text-wide text-lk-body font-bold leading-tight text-lk-ink">
            {p.titre}
          </div>
          <p className="mt-1 text-lk-caption leading-relaxed text-lk-ink-2">{p.description}</p>
        </div>
      </div>

      {/* Les deux blocs restent toujours visibles : un panneau qui disparaît
          donne l'impression que le calcul ne marche pas. */}
      <div className="mt-5">
        <div className="text-lk-caption font-bold text-lk-ink">Points forts</div>
        {p.forts.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {p.forts.slice(0, 8).map((f) => (
              <li key={f} className="flex items-start gap-2 text-lk-caption text-lk-ink-2">
                <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-lk-success" />
                {f}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-lk-caption italic text-lk-ink-3">Ils apparaîtront ici.</p>
        )}
      </div>

      <div className="mt-5">
        <div className="text-lk-caption font-bold text-lk-ink">Points à améliorer</div>
        {p.ameliorer.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {p.ameliorer.slice(0, 8).map((a) => (
              <li key={a} className="flex items-start gap-2 text-lk-caption text-lk-ink-2">
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-lk-warning"
                />
                {a}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-lk-caption italic text-lk-ink-3">Ils apparaîtront ici.</p>
        )}
      </div>

      {p.manquants.length > 0 && (
        <div className="mt-5 rounded-lk-sm bg-lk-blue-tint p-3">
          <div className="text-lk-caption font-bold text-lk-ink">Pour affiner le profil</div>
          <p className="mt-1 text-lk-caption leading-relaxed text-lk-ink-2">
            Renseignez {p.manquants.slice(0, 4).join(", ")}
            {p.manquants.length > 4 ? "…" : "."}
          </p>
        </div>
      )}

      <div className="mt-5 border-t border-lk-line pt-4">
        <div className="text-lk-caption font-semibold text-lk-ink-2">
          Impact estimé sur la valeur
        </div>
        <div
          className={
            "mt-1 text-wide text-lk-h2 font-bold " +
            (!p.calculable
              ? "text-lk-ink-2"
              : p.impactMax < 0
                ? "text-lk-danger"
                : "text-lk-success")
          }
        >
          {!p.calculable ? "À calculer" : formatImpact(p.impactMin, p.impactMax)}
        </div>
        <p className="mt-1 text-lk-caption leading-relaxed text-lk-ink-3">
          {!p.calculable
            ? "L'estimation se met à jour selon vos réponses."
            : p.impactMax < 0
              ? "Un ajustement du prix ou des travaux ciblés peut être nécessaire."
              : "Effet des réponses énergétiques sur la valeur de votre bien."}
        </p>
      </div>

      <div className="mt-5 rounded-lk-md border border-lk-blue-line bg-lk-blue-tint p-4">
        <div className="text-lk-caption font-bold text-lk-blue">Recommandation Leenkey</div>
        <p className="mt-1.5 text-lk-caption leading-relaxed text-lk-ink">
          {p.recommandation ??
            "Complétez quelques critères pour recevoir une recommandation personnalisée."}
        </p>
      </div>
    </aside>
  );
}
