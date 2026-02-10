# Tooling — Qualite de code

Outils de lint, formatage et hooks git du projet Kanban.

---

## Vue d'ensemble

| Outil | Role | Config |
|---|---|---|
| **ESLint** | Detecte les erreurs JS (variables mortes, `==` au lieu de `===`, etc.) | `eslint.config.js` |
| **Prettier** | Formatage automatique (indentation, quotes, virgules) | `.prettierrc` |
| **EditorConfig** | Conventions editeur (charset, indentation, newlines) | `.editorconfig` |
| **Husky** | Git hooks automatiques | `.husky/pre-commit` |
| **lint-staged** | Execute ESLint + Prettier uniquement sur les fichiers stages | `package.json` > `lint-staged` |

---

## Commandes

### Lint (ESLint)

```bash
# Verifier tout le projet (erreurs + warnings)
npm run lint

# Corriger automatiquement ce qui peut l'etre
npm run lint:fix
```

ESLint ne corrige que les erreurs auto-fixables (ex: `prefer-const`). Les erreurs logiques (variables non utilisees, `===`) doivent etre corrigees manuellement.

### Format (Prettier)

```bash
# Formater tout le projet
npm run format

# Verifier sans modifier (utile en CI)
npm run format:check
```

### Tests

```bash
# Mode watch (relance a chaque modif)
npm test

# Execution unique
npm run test:run

# Avec couverture
npm run test:coverage
```

---

## Pre-commit hook

A chaque `git commit`, le hook pre-commit lance automatiquement :

1. **ESLint --fix** sur les fichiers `.js` stages
2. **Prettier --write** sur les fichiers `.js`, `.scss`, `.json`, `.md` stages

Si ESLint trouve des erreurs non auto-fixables, le commit est **bloque**. Il faut corriger et re-stager.

### Contourner le hook (cas exceptionnels)

```bash
git commit --no-verify -m "message"
```

A utiliser uniquement pour les commits urgents — les erreurs devront etre corrigees au prochain commit.

---

## Regles ESLint

Philosophie : **detecter les erreurs, pas imposer un style** (le style est gere par Prettier).

### Erreurs (bloquantes)

| Regle | Description |
|---|---|
| `eqeqeq` | `===` obligatoire (sauf `!= null` avec commentaire eslint-disable) |
| `no-var` | `let` / `const` obligatoire |
| `no-undef` | Variables non declarees interdites |

### Warnings (non bloquants)

| Regle | Description |
|---|---|
| `no-unused-vars` | Variables/imports non utilises (ignore les `_prefixes`) |
| `no-console` | `console.log` deconseille (`console.warn`/`console.error` OK) |
| `prefer-const` | Utiliser `const` si la variable n'est pas reassignee |

### Desactiver une regle ponctuellement

```js
// eslint-disable-next-line no-console -- Debug temporaire
console.log('debug:', value);
```

Toujours ajouter un commentaire `--` expliquant pourquoi.

---

## Config Prettier

```json
{
    "singleQuote": true,
    "tabWidth": 4,
    "trailingComma": "all",
    "printWidth": 120,
    "semi": true,
    "endOfLine": "lf"
}
```

| Option | Valeur | Raison |
|---|---|---|
| `singleQuote` | `true` | Convention du projet |
| `tabWidth` | `4` | Lisibilite (PHP-like) |
| `trailingComma` | `all` | Diffs git plus propres |
| `printWidth` | `120` | Ecrans larges, evite les retours a la ligne forcess |
| `endOfLine` | `lf` | Unix-style (pas de `\r\n` Windows) |

---

## EditorConfig

Le fichier `.editorconfig` garantit que tous les editeurs (VS Code, WebStorm, Vim, etc.) utilisent les memes conventions :

- Indentation : 4 espaces (2 pour JSON/YAML)
- Charset : UTF-8
- Fin de ligne : LF
- Newline finale : oui
- Trailing whitespace : supprime (sauf Markdown)

VS Code supporte EditorConfig nativement. Pour les autres editeurs, installer le plugin EditorConfig.

---

## Formatage progressif

Le projet existait avant l'ajout de Prettier. Pour eviter de polluer le `git blame` avec un commit massif de reformatage, le formatage se fait **progressivement** :

- Le hook pre-commit formate les fichiers a chaque commit
- A terme, tous les fichiers seront formates
- Si besoin d'un formatage global : `npm run format` puis commit dedie

---

## Tests (Vitest)

### Configuration

| Option | Valeur | Raison |
|---|---|---|
| `environment` | `happy-dom` | Simule le DOM pour les tests de composants sans navigateur |
| `globals` | `true` | `describe`, `it`, `expect` disponibles sans import (mais on importe quand meme pour la clarte) |
| `include` | `src/**/*.test.js` | Convention co-location : le test vit a cote de son fichier source |
| `coverage.provider` | `v8` | Couverture native via V8, rapide et sans instrumentation |
| `coverage.include` | `src/models/**`, `src/services/**` | Focus couverture sur la logique metier (pas les vues ni les plugins) |

Fichier de config : `vitest.config.js`.

### Conventions

**Nommage** : `MonModule.test.js` a cote de `MonModule.js`.

**Structure d'un fichier test** :

```js
/**
 * Tests unitaires — MonModule (description courte).
 *
 * Pourquoi on teste ca : explication de la strategie de test,
 * des edge cases couverts et des choix faits.
 */
import { describe, it, expect } from 'vitest';
import MonModule from './MonModule.js';

// ---------------------------------------------------------------
// Section — commentaire expliquant ce qu'on verifie et pourquoi
// ---------------------------------------------------------------

describe('MonModule — section', () => {
    it('fait quelque chose de precis', () => {
        expect(...).toBe(...);
    });
});
```

**Regles** :
- Noms de `describe` et `it` en francais, descriptifs
- Un commentaire d'en-tete expliquant la strategie de test du fichier
- Un commentaire par section (separateur `// ---`) expliquant le pourquoi
- Helpers (`makeCard()`, `makeComment()`) en haut du fichier pour eviter la duplication
- Pas de commentaires inline dans les `it` sauf cas non evident

### Etat de couverture

| Couche | Fichiers testes | Observations |
|---|---|---|
| **Models** | Card, Board, Column, Comment, HistoryEntry, CardHistory, CardComments | 100% des modeles couverts |
| **Plugin infra** | HookRegistry, PluginManager, PluginAssembler | Core couvert |
| **Plugins** | BoardDiffer (LiveSync), CardLinksPlugin | 2 plugins sur 27 |
| **Utils** | file, color, date | Fonctions pures couvertes |
| **Services** | — | Non teste (IndexedDB necessite des mocks) |
| **Views** | — | Non teste (DOM intensif, faible ROI unitaire) |

Pour ajouter des tests : creer `MonFichier.test.js` a cote du source, il sera detecte automatiquement.

---

## Ajouter une globale navigateur

Si ESLint signale `'MaGlobale' is not defined` pour une API navigateur valide, l'ajouter dans `eslint.config.js` :

```js
globals: {
    // ...existantes...
    MaGlobale: 'readonly',
},
```
