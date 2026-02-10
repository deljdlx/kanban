# KeyboardShortcutsPlugin

Raccourcis clavier centralisés et paramétrables avec capture click-to-record.

---

## Architecture

```
KeyboardShortcutsPlugin/
├── manifest.json              — Métadonnées (priority: 5)
├── index.js                   — Point d'entrée (assemblePlugin)
├── KeyboardShortcutsPlugin.js — Logique principale (listener, registry)
├── defaultShortcuts.js        — Déclaration des raccourcis par défaut
├── settingsPanel.js           — Panneau capture-to-record + conflits
└── styles.js                  — Styles CSS injectés
```

---

## Fonctionnement

### Raccourcis par défaut

| Touche   | Action                     | Guard                  |
| -------- | -------------------------- | ---------------------- |
| `Escape` | Fermer la modale du dessus | Pas si palette ouverte |
| `Alt+N`  | Nouvelle carte             | Board actif            |
| `Alt+H`  | Retour accueil             | —                      |
| `Alt+,`  | Paramètres board           | Board actif            |
| `Alt+R`  | Reset filtres              | Board actif            |

### Registry

Un `Map<normalizedKey, { label, action, guard }>` stocke les raccourcis. Le listener `keydown` sur `document` normalise la touche pressée et cherche dans la Map.

### Guards contextuels

Chaque raccourci peut définir un `guard()` qui retourne `false` pour bloquer l'exécution. Les guards courants :

- `isInputFocused()` — bloque si focus dans un `<input>`, `<textarea>` ou `[contenteditable]`
- `isBoardActive()` — bloque si aucun board n'est ouvert
- `isPaletteOpen()` — bloque si la CommandPalette est visible

### Settings panel

- Liste des raccourcis avec bouton "touche" par ligne
- Clic sur le bouton → mode capture (bordure primary + pulse)
- Appui d'une touche → enregistre le nouveau raccourci
- Détection de conflits (même touche déjà utilisée)
- Bouton "Réinitialiser" → restore les défauts

### Persistence

- Overrides stockés dans IndexedDB (clé via `StorageService`)
- Seuls les raccourcis modifiés sont persistés (pas les défauts)

---

## Comment modifier

### Ajouter un raccourci

Dans `defaultShortcuts.js`, ajouter une entrée :

```js
{
    key: 'Alt+E',
    label: 'Exporter le board',
    action: () => { /* ... */ },
    guard: () => isBoardActive(),
}
```

Le raccourci apparaît automatiquement dans le settings panel.
