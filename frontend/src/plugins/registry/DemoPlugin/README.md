# DemoPlugin

Plugin de démonstration affichant "Modifié il y a X min" sur chaque carte. Sert de **référence pédagogique** pour créer un nouveau plugin.

---

## Architecture

```
DemoPlugin/
├── manifest.json      — Métadonnées, hooks écoutés
├── index.js           — Point d'entrée (assemblePlugin)
├── DemoPlugin.js      — Logique principale (timestamps, observer)
├── settingsPanel.js   — Panneau de settings (toggle)
└── styles.js          — Styles CSS injectés
```

---

## Fonctionnement

### Hooks écoutés

| Hook                   | Type   | Rôle                                         |
| ---------------------- | ------ | -------------------------------------------- |
| `board:afterLoad`      | filter | Peuple les dates initiales depuis les cartes |
| `card:created`         | action | Enregistre la date de création               |
| `card:updated`         | action | Met à jour la date de modification           |
| `card:beforeRender`    | filter | Enrichit les données de rendu                |
| `modal:addCard:opened` | action | Ajoute un onglet "Demo" dans la modale       |

### MutationObserver

Un observer sur `.board` détecte les cartes ajoutées dynamiquement et injecte le label "Modifié il y a X min" dans chaque `.card`.

### Persistence

- IndexedDB via `StorageService` (clé `kanban:demo-timestamp`)
- Setting : `enabled` (booléen) contrôlé via le settings panel

---

## Intérêt pédagogique

Ce plugin illustre tous les patterns fondamentaux :

1. **Hooks action** — écouter des événements et agir
2. **Hooks filter** — enrichir des données avant utilisation
3. **MutationObserver** — détecter les changements DOM
4. **Settings panel** — UI de configuration avec persistence
5. **Lifecycle** — `install()` / `uninstall()` propres
