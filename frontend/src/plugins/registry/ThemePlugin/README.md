# ThemePlugin

Change les couleurs, la police et l'échelle du kanban.

---

## Architecture

```
ThemePlugin/
├── manifest.json      — Métadonnées
├── index.js           — Point d'entrée (assemblePlugin)
├── ThemePlugin.js     — Logique principale (CSS custom properties)
├── presets.js         — Données des thèmes et polices
├── settingsPanel.js   — Sélection thème, police, couleur, échelle
└── styles.js          — Styles CSS injectés
```

---

## Fonctionnement

### Mécanisme

Le plugin surcharge les CSS custom properties sur `:root` pour changer l'apparence globale. Aucun hook nécessaire — les changements sont appliqués immédiatement.

### Thèmes prédéfinis (`presets.js`)

| Thème     | Description             |
| --------- | ----------------------- |
| default   | Thème sombre par défaut |
| light     | Thème clair             |
| solarized | Palette Solarized       |
| candy     | Tons pastels            |
| forest    | Tons verts              |
| retro     | Ambiance rétro          |

### Polices

Système, Monospace, Serif, Comic Sans, Cursive, Pixel.

### Couleur d'accent

Un Pickr permet de choisir une couleur custom pour `--color-primary`.

### Échelle globale

Un slider (70-140%) applique un `font-size` sur `:root` qui scale tout le design system.

### Persistence

IndexedDB via `StorageService` — objet `{ theme, font, accentColor, scale }`.

---

## Comment modifier

### Ajouter un thème

Dans `presets.js`, ajouter une entrée avec les CSS custom properties à surcharger :

```js
mytheme: {
    label: 'Mon thème',
    properties: {
        '--color-surface': '#1a1a2e',
        '--color-primary': '#e94560',
        // ...
    },
},
```

Le thème apparaît automatiquement dans le settings panel.
