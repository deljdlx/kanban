# AnimationPlugin

Anime quatre aspects de l'interface via [anime.js](https://animejs.com/) :

1. **Modales** — entrée et sortie animées (backdrop + panneau)
2. **Drop de carte** — effet visuel au déplacement inter-colonne
3. **Entrée des colonnes** — stagger à l'ouverture d'un board
4. **Entrée des cartes** — stagger colonne par colonne après les colonnes

Tous les effets sont configurables via le panneau de settings (4 selects + bouton réinitialiser).

---

## Architecture

```
AnimationPlugin/
├── manifest.json      — Métadonnées, hooks écoutés
├── index.js           — Point d'entrée (assemblePlugin)
├── AnimationPlugin.js — Logique principale (détection, animation, persistence)
├── effects.js         — Registres d'effets (données pures, pas de logique)
├── settingsPanel.js   — Construction du panneau de settings (DOM)
├── styles.js          — Styles CSS injectés
└── README.md          — Ce fichier
```

### Flux de données

```
effects.js (registres)
    ↓ importés par
AnimationPlugin.js (logique)
    ↑ lu par                    ↑ appelé par
settingsPanel.js (UI) ──────────┘
```

Le settings panel lit les propriétés `_current*` du plugin pour afficher la valeur active, et appelle les setters publics (`setEffect()`, `setCardDropEffect()`, etc.) au changement.

---

## Registres d'effets (effects.js)

Chaque registre est un objet dont les clés sont les noms d'effets et les valeurs sont des configs anime.js. Le fichier exporte aussi les constantes `DEFAULT_*` utilisées comme valeur initiale.

| Registre               | Déclencheur                         | Structure d'un effet                        |
| ---------------------- | ----------------------------------- | ------------------------------------------- |
| `EFFECTS`              | MutationObserver (`.modal-overlay`) | `{ label, enter: {...}, exit: {...} }`      |
| `CARD_DROP_EFFECTS`    | Hook `card:moved`                   | `{ label, animation: {...} }`               |
| `COLUMN_ENTER_EFFECTS` | Hook `board:displayed`              | `{ label, animation: {...}, staggerDelay }` |
| `CARD_ENTER_EFFECTS`   | Hook `board:displayed`              | `{ label, animation: {...}, staggerDelay }` |

### Ajouter un effet

Ajouter une entrée dans le registre concerné dans `effects.js`. L'effet apparaît automatiquement dans le `<select>` du panneau de settings.

**Exemple — ajouter un effet "Spirale" aux colonnes :**

```js
// Dans COLUMN_ENTER_EFFECTS
spiral: {
    label: 'Spirale',
    animation: {
        opacity: [0, 1],
        rotate: [180, 0],
        scale: [0.5, 1],
        duration: 500,
        ease: 'outQuart',
    },
    staggerDelay: 100,
},
```

**Exemple — ajouter un effet modal :**

Un effet modal nécessite `enter` ET `exit` (animation inverse) :

```js
// Dans EFFECTS
'slide-right': {
    label: 'Glissement droite',
    enter: {
        opacity: [0, 1],
        translateX: [-40, 0],
        duration: ENTER_DURATION,
        ease: 'outQuart',
    },
    exit: {
        opacity: [1, 0],
        translateX: [0, -40],
        duration: EXIT_DURATION,
        ease: 'inQuart',
    },
},
```

> **Important** : ne pas définir de callbacks (`onComplete`, etc.) dans les registres. Le plugin les ajoute au moment de l'animation via spread (`{ ...effect.animation, onComplete: ... }`).

### Propriétés anime.js courantes

| Propriété    | Exemple      | Description                                                                   |
| ------------ | ------------ | ----------------------------------------------------------------------------- |
| `opacity`    | `[0, 1]`     | Fondu (from, to)                                                              |
| `scale`      | `[0.7, 1]`   | Zoom                                                                          |
| `translateY` | `[40, 0]`    | Décalage vertical (px)                                                        |
| `translateX` | `[60, 0]`    | Décalage horizontal (px)                                                      |
| `rotate`     | `[180, 0]`   | Rotation (deg)                                                                |
| `rotateX`    | `[90, 0]`    | Rotation 3D axe X                                                             |
| `duration`   | `400`        | Durée en ms                                                                   |
| `ease`       | `'outQuart'` | Courbe d'easing ([liste](https://animejs.com/documentation/#pennerFunctions)) |

---

## Mécanismes d'animation (AnimationPlugin.js)

### 1. Modales — MutationObserver

Le plugin observe `document.body` en `childList`. Quand un `.modal-overlay` apparaît :

