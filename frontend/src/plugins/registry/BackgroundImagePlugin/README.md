# BackgroundImagePlugin

Permet de glisser-déposer une image sur le board pour la définir comme fond.

---

## Architecture

```
BackgroundImagePlugin/
├── manifest.json              — Métadonnées, hooks écoutés
├── index.js                   — Point d'entrée (assemblePlugin)
└── BackgroundImagePlugin.js   — Logique principale (drag & drop, stockage)
```

Pas de `styles.js` ni `settingsPanel.js` — le plugin est purement fonctionnel.

---

## Fonctionnement

### Hooks écoutés

| Hook               | Rôle                                                               |
| ------------------ | ------------------------------------------------------------------ |
| `board:rendered`   | Attache les listeners DOM `dragover` et `drop` sur l'élément board |
| `board:willChange` | Détache les listeners et reset l'état interne                      |

### Flux de drop

```
Utilisateur drop une image sur le board
    │
    ▼
dragover : preventDefault + dropEffect = 'copy'
    │
    ▼
drop : vérifie file.type.startsWith('image/')
    │
    ▼
_readAndApply(file, boardEl)
    ├── ImageStorageService.store(file, boardId)
    ├── board.backgroundImage = { id }
    └── boardEl.style.backgroundImage = url(blob:...)
```

L'image est stockée dans IndexedDB via `ImageStorageService`. La référence (`{ id }`) est persistée dans le modèle Board, ce qui permet au `BoardView` de la recharger à l'ouverture.

### Cleanup

`uninstall()` et `board:willChange` appellent `_resetBoardState()` qui détache les listeners DOM et remet `_board` à null.

---

## Comment modifier

### Ajouter un feedback visuel au drag

1. Dans `_attachDomListeners()`, ajouter un listener `dragenter` pour ajouter une classe CSS
2. Ajouter un listener `dragleave` pour la retirer
3. Créer un `styles.js` et l'enregistrer dans `index.js` via `assemblePlugin`

### Supporter d'autres types de fichiers

Modifier le guard dans le handler `drop` :

```js
if (!file || !file.type.startsWith('image/')) return;
```
