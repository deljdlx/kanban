# ColumnMappingPlugin

> Affiche des cartes miroir depuis d'autres boards dans les colonnes du board courant (lecture seule).

## Architecture

```
ColumnMappingPlugin/
├── manifest.json              — Métadonnées du plugin
├── index.js                   — Point d'entrée (assemblePlugin)
├── ColumnMappingPlugin.js     — Logique principale (hooks, rendu miroir, API publique)
├── settingsPanel.js           — Onglet "Column Mapping" dans Board Settings
├── styles.js                  — Styles CSS (.mirror-cards-section, .card--mirror)
└── README.md                  — Ce fichier
```

## Fonctionnement

### Concept

Le plugin permet de créer des "dashboards" qui agrègent des cartes de plusieurs boards. Chaque mapping lie une colonne locale à une colonne d'un board source. Les cartes du board source apparaissent en miroir (lecture seule, style atténué) sous les cartes locales.

```
Board "Dashboard"
┌──────────────┐  ┌──────────────┐
│  A faire     │  │  En cours    │
│──────────────│  │──────────────│
│ carte locale │  │ carte locale │
│ ─ ─ ─ ─ ─ ─ │  │ ─ ─ ─ ─ ─ ─ │
│ 🔗 Projet A  │  │ 🔗 Projet A  │
│ 🔗 Projet B  │  │              │
└──────────────┘  └──────────────┘
```

### Hooks écoutés

| Hook                         | Rôle                                                                  |
| ---------------------------- | --------------------------------------------------------------------- |
| `board:displayed`            | Reset du cache et du flag prefetch quand un nouveau board est affiché |
| `board:rendered`             | Charge les boards sources en async (premier render uniquement)        |
| `column:renderBody`          | Injecte les cartes miroir dans le body de chaque colonne              |
| `modal:boardSettings:opened` | Enregistre l'onglet "Column Mapping" dans les settings                |

### Chargement en deux phases

1. **Phase 1** (`board:rendered`, premier appel) : charge les boards sources depuis IndexedDB de manière asynchrone, puis déclenche un re-render via `board.emit('change')`.
2. **Phase 2** (re-render) : `column:renderBody` trouve les données en cache et injecte les cartes miroir.

Le flag `_prefetchTriggered` empêche la boucle infinie (le re-render rappellerait `board:rendered`).

### Rendu via le pipeline standard (CardView)

Les cartes miroir sont rendues via `CardView.render()`, le même pipeline que les cartes normales. Cela signifie que tous les hooks de rendu s'appliquent :

- **`card:renderBody`** : les widgets (checklist, pomodoro, etc.) prennent le contrôle si leur plugin est activé
- **`card:beforeRender`** : les filtres transforment les données (titre, description, tags)
- **`render:description`** : MarkdownPlugin rend la description en HTML si activé

