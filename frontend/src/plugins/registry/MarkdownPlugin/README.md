# MarkdownPlugin

Rendu Markdown dans les descriptions et commentaires avec syntax highlighting, diagrammes Mermaid et images IndexedDB.

---

## Architecture

```
MarkdownPlugin/
├── manifest.json      — Métadonnées, hooks écoutés
├── index.js           — Point d'entrée (assemblePlugin)
├── MarkdownPlugin.js  — Logique principale (rendu, images async)
├── settingsPanel.js   — Toggles (cartes / modales)
└── styles.js          — Styles CSS (headings, code, tables, etc.)
```

---

## Fonctionnement

### Hooks écoutés

| Hook                 | Type   | Rôle                                          |
| -------------------- | ------ | --------------------------------------------- |
| `render:description` | filter | Transforme le markdown en HTML (vue board)    |
| `render:comment`     | filter | Transforme le markdown en HTML (commentaires) |

### Pipeline de rendu

```
Texte markdown
    │
    ▼
markdown-it (parsing + rendu HTML)
    │  └── highlight.js (coloration syntaxique)
    │
    ▼
DOMPurify (sanitization XSS)
    │
    ▼
Post-traitement async :
    ├── Mermaid : <code class="language-mermaid"> → <svg>
    └── Images : ![alt](img:<id>) → <img src="blob:...">
```

### Images IndexedDB

Le pattern `![alt](img:<id>)` est rendu comme un `<div data-image-id>` (placeholder). Après le sanitize DOMPurify, le plugin remplace les placeholders par des `<img src="blob:...">` de manière asynchrone via `StorageService`.

### Settings

Deux toggles indépendants :

- `enableInCards` — rendu dans la vue board (descriptions de cartes)
- `enableInModals` — rendu dans les modales (détail + commentaires)

### Persistence

IndexedDB via `StorageService` pour les toggles.

---

## Comment modifier

### Ajouter un langage pour la coloration syntaxique

Dans `MarkdownPlugin.js`, importer le langage highlight.js et l'enregistrer :

```js
import langRust from 'highlight.js/lib/languages/rust';
hljs.registerLanguage('rust', langRust);
```

### Supporter un nouveau schéma d'URL custom

Ajouter un post-traitement async dans le même pattern que les images `img:<id>` : créer un placeholder pendant le rendu, puis le remplacer après résolution.
