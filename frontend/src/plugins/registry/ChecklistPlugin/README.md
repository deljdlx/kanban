# ChecklistPlugin

Carte widget checklist interactive (mini todo-list dans une carte).

---

## Architecture

```
ChecklistPlugin/
├── manifest.json      — Métadonnées, hooks écoutés
├── index.js           — Point d'entrée (assemblePlugin)
├── ChecklistPlugin.js — Logique principale (widget, CRUD items)
└── styles.js          — Styles CSS injectés
```

---

## Fonctionnement

### Type de carte

Type enregistré : `widget:checklist` via `CardTypeRegistry`.

### Structure de données

```js
// card.data
{
    items: [
        { id: 'item-uuid', text: 'Faire les courses', checked: false },
        { id: 'item-uuid', text: 'Acheter du pain', checked: true },
    ];
}
```

### Hooks écoutés

| Hook                             | Rôle                                                 |
| -------------------------------- | ---------------------------------------------------- |
| `modal:addCard:opened`           | Enregistre le type avec formulaire de création       |
| `card:renderBody`                | Remplace le body de la carte par le widget checklist |
| `modal:cardDetail:renderContent` | Affiche le widget dans la modale détail              |

### Widget interactif

- Titre de la carte en haut
- Compteur de progression `X/Y` avec barre visuelle
- Liste de checkboxes cliquables
- Bouton supprimer par item
- Champ d'ajout en bas (Enter pour valider) — utilise les classes foundation `.input .input--sm`
- Chaque interaction sauvegarde immédiatement via `await BoardService.save()`

---

## Comment modifier

### Ajouter le drag & drop pour réordonner les items

1. Importer SortableJS dans `ChecklistPlugin.js`
2. Dans `_renderWidget()`, initialiser Sortable sur le conteneur d'items
3. Au `onEnd`, réordonner `card.data.items` et sauvegarder

### Ajouter une date d'échéance par item

1. Étendre la structure : `{ id, text, checked, dueDate }`
2. Ajouter un input date dans le rendu de chaque item
3. Ajouter un style visuel pour les items en retard
