# CommandPalettePlugin

Palette de commandes `Ctrl+K` / `Cmd+K` style VS Code pour rechercher, naviguer et exécuter des actions.

---

## Architecture

```
CommandPalettePlugin/
├── manifest.json              — Métadonnées, hooks écoutés
├── index.js                   — Point d'entrée (assemblePlugin)
├── CommandPalettePlugin.js    — Logique principale (DOM, recherche, navigation)
└── styles.js                  — Styles CSS injectés
```

---

## Fonctionnement

### Modes de recherche

Le premier caractère de la saisie détermine le mode :

| Préfixe   | Mode      | Méthode                 | Description                               |
| --------- | --------- | ----------------------- | ----------------------------------------- |
| _(aucun)_ | Cartes    | `_getCardResults()`     | Recherche par titre dans l'index          |
| `>`       | Actions   | `_getActionResults()`   | Actions statiques (modales, navigation)   |
| `#`       | Tags      | `_getTagResults()`      | Filtre par terme de taxonomie             |
| `@`       | Assignees | `_getAssigneeResults()` | Filtre par assignee (masqué en solo mode) |
| `/`       | Boards    | `_handleBoardSearch()`  | Navigation entre boards (async)           |

### Hooks écoutés

| Hook                                 | Rôle                           |
| ------------------------------------ | ------------------------------ |
| `board:didChange`                    | Reconstruit l'index des cartes |
| `board:willChange`                   | Vide l'index                   |
| `card:created/updated/deleted/moved` | Met à jour l'index             |
| `column:added/removed`               | Met à jour l'index             |

### Index des cartes

Un tableau `_cardIndex` est reconstruit à chaque changement du board. Chaque entrée contient `{ id, title, columnTitle }` pour une recherche rapide sans parcourir l'arbre du board.

### Recherche async (boards)

Le mode `/` charge les boards depuis `StorageService` de manière asynchrone. Un `_searchRequestId` évite les résultats stale (si l'utilisateur tape vite, seule la dernière requête est affichée).

### Navigation clavier

- `↑` / `↓` : naviguer dans les résultats
- `Enter` : exécuter le résultat actif
- `Escape` : fermer la palette

---

## Comment modifier

### Ajouter une action statique

Dans `_getActionResults()`, ajouter une entrée au tableau :

```js
{ icon: '🔧', label: 'Mon action', description: 'Description', action: () => { ... } }
```

### Ajouter un nouveau mode de recherche

1. Choisir un préfixe (ex: `!`)
2. Ajouter le cas dans `_onInput()` (switch sur le préfixe)
3. Créer la méthode `_getMyResults(query)` retournant un tableau de résultats
4. Chaque résultat : `{ icon, label, description, action }` ou `{ ..., href }` pour un lien
