# ColumnTogglePlugin

Permet d'afficher ou masquer des colonnes du board via un dropdown dans le header.

## Architecture

```
ColumnTogglePlugin/
├── manifest.json            # Metadata et hooks (listens)
├── index.js                 # Point d'entree, assemblePlugin()
├── ColumnTogglePlugin.js    # Logique metier (dropdown, toggle, persistence)
├── styles.js                # CSS du dropdown et de la classe .coltoggle-hidden
└── README.md                # Ce fichier
```

## Fonctionnement

### Hooks ecoutes

| Hook                   | Role                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `header:renderActions` | Injecte le dropdown dans le header (avant `.app-header-settings`)                   |
| `board:rendered`       | Applique `.coltoggle-hidden` sur les colonnes masquees (safety net apres re-render) |
| `column:added`         | Refresh du panneau (nouvelle colonne visible par defaut)                            |
| `column:removed`       | Nettoie l'ID supprime de `_hiddenColumns`                                           |

### Toggle d'une colonne

1. Met a jour `_hiddenColumns` (Set en memoire)
2. Toggle `.coltoggle-hidden` directement sur `.column[data-id=xxx]` (feedback instantane)
3. Persiste via `board.setPluginData()` (emit 'change' → auto-save)
4. Refresh le dropdown (checkboxes + trigger badge)

### Edge cases

- **Derniere colonne visible** : checkbox disabled, toggle refuse
- **Colonne supprimee pendant qu'elle est cachee** : `column:removed` nettoie
- **Changement de board** : `header:renderActions` re-fire (HeaderView recree)
- **Board re-render** : `board:rendered` re-applique les classes

## Persistence

```
board.pluginData['column-toggle'] = {
    hiddenColumns: string[]   // IDs des colonnes masquees
}
```

Utilise `board.setPluginData(key, value)` qui émet `'change'` → BoardService auto-save (debounced 300ms).

## Comment modifier

### Ajouter une option au dropdown

1. Ajouter le DOM dans `_buildPanelContent()`
2. Mettre a jour `_refreshDropdown()` si necessaire
3. Persister dans le meme objet pluginData si besoin

### Styles

Le fichier `styles.js` utilise les variables CSS standard du design system (`--color-text`, `--color-border`, `--color-surface`, `--color-surface-hover`, `--color-text-muted`, `--color-primary`). Les noms de variables suivent la convention `--color-*` / `--spacing-*` / `--radius-*`.

### Changer le style du trigger

1. Modifier `_updateTriggerLabel()` pour le texte/classes
2. Modifier les styles CSS dans `styles.js`

### Ajouter un raccourci clavier

1. Ecouter le hook `keyboard:shortcutRegistered` ou ajouter un listener dans `install()`
2. Appeler `_toggleColumn()` ou `_showAll()` selon la touche
