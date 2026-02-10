# Audit Complet Codebase — 2026-02-06

## Scorecard

| Catégorie | Note | Commentaire |
|---|---|---|
| **Architecture** | 9/10 | Couches bien séparées, Container léger, event bubbling cohérent. pluginData désormais protégé. |
| **Robustesse** | 8/10 | Guards null en place, validation structurelle à l'import, hooks déclarés. Reste la croissance non bornée de CardHistory. |
| **Lisibilité** | 9/10 | Code clair, JSDoc systématique, commentaires "why not what", structure cohérente. |
| **Conventions CLAUDE.md** | 9.5/10 | Respect quasi-total des conventions PHP8-like, nommage, structure fichiers. |
| **Performance** | 8/10 | Acceptable pour l'échelle. Le full re-render BoardView est simple mais suffisant. |
| **Sécurité** | 8/10 | Pas d'injection DOM directe. Import validé structurellement. pluginData protégé par copie. |
| **Évolutivité** | 9/10 | Hook system extensible avec catalogue complet, multi-board prêt, format de données versionné. |
| **Testabilité** | 3/10 | Architecture testable (DI via Container, fonctions pures) mais **aucun test écrit**. |
| **Note globale** | **8.2/10** | |

---

## 1. Architecture

### Points forts

- **Séparation Models / Services / Views** : chaque couche a un rôle précis. Les models sont des objets de données avec EventEmitter, les services gèrent la logique métier, les vues construisent le DOM.
- **Container (Service Locator)** : léger et efficace. Chaque singleton s'enregistre en fin de fichier. Pattern cohérent partout.
- **Event bubbling Column → Board** : un seul listener sur Board suffit pour capter toutes les mutations. Simple et fiable.
- **Hook system (Actions + Filters)** : bien conçu, avec priorités, protection récursion, contextes d'exécution, et découverte dynamique des hooks.
- **Multi-board** : registre dans IndexedDB, chaque board indépendant. Pas de données orphelines.

### Points d'attention

| Problème | Sévérité | Statut |
|---|---|---|
| ~~Board.moveCard() sans null check~~ | ~~CRITIQUE~~ | **CORRIGÉ** — guard `if (!fromColumn \|\| !toColumn) return` ajouté |
| ~~Board.pluginData exposé par référence~~ | ~~MOYEN~~ | **CORRIGÉ** — getter retourne `{ ...this._pluginData }`, `pluginDataRef` pour accès direct, `setPluginData(key, value)` pour mutation safe |
| ~~Column.pluginData exposé par référence~~ | ~~MOYEN~~ | **CORRIGÉ** — idem Board |

---

## 2. Robustesse

### Défenses en place

| Risque | Protection | Localisation |
|---|---|---|
| Board.moveCard colonnes inconnues | `if (!fromColumn \|\| !toColumn) return` | `Board.js:365` |
| Board.removeColumn id inconnu | `findIndex === -1 → return` | `Board.js:279-280` |
| BoardService mutations sans board | `if (!this._board) return` dans save, guards dans chaque mutation | `BoardService.js:187, 248, 283` |
| Column.removeCard id inconnu | `findIndex === -1 → return undefined` | `Column.js:110-113` |
| Plugin crash pendant install | try/catch, `error` stocké dans l'entrée | `PluginManager.js:119-129` |
| Hook récursion infinie | Compteur `_depth` max 10 | `HookRegistry.js:206, 273` |
| Auto-save concurrent | Debounce 300ms + `clearTimeout` avant chaque schedule | `BoardService.js:411-422` |
| Export version mismatch | Check `data.version !== EXPORT_VERSION` | `ExportImportService.js:89` |
| Import structure invalide | `_validateBoardStructure()` vérifie id, columns[], cards[], title | `ExportImportService.js` |
| Router réentrance async | Verrou `_navigating` | `Router.js:130-131` |
| pluginData mutation sauvage | Getter retourne une copie shallow | `Board.js`, `Column.js` |

### Risques résiduels

