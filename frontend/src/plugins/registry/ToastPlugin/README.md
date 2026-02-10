# ToastPlugin

Notifications toast automatiques pour les actions importantes. Découvre dynamiquement les hooks avec métadonnée `notification`.

---

## Architecture

```
ToastPlugin/
├── manifest.json      — Métadonnées (priority: 99), hooks fournis
├── index.js           — Point d'entrée (assemblePlugin)
├── ToastPlugin.js     — Logique principale (discovery, affichage, queue)
├── settingsPanel.js   — Enable/disable par événement, templates
└── styles.js          — Styles CSS (position, animations, types)
```

### Priorité 99

Le plugin est enregistré **en dernier** pour que tous les autres hooks `provides` soient déjà déclarés au moment de la découverte.

---

## Fonctionnement

### Découverte dynamique

À l'`install()`, le plugin parcourt `hookDefinitions` pour trouver tous les hooks ayant une métadonnée `notification`. Il s'abonne automatiquement à chacun.

### Types de toast

| Type      | Icône  | Couleur               |
| --------- | ------ | --------------------- |
| `success` | Vert   | Confirmation d'action |
| `error`   | Rouge  | Erreur                |
| `warning` | Orange | Avertissement         |
| `info`    | Bleu   | Information           |

### Interpolation de variables

Les templates supportent `{variable}` :

```json
{
    "template": "Note \"{title}\" créée",
    "variables": { "title": "note.displayTitle" }
}
```

Le plugin résout `note.displayTitle` depuis le payload du hook.

### Hooks fournis

| Hook          | Rôle                                |
| ------------- | ----------------------------------- |
| `toast:show`  | Affiche un toast programmatiquement |
| `toast:hide`  | Cache un toast spécifique           |
| `toast:clear` | Supprime tous les toasts            |

### Auto-dismiss

Les toasts disparaissent automatiquement après une durée configurable. Animation de sortie avant suppression du DOM.

### Persistence

IndexedDB — enable/disable par événement + templates personnalisés.

---

## Comment modifier

### Rendre un hook "toastable"

Ajouter une métadonnée `notification` dans la déclaration du hook (dans `hookDefinitions.js` ou dans le `manifest.json` du plugin qui fournit le hook) :

```json
"notification": {
    "type": "success",
    "template": "Action effectuée : {detail}",
    "variables": { "detail": "payload.fieldName" }
}
```

Le ToastPlugin le découvrira automatiquement.
