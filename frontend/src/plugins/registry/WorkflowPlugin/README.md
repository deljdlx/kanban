# WorkflowPlugin

Moteur de règles : automatise des actions quand des événements se produisent. Éditeur JavaScript intégré.

---

## Architecture

```
WorkflowPlugin/
├── manifest.json      — Métadonnées, hooks écoutés et fournis
├── index.js           — Point d'entrée (assemblePlugin)
├── WorkflowPlugin.js  — Logique principale (lifecycle, subscription)
├── triggerDefs.js     — Définitions des triggers disponibles
├── RuleEngine.js      — Compilation et exécution des règles
├── actionFactory.js   — API d'actions disponibles dans les règles
├── RuleListPanel.js   — UI liste des règles (onglet board settings)
├── RuleEditor.js      — UI éditeur de règle (CodeMirror)
└── styles.js          — Styles CSS (éditeur, liste)
```

### Flux de données

```
Événement hook (ex: card:moved)
    │
    ▼
WorkflowPlugin._onTrigger(hookName, payload)
    │
    ▼
RuleEngine.execute(rule.code, context)
    │  context = { payload, actions }
    │
    ▼
actionFactory fournit les actions :
    moveCard(), setCardColor(), removeCardColor(), toast(), log()
```

---

## Fonctionnement

### Hooks

| Hook                         | Direction | Rôle                                 |
| ---------------------------- | --------- | ------------------------------------ |
| `modal:boardSettings:opened` | écoute    | Enregistre l'onglet "Automatisation" |
| `workflow:ruleTriggered`     | fournit   | Émis quand une règle s'exécute       |
| `workflow:ruleError`         | fournit   | Émis quand une règle échoue          |

Le plugin s'abonne aussi dynamiquement à tous les hooks définis dans `triggerDefs.js`.

### Structure des règles

```js
// board.pluginData['workflow-engine']
[
    {
        id: 'rule-uuid',
        name: 'Colorier les cartes déplacées',
        trigger: 'card:moved',
        code: "actions.setCardColor(payload.card.id, 'rgba(0,255,0,0.3)');",
        enabled: true,
        lastError: null,
    },
];
```

### Exécution sandboxée

`RuleEngine` compile le code via `new Function()` en mode strict (`'use strict'`) avec un contexte limité (`ctx` + `actions` + `board`). Les objets `ctx` et `board` sont gelés (`Object.freeze`) pour empêcher les mutations accidentelles. Le mode strict empêche l'accès à `window` via `this`. Les erreurs sont catchées et stockées dans `_ruleErrors`.

### API d'actions (`actionFactory.js`)

| Action                        | Description                        |
| ----------------------------- | ---------------------------------- |
| `moveCard(cardId, columnId)`  | Déplace une carte vers une colonne |
| `setCardColor(cardId, color)` | Attribue une couleur à une carte   |
| `removeCardColor(cardId)`     | Supprime la couleur d'une carte    |
| `toast(message, type)`        | Affiche une notification toast     |
| `log(...args)`                | Log dans la console                |

### Éditeur

`RuleEditor.js` utilise CodeMirror (chargé dynamiquement) avec coloration JavaScript. L'éditeur affiche aussi la dernière erreur si elle existe.

---

## Comment modifier

### Ajouter un trigger

Dans `triggerDefs.js`, ajouter une entrée :

```js
{ hook: 'card:updated', label: 'Carte modifiée', description: '...' }
```

### Ajouter une action

Dans `actionFactory.js`, ajouter la méthode dans l'objet retourné :

```js
archiveCard(cardId) {
    // logique
}
```

L'action est immédiatement disponible dans le code des règles via `actions.archiveCard(id)`.

### Styles

Les boutons de l'UI (liste et éditeur) utilisent les classes CSS foundation de l'application (`.btn--primary`, `.btn--secondary`, `.btn--danger`, `.btn--sm`). Le fichier `styles.js` ne contient que les styles de layout spécifiques au plugin (liste, cartes de règles, éditeur CodeMirror).