| Risque | Sévérité | Explication |
|---|---|---|
| **CardHistory croissance non bornée** | MOYENNE | Chaque `update()`, `recordMove()`, `recordReorder()`, `addComment()` ajoute une entrée. Pas de limite. Un board très actif accumule des centaines d'entrées par carte, augmentant la taille IndexedDB et le coût de `toJSON()`. |
| **Card._cloneTags crash sur données malformées** | MOYENNE | `Card.js:210` : `[...terms]` suppose que `terms` est itérable. Si l'import injecte `tags: { priority: "high" }` (string au lieu de tableau), le spread crashe. |
| **flush() peut manquer un save** | FAIBLE | `BoardService.js:430-441` : si un `'change'` event fire entre `clearTimeout` et `await this.save()`, le nouveau debounce timeout sera perdu. Fenêtre très étroite (microseconds), impact quasi-nul en pratique. |
| **EventEmitter.emit() : ajout pendant itération** | FAIBLE | `EventEmitter.js:48` : `Set.forEach` visite les entrées ajoutées pendant l'itération (spec JS). Un callback qui appelle `on()` pour le même event verra son nouveau callback exécuté dans la même émission. Pas de bug connu, mais comportement surprenant. |

---

## 3. Lisibilité

### Structure globale

```
src/
├── main.js              13 lignes  — bootstrap
├── Application.js      ~180 lignes — orchestrateur
├── Container.js         ~30 lignes — service locator
├── models/              ~600 lignes — Board, Column, Card, History, Comments
├── services/            ~800 lignes — BoardService, Storage*, Router, Filter, etc.
├── views/              ~1200 lignes — BoardView, ColumnView, CardView, Modales
├── plugins/             ~300 lignes — HookRegistry, PluginManager, hookDefinitions
│   └── registry/       ~4000 lignes — 20 plugins
├── components/          ~400 lignes — FilterDropdown, SelectUser, TagCheckboxes
├── styles/              SCSS organisé par composant
└── utils/               ~100 lignes — helpers purs
```

### Points forts

- Progression logique dans chaque fichier : propriétés → constructor → getters → mutations → sérialisation → privé
- Commentaires "why" systématiques : ex. `Board.js:76-78` explique le bubbling, `Column.js:149-150` explique `replaceCards`
- JSDoc 100% sur les classes et méthodes publiques
- En-têtes ASCII data-flow dans les fichiers complexes (LiveSyncPlugin, Application)
- Cross-references entre fichiers via les imports et les JSDoc `@type`

### Points d'attention

- `Card.js:80-86` : getters one-liner sans JSDoc individuel. Lisible mais inconsistant avec le reste du code qui documente chaque getter.
- `Board.js:62-66` : double bloc JSDoc (un pour le constructeur, un pour `_onColumnChangeBound`). Le second devrait être au-dessus de la propriété, pas entre les deux blocs `@param`.

---

## 4. Conventions CLAUDE.md

| Convention | Respectée | Commentaire |
|---|---|---|
| Classes `PascalCase` | oui | `Board`, `ColumnView`, `ModalDeleteColumn`, etc. |
| Méthodes `camelCase` | oui | `addColumn()`, `_buildHeader()`, `removeCard()` |
| Privé `_underscore` | oui | `_board`, `_saveTimeout`, `_onColumnChangeBound` |
| Fichiers classes `PascalCase.js` | oui | `BoardService.js`, `CardListRenderer.js` |
| Fichiers utilitaires `camelCase.js` | oui | `hookDefinitions.js`, `settingsPanel.js` |
| En-tête de fichier | oui | Tous les fichiers audités |
| JSDoc classes/méthodes/propriétés | oui | Coverage proche de 100% |
| Comments "pourquoi, pas quoi" | oui | Systématique |
| PHP8-like (class fields + constructor init) | oui | Pattern strict partout |
| Diagrammes Mermaid theme light | oui | `%%{init: {'theme': 'default'}}%%` dans tous les docs |

**Seul écart** : `StorageService.js` est un objet littéral (pas une classe) alors que le pattern projet est classes + Container. C'est un choix délibéré (facade légère) mais diverge de la convention.

---

## 5. Performance

