# LiveSyncPlugin

Synchronise le board entre onglets du navigateur via IndexedDB.

---

## Architecture

```
LiveSyncPlugin/
├── manifest.json      — Métadonnées, hooks écoutés et fournis
├── index.js           — Point d'entrée (assemblePlugin)
├── LiveSyncPlugin.js  — Logique principale (producteur + consommateur)
├── EventLogStore.js   — CRUD du journal d'événements IndexedDB
├── settingsPanel.js   — Réglage de l'intervalle de polling
└── styles.js          — Styles CSS du settings panel
```

> **Note** : `BoardDiffer.js` et `OpApplier.js` ont été extraits vers `src/sync/`
> pour être partagés avec SyncService (sync backend). Les imports dans
> LiveSyncPlugin.js pointent vers `../../../sync/BoardDiffer.js` et
> `../../../sync/OpApplier.js`.

### Flux de données

```
Onglet A (producteur)          IndexedDB              Onglet B (consommateur)
─────────────────              ─────────              ──────────────────────
board:saved                                           setInterval (poll)
    │                                                      │
    ▼                                                      ▼
BoardDiffer.diff(old, new)     EventLogStore          EventLogStore.getAfter(cursor)
    │                               ▲  │                   │
    ▼                               │  ▼                   ▼
EventLogStore.append(ops) ──────────┘  ──────────▶   OpApplier.apply(board, ops)
```

---

## Fonctionnement

### Hooks

| Hook             | Direction | Rôle                                      |
| ---------------- | --------- | ----------------------------------------- |
| `board:saved`    | écoute    | Diff le snapshot, append les opérations   |
| `board:rendered` | écoute    | Démarre le polling consommateur           |
| `sync:applied`   | fournit   | Émis quand des opérations sont appliquées |

### Producteur (`board:saved`)

1. Prend un snapshot du board après sauvegarde
2. `BoardDiffer.diff(oldSnapshot, newSnapshot)` → liste d'opérations
3. `EventLogStore.append(boardId, operations)` → écrit dans IndexedDB

### Consommateur (polling)

1. `setInterval` configurable (1-10s, défaut 3s)
2. `EventLogStore.getAfter(boardId, cursor)` → nouvelles opérations
3. `OpApplier.apply(board, operations)` → applique sur le modèle
4. Si gap détecté (onglet dormant trop longtemps) → fallback snapshot diff

### Opérations supportées

Board properties, pluginData, colonnes (add/remove/update/reorder), cartes (add/remove/update/move).

### Auto-pause

Le polling est mis en pause pendant les modifications manuelles pour éviter les boucles. Chaque onglet a un ID unique (`generateId('tab')` via `src/utils/id.js`).

### Event log

- Rétention : 30 secondes
- Compaction automatique (suppression des entrées expirées)
- Stocké par board dans IndexedDB

---

## Comment modifier

### Changer l'intervalle par défaut

Modifier la valeur par défaut dans `LiveSyncPlugin.js` (propriété `_pollInterval`).

### Ajouter un type d'opération

1. **`src/sync/BoardDiffer.js`** — Détecter le changement et générer l'opération
2. **`src/sync/OpApplier.js`** — Appliquer l'opération sur le board
3. Ajouter des tests dans `src/sync/BoardDiffer.test.js`