1. Cache immédiatement le backdrop et le panneau (`opacity: 0`)
2. `setTimeout(10)` — attend le premier paint du navigateur
3. Anime le backdrop (fade) et le panneau (effet configurable) en parallèle
4. `onComplete` : retire les styles inline pour redonner le contrôle au CSS

**Sortie** : `overlay.remove()` est patché pour jouer l'animation inverse avant de retirer l'élément du DOM. Un `setTimeout` de sécurité appelle `originalRemove()` si `onComplete` ne fire pas.

### 2. Drop de carte — Hook `card:moved`

Quand une carte est déplacée entre colonnes, le plugin retrouve son élément DOM par `data-id` et lance l'animation configurée.

### 3. Entrée de board — Hook `board:displayed`

L'animation ne joue qu'au **premier affichage** du board (navigation) via le hook `board:displayed`. Les re-renders (card move, card add, column reorder…) ne déclenchent que `board:rendered`, pas `board:displayed`.

Animation en deux phases séquentielles :

```
board:displayed
    │
    ▼
Phase 1 : colonnes (.column) en stagger
    │  delay: stagger(colEffect.staggerDelay)
    │  onComplete ──▶ cleanup styles inline colonnes
    │
    ▼
Phase 2 : cartes (.card) en stagger
    │  delay: stagger(cardEffect.staggerDelay)
    │  onComplete ──▶ cleanup styles inline cartes
    ▼
  Terminé
```

Les cartes sont collectées colonne par colonne (`.column-body > .card`) pour un stagger naturel : toutes les cartes de la colonne 1, puis colonne 2, etc.

Si l'effet colonnes est "Aucun", la phase 1 est sautée et les cartes s'animent directement. Même logique si l'effet cartes est "Aucun". Si les deux sont "Aucun", le handler retourne immédiatement.

### Pourquoi setTimeout(10) ?

anime.js ne tick pas quand l'animation est créée dans un callback synchrone (MutationObserver ou hook) avant le premier paint du navigateur. Le `setTimeout(10)` pousse l'exécution après le paint.

---

## Persistence (IndexedDB)

Les settings sont stockés dans IndexedDB sous la clé `kanban:modal-animation` via `StorageService`. La sauvegarde est **debounced (300ms)** pour éviter les écritures excessives pendant les changements rapides.

**Format actuel :**

```json
{
    "modalEffect": "pop",
    "cardDropEffect": "none",
    "columnEnterEffect": "cascade",
    "cardEnterEffect": "cascade"
}
```

**Migrations gérées dans `_loadSettings()` :**

| Format détecté                                                    | Action                                                                  |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `string` (ex: `'pop'`)                                            | Ancien format v1 : appliqué comme `modalEffect`, re-sauvegardé en objet |
| `{ boardEnterEffect }` sans `columnEnterEffect`/`cardEnterEffect` | Ancien format v2 : dupliqué vers les deux nouveaux champs               |
| Objet avec les 4 clés                                             | Format courant, chargé directement                                      |

---

## Settings panel (settingsPanel.js)

Construit 4 `<select>` + 1 bouton réinitialiser. Chaque select est alimenté par `Object.entries()` sur le registre correspondant.

### Ajouter un nouveau select

Suivre le pattern existant (label → select → note) :

```js
// 1. Importer le registre et la valeur par défaut depuis effects.js
import { MY_EFFECTS, DEFAULT_MY_EFFECT } from './effects.js';

// 2. Créer label + select + note (copier un bloc existant)

// 3. Lire la valeur : mySelect.value = plugin._currentMyEffect;

// 4. Sur change : plugin.setMyEffect(mySelect.value);

// 5. Dans le reset : plugin.setMyEffect(DEFAULT_MY_EFFECT);
//                    mySelect.value = DEFAULT_MY_EFFECT;
```

---

## Checklist pour modifier le plugin

### Ajouter un effet à un registre existant

1. Ajouter l'entrée dans le registre dans `effects.js`
2. Vérifier : `npx eslint src/plugins/registry/AnimationPlugin/effects.js`
3. Tester dans le navigateur

### Ajouter une nouvelle catégorie d'animation

1. **effects.js** — Créer le registre `MY_EFFECTS`, la constante `DEFAULT_MY_EFFECT`
2. **AnimationPlugin.js** :
    - Importer le nouveau registre
    - Ajouter la propriété `_currentMyEffect`
    - Ajouter le setter public `setMyEffect(name)`
    - Mettre à jour `_loadSettings()` et `_saveSettings()`
    - Ajouter le hook listener dans `install()` et `uninstall()`
    - Écrire le handler d'animation
3. **settingsPanel.js** — Ajouter le select (label + select + note + reset)
4. **manifest.json** — Ajouter le hook dans `listens` si nouveau hook
5. Vérifier : `npx eslint src/plugins/registry/AnimationPlugin/*.js`