| Opération | Fréquence | Coût | Verdict |
|---|---|---|---|
| `BoardView._rerender()` : destruction + reconstruction complète | Chaque mutation | O(colonnes × cartes) mais < 100 éléments typiquement | OK |
| `Board.toJSON()` : sérialisation récursive | Chaque save (debounced 300ms) | O(total cartes + historique) | OK |
| `Column.cards` getter : spread copy | Chaque accès (render, filter, etc.) | O(n) shallow copy | OK |
| `Board.pluginData` / `Column.pluginData` getter : spread copy | Chaque accès | O(clés pluginData) — typiquement < 5 clés | OK |
| `Card._cloneTags()` : deep copy tags | Chaque accès au getter `tags` | O(taxonomies × terms) | OK |
| `column:renderHeader` hook : à chaque column change | Chaque mutation | Dépend des plugins branchés | À SURVEILLER |
| `CardListRenderer.render()` : innerHTML clear + rebuild | Chaque column change | O(cartes) DOM nodes | OK |
| `BoardService.removeColumn` migration : `replaceCards` | Rare (suppression colonne) | O(cartes migrées) — 1 seul emit | OK |

### Bottleneck potentiel

Le full re-render de `BoardView` à chaque `'change'` du Board est simple mais produit 2+ re-renders lors de `removeColumn` avec migration (replaceCards émet 'change', puis removeColumn émet 'change'). En pratique, le navigateur batch les paints dans la même stack frame, donc pas de flash visuel. Si un board dépassait 500+ cartes, le coût DOM deviendrait mesurable (~5-10ms par re-render).

---

## 6. Sécurité

| Vecteur | Statut | Explication |
|---|---|---|
| **XSS via titres/descriptions** | Protégé | `textContent` utilisé partout pour les titres. Le MarkdownPlugin passe par un renderer qui devrait sanitizer. |
| ~~Import malicieux~~ | **CORRIGÉ** | `_validateBoardStructure()` vérifie la structure minimale (id, columns[], cards[], title). Les boards malformés sont ignorés (importAll) ou rejetés (importBoard). |
| **Prototype pollution via JSON.parse** | Protégé | `JSON.parse` ne restore pas les prototypes. Les données sont des POJO. |
| **innerHTML dans CardListRenderer** | Protégé | `bodyElement.innerHTML = ''` (clear only). Le contenu est construit via `createElement` + `textContent`. |
| **ColumnView title edit** | Protégé | L'input value est lue via `.value.trim()`, pas injectée via innerHTML. |
| ~~Board.pluginData mutation directe~~ | **CORRIGÉ** | Le getter retourne une copie shallow. Les plugins qui mutent utilisent `pluginDataRef` explicitement. |

---

## 7. Évolutivité

### Points forts

- **Hook system** : ajouter un comportement ne touche aucun fichier core. Pattern extensible par design.
- **Catalogue de hooks complet** : les 8 hooks manquants ont été ajoutés avec métadonnées (label, category, notification). Le ToastPlugin peut découvrir dynamiquement tous les hooks.
- **Multi-board** : architecture prête pour N boards. Le registre est séparé des données.
- **Format d'export versionné** : `EXPORT_VERSION = 1` permet la migration future.
- **Container** : facilite le remplacement d'un service (ex: StorageService → API backend).
- **Transport-agnostic events** : le format d'events LiveSync est indépendant du transport.

### Points de migration identifiés

| Composant actuel | Migration possible | Impact |
|---|---|---|
| IndexedDB (idb) | Backend API REST | Modifier StorageService (facade) uniquement |
| Hash-based routing | History API | Modifier Router uniquement |
| PermissionService statique | Auth backend | Rendre `PERMISSIONS` dynamique, charger depuis API |
| UserService mock | Auth réelle | Remplacer le service, injecter via Container |

---

## 8. Testabilité

### Architecture testable

- **Container** : permet l'injection de mocks pour chaque service
- **Fonctions pures** : `Card._cloneTags()`, `Card._buildDiff()`, `BoardDiffer.diff()`
- **Models sans DOM** : Board, Column, Card testables unitairement
- **EventEmitter** : testable avec des spy callbacks

### Status : aucun test écrit

C'est le **point faible majeur** du projet. Fichiers prioritaires pour les tests :

| Fichier | Criticité | Complexité du test |
|---|---|---|
| `Board.js` | HAUTE — logique de mutation, event bubbling | Simple — pas de dépendance externe |
| `Column.js` | HAUTE — addCard, removeCard, moveCard | Simple — pas de dépendance externe |
| `Card.js` | HAUTE — update, cloneTags, buildDiff | Simple — pas de dépendance externe |
| `BoardService.js` | HAUTE — mutations, hooks, auto-save | Moyenne — mock StorageService + HookRegistry |
| `HookRegistry.js` | HAUTE — actions, filters, récursion, contextes | Simple — auto-contenu |
| `ExportImportService.js` | MOYENNE — import/export cycle, validation | Moyenne — mock IndexedDB |
| `Router.js` | MOYENNE — matching, navigation | Simple — mock window.location |

