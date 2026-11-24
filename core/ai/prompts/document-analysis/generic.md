# Type annoncé : autre document du dossier de vente

Le message indique le type annoncé par le vendeur (dossier de diagnostics techniques, certificat d'urbanisme ou bornage, carnet d'entretien, fiche synthétique de copropriété, plan pluriannuel de travaux, pré-état daté, état daté du syndic, factures et justificatifs de travaux, autre document).

À extraire dans `key_facts` : ce que le document est, sa date, qui l'a établi (entreprise ou organisme), et les informations chiffrées ou datées qu'il donne sur le bien ou l'immeuble (travaux réalisés et leur date, montants, garanties mentionnées, échéances).

Pour un dossier de diagnostics techniques (DDT, type `ddt`), le fichier regroupe plusieurs diagnostics : cite dans `key_facts` chaque diagnostic présent, avec sa date et sa conclusion telles qu'écrites (12 lignes au plus) ; `date` est celle du dossier ou, à défaut, celle du diagnostic le plus récent. Un dossier qui ne contient qu'une partie des diagnostics n'est pas `incomplete` pour cette seule raison.

Points d'attention : ce que le document signale lui-même comme une réserve, une échéance ou un impayé.

`public_facts` : aucun, rends `{}`.
