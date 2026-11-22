# Type annoncé : diagnostic de performance énergétique (DPE)

À extraire dans `key_facts` : la classe énergie et la classe climat (GES), la consommation d'énergie primaire (kWh/m²/an) et les émissions (kg CO₂/m²/an), les coûts annuels d'énergie indiqués et leur année de référence s'ils figurent, la date de réalisation, la durée ou la date de fin de validité indiquée par le document, les recommandations principales de travaux (trois au plus, telles qu'écrites).

Points d'attention : ce que le document signale lui-même (logement à consommation énergétique excessive, DPE réalisé sur factures, DPE « vierge », réserves du diagnostiqueur).

`public_facts` : aucun, rends `{}`. L'annonce affiche déjà les classes déclarées par le vendeur ; ne donne jamais la date ni le numéro du DPE hors de `key_facts`.
