# Météo LPAOSF — Sénégal

Application météo PWA pour les 14 régions du Sénégal.

## Nouveautés 2026

- **Carte interactive avec labels** : chaque région affiche la valeur de la variable sélectionnée au centre, dans un cercle coloré
- **Mise à jour dynamique** : changez de variable (température, pluie, vent, UV, CAPE, pression, sol…) et la carte se met à jour instantanément
- **Cliquez sur une région** sur la carte pour la sélectionner automatiquement
- **Design moderne** : glassmorphism, animations, responsive, dark mode
- **Variables avancées** : CAPE, pression de surface, température et humidité du sol (agrégées depuis les données horaires)
- **API robuste** : utilise l'endpoint Open-Meteo standard (plus stable que gfs_graphcast025 seul)

## Fichiers

```
/
├── index.html
├── manifest.json
├── service-worker.js
├── css/
│   └── styles.css
├── js/
│   ├── app.js      (logique principale)
│   ├── api.js      (appels Open-Meteo)
│   └── map.js      (carte Leaflet avec labels)
└── assets/
    ├── icon-192.png
    └── icon-512.png   ← à créer (logo LPAOSF)
```

## Utilisation

1. Ouvrir `index.html` dans un navigateur moderne
2. Choisir une région (ou laisser "Toutes les régions")
3. Choisir une variable météo
4. Choisir un jour (ou laisser "Aujourd'hui")
5. La carte affiche la valeur sur chaque région
6. Cliquer sur une région de la carte pour voir son détail

## Notes techniques

- L'application fonctionne sans serveur (CORS autorisé par Open-Meteo)
- Service Worker inclus pour le mode offline
- Limite API : 10 000 appels/jour (gratuit)
- 14 régions × 1 appel daily + éventuellement 14 appels hourly = max 28 appels par session