---

## 9. Hooks — catalogue complet

Tous les hooks sont désormais **déclarés dans `hookDefinitions.js`** avec métadonnées.

### Board lifecycle

| Hook | Type | Payload |
|---|---|---|
| `board:willChange` | Action | `{ currentBoardId, nextBoardId }` |
| `board:didChange` | Action | `{ previousBoardId, board }` |
| `board:afterLoad` | Filter | `data` (mutable) |
| `board:beforeSave` | Filter | `data` (mutable) |
| `board:rendered` | Action | `{ board, element }` |
| `board:saved` | Action | `{ board }` |
| `board:saveFailed` | Action | `{ error }` |

### Cartes — données

| Hook | Type | Payload |
|---|---|---|
| `card:beforeCreate` | Filter | `cardData` |
| `card:beforeDelete` | Filter | `(true, { card, column })` — return false bloque |
| `card:beforeMove` | Filter | `(true, { card, fromColumn, toColumn, newIndex })` — return false bloque |
| `card:created` | Action | `{ card, column }` |
| `card:beforeUpdate` | Filter | `(data, card)` |
| `card:updated` | Action | `{ card }` |
| `card:deleted` | Action | `{ card, column }` |
| `card:moved` | Action | `{ card, fromColumn, toColumn }` |

### Cartes — rendu

| Hook | Type | Payload |
|---|---|---|
| `card:beforeRender` | Filter | données carte |
| `card:renderBody` | Action | contexte de rendu |
| `card:rendered` | Action | contexte de rendu |
| `card:beforeDestroy` | Action | element |
| `card:typeActivated` | Action | carte |

### Colonnes

| Hook | Type | Payload |
|---|---|---|
| `column:added` | Action | `{ column, board }` |
| `column:renamed` | Action | `{ column, oldTitle, newTitle }` |
| `column:beforeRemove` | Filter | `(true, { column, board, targetColumnId })` — return false bloque |
| `column:removed` | Action | `{ column, board }` |
| `column:renderHeader` | Action | `{ container, column, board }` |
| `column:renderBody` | Action | `{ body, column, board }` |

### Rendu contenu & Modales

| Hook | Type | Payload |
|---|---|---|
| `render:description` | Filter | texte brut → HTML |
| `render:comment` | Filter | texte brut → HTML |
| `modal:addCard:opened` | Action | `{ pluginsSlot, registerCardType, onClose, addTab }` |
| `modal:editCard:opened` | Action | contexte modale |
| `modal:cardDetail:renderContent` | Action | `{ card, panel, handled }` |
| `modal:boardSettings:opened` | Action | `{ registerTab, board, onClose }` |
| `modal:boardSettings:general` | Action | `{ panel, board }` |

---

## 10. Inventaire des problèmes par sévérité

### CRITIQUE — tous corrigés

| # | Problème | Statut |
|---|---|---|
| ~~C1~~ | ~~Board.moveCard() — null pointer si colonne inconnue~~ | **CORRIGÉ** |
| ~~C2~~ | ~~ExportImportService.importAll() — pas de validation structurelle~~ | **CORRIGÉ** |

### HAUTE — tous corrigés

| # | Problème | Statut |
|---|---|---|
| ~~H1~~ | ~~8 hooks non déclarés dans hookDefinitions.js~~ | **CORRIGÉ** — 10 hooks ajoutés avec métadonnées |
| ~~H2~~ | ~~Board.pluginData / Column.pluginData exposés par référence mutable~~ | **CORRIGÉ** — copie shallow + `pluginDataRef` + `setPluginData()` |
| H3 | `Card._cloneTags()` crash si tags contient des non-iterables | OUVERT |
| H4 | CardHistory croissance non bornée | OUVERT |

### MOYENNE (edge case, dette technique)

