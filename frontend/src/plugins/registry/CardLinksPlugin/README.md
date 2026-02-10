# CardLinksPlugin

Liens bidirectionnels entre cartes avec badge, highlight au survol et onglet de gestion.

---

## Architecture

```
CardLinksPlugin/
├── manifest.json          — Métadonnées, hooks écoutés
├── index.js               — Point d'entrée (assemblePlugin)
├── CardLinksPlugin.js     — Logique principale (liens, badges, UI)
└── styles.js              — Styles CSS injectés
```

---

## Fonctionnement

### Hooks écoutés

| Hook                    | Rôle                                                  |
| ----------------------- | ----------------------------------------------------- |
| `board:didChange`       | Charge la `linksMap` depuis `board.pluginData`        |
| `board:willChange`      | Cleanup observer + handlers                           |
| `board:rendered`        | Setup MutationObserver + traite les cartes existantes |
| `modal:editCard:opened` | Ajoute l'onglet "Liens"                               |
| `card:deleted`          | Nettoie les liens de la carte supprimée               |

### Structure de données

```js
// board.pluginData['card-links']
{
    "card-abc": ["card-def", "card-ghi"],
    "card-def": ["card-abc"],
    "card-ghi": ["card-abc"]
}
```

Les liens sont **toujours bidirectionnels** : `_addLink(a, b)` écrit dans les deux entrées. Sauvegardé via `board.setPluginData()` (emit 'change' → auto-save).

### Badge

Chaque carte avec des liens affiche un badge `🔗 N` en bas. Le badge est injecté par le MutationObserver quand une `.card[data-id]` apparaît dans le DOM.

### Highlight

Au `mouseenter` sur un badge, toutes les cartes liées reçoivent la classe `.clp-highlight` (box-shadow violet). Au `mouseleave`, la classe est retirée.

### Onglet "Liens" (modale édition)

- Champ de recherche filtrant les cartes du board
- Liste des cartes liées avec bouton de retrait
- Clic sur une carte non-liée → ajoute le lien

---

## Comment modifier

### Changer le style du highlight

Modifier la classe `.clp-highlight` dans `styles.js`.

### Ajouter un type de lien (ex: "bloque", "dépend de")

1. Changer la structure de données de `string[]` vers `{ targetId, type }[]`
2. Adapter `_addLink()`, `_removeLink()`, `_cleanupCardLinks()`
3. Mettre à jour l'UI du badge et de l'onglet "Liens"
4. Ajouter la migration dans `_loadLinks()` pour l'ancien format
