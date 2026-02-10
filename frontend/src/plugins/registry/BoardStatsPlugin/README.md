# BoardStatsPlugin

Carte widget affichant les statistiques du board en temps réel.

---

## Architecture

```
BoardStatsPlugin/
├── manifest.json          — Métadonnées, hooks écoutés
├── index.js               — Point d'entrée (assemblePlugin)
├── BoardStatsPlugin.js    — Logique principale (widget, calculs, rendu)
└── styles.js              — Styles CSS injectés
```

---

## Fonctionnement

### Type de carte

Le plugin enregistre le type `widget:board-stats` via `CardTypeRegistry`. Les cartes de ce type affichent un widget au lieu du contenu standard.

### Hooks écoutés

| Hook                                 | Rôle                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `modal:addCard:opened`               | Enregistre le type "Statistiques du Board" dans le formulaire de création |
| `card:renderBody`                    | Remplace le body de la carte par le widget stats                          |
| `card:created/deleted/updated/moved` | Rafraîchit toutes les instances du widget                                 |
| `card:typeActivated`                 | Active le widget quand le type est reconnu dynamiquement                  |
| `modal:cardDetail:renderContent`     | Affiche le widget dans la modale détail                                   |

### Statistiques calculées

- Nombre total de cartes (hors widgets stats)
- Répartition par colonne (nom + compte + barre)
- Pourcentage de complétion (dernière colonne = "done")
- Barre de progression globale

### Rafraîchissement

Le plugin maintient une `Map<cardId, { container, updateFn }>` de toutes les instances rendues. À chaque événement carte, `_refreshAllStats()` re-calcule et met à jour toutes les instances connectées au DOM.

---

## Comment modifier

### Ajouter une statistique

1. Ajouter le calcul dans `_calculateStats()` (retourner le nouveau champ)
2. Ajouter le HTML dans `_renderStats()` (afficher la valeur)
3. Ajouter le style dans `styles.js` si nécessaire

### Exclure d'autres types de widget du comptage

Modifier le filtre dans `_calculateStats()` :

```js
const standardCards = cards.filter((c) => !c.type?.startsWith('widget:'));
```
