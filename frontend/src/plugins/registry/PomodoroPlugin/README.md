# PomodoroPlugin

Carte widget timer Pomodoro avec durées prédéfinies et notifications via hooks.

---

## Architecture

```
PomodoroPlugin/
├── manifest.json      — Métadonnées, hooks écoutés et fournis
├── index.js           — Point d'entrée (assemblePlugin)
├── PomodoroPlugin.js  — Logique principale (timer, widget, contrôles)
└── styles.js          — Styles CSS (cercle, animations)
```

---

## Fonctionnement

### Type de carte

Type enregistré : `widget:pomodoro` via `CardTypeRegistry`.

### Structure de données

```js
// card.data
{
    duration: 1500;
} // durée en secondes (25 min par défaut)
```

L'état du timer (temps restant, en cours/pause) est **en mémoire uniquement** — il n'est pas persisté. Un reload remet le timer à zéro.

### Hooks

| Hook                             | Direction | Rôle                                 |
| -------------------------------- | --------- | ------------------------------------ |
| `modal:addCard:opened`           | écoute    | Formulaire de création (choix durée) |
| `card:renderBody`                | écoute    | Rendu du widget dans la carte        |
| `modal:cardDetail:renderContent` | écoute    | Rendu en mode détail                 |
| `pomodoro:started`               | fournit   | Émis au démarrage du timer           |
| `pomodoro:completed`             | fournit   | Émis quand le timer atteint 0        |
| `pomodoro:paused`                | fournit   | Émis à la pause                      |

### Durées prédéfinies

5, 15, 25 et 45 minutes. Sélectionnables à la création.

### Widget

- Affichage MM:SS grand format
- Boutons play/pause et reset
- Animation pulse quand en cours
- Couleur verte quand terminé

---

## Comment modifier

### Styles

Les inputs du formulaire de création utilisent les classes CSS foundation (`.input`). Le fichier `styles.js` ne contient que les styles du widget (cercle timer, animations, couleurs d'état).

### Ajouter une durée personnalisée

Ajouter un champ `<input type="number">` dans `_buildPanel()` et l'utiliser comme valeur de `duration`.

### Persister l'état du timer

Sauvegarder `remainingSeconds` et `isRunning` dans `card.data` à chaque tick, et les restaurer dans `_renderWidget()`.
