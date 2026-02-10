# LinearSyncPlugin

Synchronise les issues Linear dans le board Kanban via l'API GraphQL.

## Architecture

```
LinearSyncPlugin/
├── manifest.json          — Metadata, hooks provides/listens
├── index.js               — Assemblage via PluginAssembler
├── LinearSyncPlugin.js    — Classe principale (lifecycle, polling, sync)
├── LinearApiClient.js     — Client GraphQL Linear
├── settingsPanel.js       — UI configuration (onglet board settings)
├── styles.js              — CSS (prefixe lsync-)
└── README.md              — Ce fichier
```

## Fonctionnement

### Configuration

1. L'utilisateur saisit son **token API Linear** dans l'onglet "Linear" des settings du board.
2. Il selectionne une **equipe** Linear.
3. Il **mappe** chaque workflow state Linear vers une colonne Kanban, "Ignorer", ou `+ Creer` (cree une colonne avec le nom du state).
4. Il active la **sync automatique** avec un intervalle configurable (30s a 10min).

### Synchronisation

A chaque sync (manuelle ou periodique) :

1. Le plugin fetch les issues Linear filtrees par equipe + states mappes.
2. Pour chaque issue :
    - **Nouvelle** : cree une carte dans la colonne mappee.
    - **Existante + modifiee** : met a jour titre, description, tags.
    - **Existante + colonne differente** : deplace vers la bonne colonne.
3. Sauvegarde le board.
4. Emet le hook `linearSync:synced` avec les stats (cree/modifie/deplace).

### Conversion issue → carte

| Champ Linear              | Champ carte                       |
| ------------------------- | --------------------------------- |
| `identifier` + `title`    | `title` : `[FIN-123] Titre`       |
| `description`             | `description` (markdown)          |
| `priority` (1-4)          | `tags.priority` : high/medium/low |
| `labels`                  | `tags.linear` : noms des labels   |
| `url`, `identifier`, `id` | `data.linearMeta` (metadata)      |

## Hooks

| Hook                         | Type    | Description                          |
| ---------------------------- | ------- | ------------------------------------ |
| `linearSync:synced`          | fournit | Emis apres une sync reussie          |
| `linearSync:error`           | fournit | Emis en cas d'erreur de sync         |
| `board:rendered`             | ecoute  | Capture le board, demarre le polling |
| `board:willChange`           | ecoute  | Arrete le polling                    |
| `header:renderActions`       | ecoute  | Injecte le bouton sync               |
| `modal:boardSettings:opened` | ecoute  | Enregistre l'onglet "Linear"         |

## Persistence

### Global (IndexedDB via StorageService)

| Cle                       | Valeur           |
| ------------------------- | ---------------- |
| `kanban:linearSync:token` | Token API Linear |

### Par board (`board.pluginData['linear-sync']`)

```js
{
    teamId: 'uuid',              // Equipe selectionnee
    stateMapping: {              // State Linear ID → colonne Kanban ID
        'state-id': 'column-id',
    },
    syncInterval: 60000,         // Intervalle en ms
    autoSync: true,              // Polling actif
    lastSyncAt: 'ISO string',   // Derniere sync
    issueMap: {                  // Tracking des issues syncees
        'issue-id': {
            cardId: 'card-id',
            columnId: 'column-id',
            updatedAt: 'ISO string',
        },
    },
}
```

## Limites connues

- **200 issues max** par sync (limite GraphQL `first: 200`). Au-dela, augmenter la valeur dans `LinearApiClient.fetchIssues()` ou implementer la pagination via curseurs.

## Comment modifier

### Ajouter un champ a la conversion issue → carte

1. Modifier `_issueToCardData()` dans `LinearSyncPlugin.js`
2. Ajouter le champ GraphQL dans `fetchIssues()` de `LinearApiClient.js`

### Changer les intervalles de sync

1. Modifier le tableau `SYNC_INTERVALS` dans `settingsPanel.js`

### Ajouter un filtre (par projet, par label)

1. Ajouter les champs de filtre dans `settingsPanel.js`
2. Persister dans `board.pluginData['linear-sync']`
3. Passer les filtres a `fetchIssues()` dans `LinearApiClient.js`
