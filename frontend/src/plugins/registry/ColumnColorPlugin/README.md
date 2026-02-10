# ColumnColorPlugin

Attribue une couleur de fond à chaque colonne via un color picker.

---

## Architecture

```
ColumnColorPlugin/
├── manifest.json          — Métadonnées, hooks écoutés
├── index.js               — Point d'entrée (assemblePlugin)
├── ColumnColorPlugin.js   — Configuration passée à ColorPluginFactory
├── settingsPanel.js       — Panneau swatches (généré par la factory)
└── styles.js              — Styles CSS injectés
```

### Dépendance clé

Comme `CardColorPlugin`, ce plugin est **généré** par `ColorPluginFactory` (`src/plugins/lib/ColorPluginFactory.js`). Seule la configuration diffère.

---

## Fonctionnement

### Hook écouté

| Hook             | Rôle                                                                              |
| ---------------- | --------------------------------------------------------------------------------- |
| `board:rendered` | Scanne les `.column[data-id]`, applique les couleurs, attache le MutationObserver |

Pas de hooks modales — la couleur se change uniquement via le bouton dans le header de colonne.

### Rendu visuel

```js
applyColor(el, color, { r, g, b, a }) {
    el.style.background = rgba(r, g, b, a);
    header.style.background = rgba(r, g, b, a + 0.07); // header légèrement plus opaque
}
```

### Bouton palette

Un bouton `🎨` est injecté dans le `.column-header`. Le clic ouvre un Pickr inline.

### Persistence

- **Couleurs par colonne** : `board.pluginData['column-colors']` → `{ columnId: 'rgba(...)' }`
- **Swatches** : globales dans IndexedDB (clé `kanban:columnColorSwatches`)

---

## Comment modifier

### Voir aussi

Le fonctionnement détaillé de la factory est dans `src/plugins/lib/ColorPluginFactory.js`. Les deux plugins couleur (carte et colonne) partagent 100% de la logique — seule la config dans leur fichier principal diffère.
