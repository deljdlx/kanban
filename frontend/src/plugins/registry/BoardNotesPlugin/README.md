# BoardNotesPlugin

Notes et mémos attachés au board (objectifs, décisions, ressources).

---

## Architecture

```
BoardNotesPlugin/
├── manifest.json          — Métadonnées, hooks écoutés et fournis
├── index.js               — Point d'entrée (assemblePlugin)
├── BoardNotesPlugin.js    — Logique principale (UI, CRUD, indicateur header)
├── NoteManager.js         — CRUD des notes dans board.pluginData
└── styles.js              — Styles CSS injectés
```

### Flux de données

```
BoardNotesPlugin.js (UI + hooks)
    │
    ▼
NoteManager.js (CRUD)
    │
    ▼
board.pluginData['board-notes'] (persistence via Board model)
```

---

## Fonctionnement

### Hooks

| Hook                         | Direction | Rôle                                          |
| ---------------------------- | --------- | --------------------------------------------- |
| `board:rendered`             | écoute    | Init NoteManager, injecte l'indicateur header |
| `board:willChange`           | écoute    | Reset état interne                            |
| `modal:boardSettings:opened` | écoute    | Enregistre l'onglet "Notes"                   |
| `boardNotes:created`         | fournit   | Émis à la création d'une note                 |
| `boardNotes:updated`         | fournit   | Émis à la modification d'une note             |
| `boardNotes:deleted`         | fournit   | Émis à la suppression d'une note              |

### Indicateur header

Un bouton `📝` avec badge compteur est injecté dans `.app-header-actions`. Le clic ouvre `ModalBoardSettings` puis active l'onglet "Notes" via un `setTimeout(50)`.

### Onglet Notes

Enregistré via `registerTab('notes', 'Notes', builder)` dans le hook `modal:boardSettings:opened`. Deux vues :

1. **Liste** — Notes triées avec titre, auteur, date, contenu tronqué, boutons modifier/supprimer
2. **Éditeur** — Formulaire titre + textarea avec bouton retour

Les boutons utilisent les classes CSS foundation (`.btn--primary` pour ajouter/sauvegarder, `.btn--secondary` pour retour). Le fichier `styles.js` ne contient que les styles de layout spécifiques au plugin.

### Persistence

Les notes sont stockées dans `board.pluginData['board-notes']` via `NoteManager`. Chaque note a : `id`, `title`, `content`, `authorName`, `createdAt`, `updatedAt`.

---

## Comment modifier

### Ajouter un champ à une note (ex: couleur, priorité)

1. **NoteManager.js** — Ajouter le champ dans `add()` et `update()`
2. **BoardNotesPlugin.js** — Ajouter le champ dans `_showNoteEditor()` (formulaire) et `_renderNotesList()` (affichage)

### Ajouter le rendu Markdown dans les notes

Importer le même `markdown-it` que le `MarkdownPlugin` et rendre `note.content` en HTML dans `_renderNotesList()` au lieu de `textContent`.
