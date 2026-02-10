# ClickCounterPlugin

Carte widget compteur cliquable (micro-app dans une carte).

---

## Architecture

```
ClickCounterPlugin/
├── manifest.json          — Métadonnées, hooks écoutés
├── index.js               — Point d'entrée (assemblePlugin)
├── ClickCounterPlugin.js  — Logique principale (widget, +/-)
└── styles.js              — Styles CSS injectés
```

---

## Fonctionnement

### Type de carte

Type enregistré : `widget:counter` via `CardTypeRegistry`.

### Structure de données

```js
// card.data
{ count: 0, label: "Mon compteur" }
```

### Hooks écoutés

| Hook                             | Rôle                                                         |
| -------------------------------- | ------------------------------------------------------------ |
| `modal:addCard:opened`           | Enregistre le type avec formulaire (label + valeur initiale) |
| `card:renderBody`                | Remplace le body par le widget compteur                      |
| `modal:cardDetail:renderContent` | Affiche le widget en mode détail (plus grand)                |

### Widget

- Label affiché en haut
- Valeur grand format (cliquable pour incrémenter)
- Boutons `−` et `+`
- Animation CSS au changement de valeur
- Minimum 0 (pas de valeur négative)
- Sauvegarde immédiate via `await BoardService.save()`

Les inputs du formulaire de création utilisent les classes CSS foundation (`.input`). Le fichier `styles.js` ne contient que les styles du widget (affichage compteur, animation).

Ce plugin est un bon **exemple de référence** pour créer un nouveau type de carte widget.

---

## Comment modifier

### Autoriser les valeurs négatives

Retirer le guard `if (newValue < 0) return;` dans `_updateCounter()`.

### Ajouter un pas configurable

1. Ajouter `step` dans `card.data` (défaut 1)
2. Ajouter un champ dans le formulaire de création
3. Utiliser `step` dans les boutons +/−