Après le rendu standard, les données spécifiques au board source sont appliquées manuellement (les plugins locaux n'ont pas accès aux `pluginData` du board source) :

- **CardColor** : bordure + fond depuis `foreignBoard.pluginData['card-colors']`
- **Custom fields** : badges des champs visibles depuis `foreignBoard.pluginData['custom-fields']`

```
┌───────────────────┐
│▌ Titre de la carte │  ← couleur CardColor (bordure + fond)
│ Description rendue │  ← MarkdownPlugin si activé, sinon texte brut
│ HAUTE  FRONTEND    │  ← tags avec couleurs taxonomie
│ Estimation: 5 pts  │  ← custom fields (showOnCard: true)
│ Activer : Markdown │  ← hint si plugin manquant
│ 🔗 Board source     │
└───────────────────┘
```

### Hint plugins manquants (par carte)

Si un plugin qui changerait le rendu de cette carte n'est pas activé localement, un hint s'affiche directement sur la carte :

> Activer : Markdown, Checklist

Plugins signalés :

- **Markdown** : si la description contient de la syntaxe markdown
- **Widgets** : si le type de carte est un widget (checklist, pomodoro, compteur, youtube, stats, images)

Les données appliquées manuellement (CardColor, custom fields) ne sont pas signalées car elles sont toujours rendues.

### Cartes miroir non interactives

Les cartes miroir ont la classe CSS `card--mirror`. Le bouton d'édition est supprimé après le rendu. SortableJS (utilisé par DragDropHandler) ne peut pas les saisir. Les `CardView` miroir sont trackées et correctement détruites lors du re-render.

## Settings Panel — UX

Le panneau de settings utilise une UX « board-first » :

```
┌─────────────────────────────────────────────────────┐
│ Mappings actuels :                                  │
│ [A faire] ← Projet A / Todo                   [×]  │
│ [En cours] ← Projet B / In Progress           [×]  │
│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│ Ajouter des mappings :                              │
│                                                     │
│ Board source : [▼ Projet A          ]               │
│                                                     │
│ Colonnes du board source :                          │
│                                                     │
│ Todo         → [▼ A faire            ]              │
│ In Progress  → [▼ — Ignorer —        ]              │
│ Done         → [▼ + Créer colonne    ]              │
│                                                     │
│              [+ Ajouter les mappings]                │
└─────────────────────────────────────────────────────┘
```

Pour chaque colonne source, un select contient :

- `""` — **Ignorer** (pas de mapping, sélection par défaut)
- Colonnes locales existantes (par leur titre)
- `"__new__"` — **Créer une colonne** (sera créée avec le nom de la source)

Le bouton « + Ajouter les mappings » traite toutes les lignes d'un coup :

- Ignorer → skip
- Colonne existante → ajoute le mapping
- Créer → `BoardService.addColumn(sourceColName)` puis ajoute le mapping
- Dédoublonnage : les mappings identiques existants sont skippés

Les colonnes source déjà mappées au board courant sont pré-sélectionnées pour que l'utilisateur voie l'état actuel. Supprimer un mapping met aussi à jour les pré-sélections.

## Persistence

Les mappings sont stockés dans `board.pluginData['column-mapping']` :

```js
{
    mappings: [
        {
            localColumnId: 'col-abc', // Colonne du board courant
            sourceBoardId: 'board-xyz', // Board source
            sourceColumnId: 'col-def', // Colonne du board source
        },
    ];
}
```

Les données sont sauvegardées avec le board (pas de stockage IndexedDB séparé).

## API DevTools

Le plugin expose des méthodes publiques accessibles via `kanban.mappings.*` :

| Méthode                         | Description                         |
| ------------------------------- | ----------------------------------- |
| `list()`                        | Liste des mappings                  |
| `add(colId, boardId, srcColId)` | Ajoute un mapping                   |
| `remove(index)`                 | Supprime par index                  |
| `clear()`                       | Supprime tous les mappings          |
| `refresh()`                     | Recharge les boards sources (async) |

## Comment modifier

### Ajouter des informations sur les cartes miroir

1. Modifier `_renderMirrorCard(cardData, sourceBoardName, foreignBoard)` dans `ColumnMappingPlugin.js`
2. Accéder aux données via `cardData` (données brutes) ou `foreignBoard.pluginData` (données plugins)
3. Ajouter les éléments DOM avant le badge `mirror-badge` (toujours en dernier)
4. Ajouter les styles dans `styles.js` (avec `opacity: 0.7` pour cohérence visuelle)
5. Si le nouveau rendu dépend d'un plugin, ajouter l'entrée dans `WIDGET_PLUGIN_MAP` ou dans `_detectMissingPluginsForCard()`

### Ajouter une option au settings panel

1. Modifier `buildSettingsPanel()` dans `settingsPanel.js`
2. Ajouter le champ de formulaire
3. Persister la valeur dans `board.pluginData['column-mapping']`

### Styles

Le settings panel utilise les classes CSS foundation de l'application :

- Boutons : `.btn--primary` (ajout/bulk actions)
- Labels : `.label` sur les labels de formulaire (board source, etc.)
- Les styles spécifiques au plugin sont dans `styles.js`

### Changer le style des cartes miroir

1. Modifier les règles CSS dans `styles.js`
2. `.card--mirror` contrôle l'apparence générale
3. `.mirror-cards-section` contrôle le séparateur
