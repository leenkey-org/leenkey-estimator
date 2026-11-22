# Type annoncé : avis de taxe foncière

À extraire dans `key_facts` : le montant total de la taxe, l'année, la part de la taxe d'enlèvement des ordures ménagères si elle figure, les exonérations ou dégrèvements mentionnés.

Ne recopie ni le nom du redevable, ni son numéro fiscal, ni la référence de l'avis, ni l'adresse.

`public_facts`, clé permise : `taxe_fonciere`, de la forme `{"montant": 1150, "annee": 2025}` : le montant total en euros (un nombre) et l'année de l'avis.