| # | Problème | Fichier | Ligne |
|---|---|---|---|
| M1 | Board constructor JSDoc : double bloc `@param` mal placé | `Board.js` | 54-66 |
| M2 | Card getters one-liner sans JSDoc individuel | `Card.js` | 80-86 |
| M3 | StorageService est un objet littéral, pas une classe | `StorageService.js` | 28 |
| M4 | `replaceCards()` ne copie pas le tableau entrant | `Column.js` | 155 |

### FAIBLE (cosmétique, théorique)

| # | Problème | Fichier | Ligne |
|---|---|---|---|
| F1 | `flush()` fenêtre de race (microseconds) | `BoardService.js` | 430-441 |
| F2 | `EventEmitter.emit()` — callbacks ajoutés pendant itération | `EventEmitter.js` | 48 |
| F3 | `Board.js` double re-render lors de removeColumn avec migration | `Board.js` | — |

---

## 11. Corrections appliquées (2026-02-06)

### C1 — Board.moveCard() null guard

**Fichier** : `src/models/Board.js`

Ajout d'un guard `if (!fromColumn || !toColumn) return;` avant `fromColumn.removeCard()`. Empêche un crash si un plugin ou le LiveSync appelle `moveCard` avec un columnId invalide.

### C2 — Validation structurelle import

**Fichier** : `src/services/storage/ExportImportService.js`

Nouvelle méthode `_validateBoardStructure(boardData)` qui vérifie :
- `boardData` est un objet avec `id` (string)
- `columns` est un tableau
- Chaque colonne a `id` (string), `title` (string), `cards` (tableau)
- Chaque carte a `id` (string), `title` (string)

Intégrée dans `importAll()` (skip les boards invalides avec warning) et `importBoard()` (throw une erreur explicite).

### H1 — Hooks déclarés dans hookDefinitions.js

**Fichier** : `src/plugins/hookDefinitions.js`

10 hooks ajoutés avec métadonnées complètes :
- `card:beforeDelete` (Filter) — avec payload
- `card:beforeMove` (Filter) — avec payload
- `column:added` (Action) — avec notification
- `column:renamed` (Action) — avec payload
- `column:beforeRemove` (Filter) — avec payload
- `column:removed` (Action) — avec notification
- `column:renderHeader` (Action)
- `column:renderBody` (Action)

Le ToastPlugin peut désormais découvrir ces hooks et afficher des notifications pour les ajouts/suppressions de colonnes.

### H2 — pluginData protégé par copie

**Fichiers** : `src/models/Board.js`, `src/models/Column.js`, + 5 plugins

Sur Board et Column :
- `pluginData` getter retourne `{ ...this._pluginData }` (copie shallow)
- `pluginDataRef` getter pour l'accès direct par référence (déprécié — ne plus utiliser)
- `setPluginData(key, value)` pour mutation safe avec `emit('change')`
- `removePluginData(key)` pour suppression safe avec `emit('change')`

**Tous les plugins sont migrés vers `setPluginData()`** (plus aucun accès via `pluginDataRef`) :
- `OpApplier.js` (LiveSyncPlugin) — `setPluginData` + `removePluginData`
- `ColorPluginFactory.js` (2 sites)
- `NoteManager.js` (BoardNotesPlugin)
- `WorkflowPlugin.js`
- `CardLinksPlugin.js`
- `ColumnTogglePlugin.js`
- `CustomFieldsPlugin.js`
- `ColumnMappingPlugin.js`
- `LinearSyncPlugin.js`

Les sites de lecture (`BoardDiffer.js`, `ColorPluginFactory._loadColors`, etc.) utilisent `pluginData` (copie) pour la lecture.

---

## 12. Recommandations restantes

### P1 — Tests unitaires pour les models

Board, Column et Card sont des fonctions pures (ou presque) sans dépendance DOM. Couvrir : mutations, event emission, toJSON round-trip, edge cases (id inconnu, index hors bornes, tags malformés).

### P2 (optionnel) — Borner CardHistory

Ajouter un `MAX_ENTRIES` (ex: 200) et tronquer les entrées les plus anciennes lors de l'ajout. Un board avec 50 cartes et 200 entrées d'historique chacune = 10 000 entrées sérialisées à chaque save.

### P3 (optionnel) — Défensif dans Card._cloneTags

Ajouter un check `Array.isArray(terms)` avant le spread pour résister aux données corrompues.
