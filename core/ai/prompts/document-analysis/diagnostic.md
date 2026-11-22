# Type annoncé : diagnostic technique (amiante, plomb, termites, électricité, gaz ou assainissement)

À extraire dans `key_facts` : l'objet du diagnostic, la conclusion telle qu'écrite (présence ou absence, repérage, nombre et nature des anomalies), les parties ou locaux non visités ou non contrôlés, la date de réalisation, la durée ou la date de fin de validité indiquée par le document.

Points d'attention : les anomalies, la présence de matériaux ou d'agents repérés, les réserves et les parties non contrôlées que le document signale. Reprends la gravité avec les mots du document, sans la requalifier.

`public_facts`, une seule clé, celle du diagnostic annoncé par le vendeur. Pour `amiante`, `plomb` ou `termites` : `"presence"` ou `"absence"`. Pour `electricite`, `gaz` ou `assainissement` : `"anomalies"` ou `"sans_anomalie"`. Omets la clé si la conclusion du document n'est pas l'une des deux sans ambiguïté.
