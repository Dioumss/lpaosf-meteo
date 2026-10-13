# Météo LPAOSF — Sénégal

Application web (PWA) de prévisions météo à 14 jours pour les 14 régions du Sénégal.

**En ligne :** https://dioumss.github.io/lpaosf-meteo/

## Ce que montre l'application

- **Carte des régions** : chaque région est colorée selon la variable choisie, avec la valeur affichée. Les classes de couleur sont **fixes** (par exemple 32–36 °C), donc une même couleur a le même sens d'un jour à l'autre.
- **11 variables** : température max et min, cumul et probabilité de pluie, humidité, vent, indice UV (catégories OMS), CAPE, pression de surface, température et humidité du sol (0–7 cm).
- **14 jours** : un bandeau permet de changer de jour, la carte et le détail suivent.
- **Détail d'une région** : conditions actuelles, chiffres clés du jour, graphique heure par heure (température et pluie, avec infobulle), prévisions sur 14 jours.
- **Points d'attention** : forte chaleur, fortes pluies, instabilité, vent fort, UV extrêmes. Ce sont des seuils indicatifs, pas la vigilance officielle de l'ANACIM.
- **Classement** des 14 régions pour la variable affichée.
- Mode sombre automatique, utilisable sur mobile, installable comme application.

## Fiabilité

| Problème de l'ancienne version | Solution |
|---|---|
| 14 requêtes séparées : une seule en échec bloquait tout l'affichage | **Une seule requête** Open-Meteo pour les 14 régions |
| Pas de délai d'attente ni de nouvelle tentative | Délai d'expiration et **3 tentatives** (12 s, 20 s, 30 s) |
| « Actualiser » ne rechargeait pas vraiment les données (cache en mémoire jamais vidé) | Cache **horodaté**, actualisation automatique toutes les 30 min, au retour sur l'onglet et au retour du réseau |
| Hors ligne, des données anciennes s'affichaient sans le signaler | L'heure de mise à jour est toujours visible ; un bandeau signale les données en cache ou de plus de 6 h |
| Service worker en « cache d'abord » : les mises à jour du site n'arrivaient pas aux utilisateurs | « Réseau d'abord » pour l'application, cache versionné |
| Dates calculées en UTC par le navigateur | Toutes les dates sont en heure de Dakar (`Africa/Dakar`) |
| Fond de carte CARTO, qui exige désormais une clé (filigrane « API KEY REQUIRED ») | Carte thématique sans fond tuilé (limites geoBoundaries incluses dans le dépôt) |
| Fichiers JS dupliqués à la racine, icônes 1024 px nommées 192/512 | Doublons supprimés, icônes aux bonnes tailles + icône « maskable » |

## Structure

```
index.html
manifest.json
service-worker.js
css/styles.css
js/
  app.js      interface : contrôles, carte, détail, graphique, actualisation
  api.js      requête Open-Meteo, nouvelles tentatives, cache local
  config.js   variables, classes de couleurs, codes météo, icônes SVG
  map.js      carte Leaflet choroplèthe
assets/
  regions.geojson   limites des 14 régions (geoBoundaries, simplifiées)
  icon-192.png, icon-512.png, icon-maskable-512.png, favicon.png
```

## Lancer en local

Les modules JavaScript ne se chargent pas en ouvrant `index.html` directement (`file://`). Lancez un petit serveur :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Données

- Prévisions : [Open-Meteo](https://open-meteo.com/) (« meilleur modèle » disponible pour chaque point), gratuit, sans clé, CORS autorisé.
- Les prévisions sont calculées aux **chefs-lieux** de région, pas en moyenne sur la région.
- CAPE, pression et sol sont agrégés depuis les données horaires (CAPE : maximum ; les autres : moyenne).
- Limites administratives : [geoBoundaries](https://www.geoboundaries.org/) SEN ADM1, licence CC BY 3.0 IGO.

## Modifier les seuils de couleur

Tout est dans `js/config.js` (`VARIABLES`) : bornes (`breaks`), couleurs (`colors`) et libellés.
Après toute modification des fichiers, augmentez `VERSION` dans `service-worker.js` pour que les utilisateurs reçoivent la nouvelle version.
