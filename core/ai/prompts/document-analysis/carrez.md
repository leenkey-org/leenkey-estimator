# Type annoncé : mesurage Carrez

À extraire dans `key_facts` : la surface privative « loi Carrez » totale, le détail par pièce s'il figure (résumé en une ligne), les surfaces exclues ou annexes mentionnées (caves, balcons, parties sous 1,80 m), la date du mesurage.

Comparaison avec la surface déclarée : si le message indique la surface déclarée dans l'annonce et que la surface du document s'en écarte de plus de 5 %, ajoute un point d'attention de niveau `attention` qui donne les deux surfaces et l'écart en pourcentage, sans autre commentaire. Si l'écart est de 5 % ou moins, ou si la surface déclarée n'est pas donnée, n'en dis rien.

`public_facts`, clé permise : `surface_carrez`, un nombre en m² (par exemple `66.5`), sans unité ni texte.
