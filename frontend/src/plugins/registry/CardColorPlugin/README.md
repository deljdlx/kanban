# CardColorPlugin

Attribue une couleur à chaque carte (border-left + fond coloré) via un color picker.

---

## Architecture

```
CardColorPlugin/
├── manifest.json      — Métadonnées, hooks écoutés
├── index.js           — Point d'entrée (assemblePlugin)
├── CardColorPlugin.js — Configuration passée à ColorPluginFactory
├── settingsPanel.js   — Panneau swatches (généré par la factory)
└── styles.js          — Styles CSS injectés
```

### Dépendance clé

Le plugin est **généré** par `ColorPluginFactory` (`src/plugins/lib/ColorPluginFactory.js`). Le fichier `CardColorPlugin.js` ne contient que la **configuration** — toute la logique (MutationObserver, Pickr, persistence) est dans la factory.

---

## Fonctionnement

### Hooks écoutés

| Hook                    | Rôle                                                                            |
| ----------------------- | ------------------------------------------------------------------------------- |
| `board:rendered`        | Scanne les `.card[data-id]`, applique les couleurs, attache le MutationObserver |
| `modal:editCard:opened` | Ajoute l'onglet "Couleur" avec Pickr                                            |
| `modal:addCard:opened`  | Ajoute l'onglet "Couleur" dans la modale de création                            |
| `card:created`          | Applique la couleur choisie dans la modale de création                          |

### Rendu visuel

```js
applyColor(el, color, { r, g, b, a }) {
    el.style.borderLeft = `4px solid rgba(r, g, b, 1)`;
    el.style.background = `rgba(r, g, b, a)`;
}
```

### Bouton palette

Un bouton `🎨` est injecté dans `.card-actions` de chaque carte. Le clic ouvre un Pickr inline.

### Persistence

- **Couleurs par carte** : `board.pluginData['card-colors']` → `{ cardId: 'rgba(...)' }`
- **Swatches** : globales dans IndexedDB via `StorageService` (clé `kanban:cardColorSwatches`)

---

## Comment modifier

### Changer le rendu visuel

Modifier `applyColor()` et `clearColor()` dans `CardColorPlugin.js`. Exemple pour un fond uni sans bordure :

```js
applyColor(el, color, { r, g, b, a }) {
    el.style.background = toRgba(r, g, b, a);
},
clearColor(el) {
    el.style.background = '';
},
```

### Comprendre la factory

Lire `src/plugins/lib/ColorPluginFactory.js` — c'est le fichier qui contient toute la logique partagée entre `CardColorPlugin` et `ColumnColorPlugin`.
