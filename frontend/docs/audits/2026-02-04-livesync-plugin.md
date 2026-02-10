# Audit LiveSyncPlugin — 2026-02-04

## Scorecard

| Catégorie | Note | Commentaire |
|---|---|---|
| **Architecture** | 9/10 | Séparation des préoccupations exemplaire, pattern producteur/consommateur clair |
| **Robustesse** | 8.5/10 | Défenses solides, quelques edge cases inhérents à localStorage |
| **Lisibilité** | 9/10 | Structuration par sections, ASCII diagram, cross-refs, comments "why not what" |
| **Conventions CLAUDE.md** | 10/10 | Respect strict de toutes les conventions |
| **Performance** | 8/10 | Acceptable pour l'échelle actuelle, `JSON.stringify` poll-side à surveiller si scale |
| **Sécurité** | 9/10 | Pas de vecteur d'injection, données confinées à l'origine localStorage |
| **Évolutivité** | 9/10 | Migration backend préparée, format d'events transport-agnostic |
| **Testabilité** | 7/10 | BoardDiffer trivialement testable, LiveSyncPlugin testable avec mocks mais aucun test écrit |
| **Note globale** | **8.6/10** | |

---

## 1. Architecture

### Structure des fichiers

```
LiveSyncPlugin/
  ├── LiveSyncPlugin.js   635 lignes — orchestration (producteur, consommateur, fallback)
  ├── BoardDiffer.js       118 lignes — fonction pure, aucun side effect
  ├── settingsPanel.js      60 lignes — UI seulement
  ├── manifest.json         10 lignes — métadonnées
  └── index.js              13 lignes — assembleur standard
```

**Points forts :**

- Responsabilité unique par fichier. `BoardDiffer` est une fonction pure réutilisable. `settingsPanel` ne touche que le DOM. `LiveSyncPlugin` orchestre.
- Le pattern producteur/consommateur est explicite dans les noms de sections et dans le diagramme ASCII du header.
- L'event log est un format intermédiaire découplé du transport (localStorage aujourd'hui, HTTP/WS demain).
- Les modifications du core sont minimales et génériques : `removeColumn`, `reorderColumns`, `replaceCards`, `pauseAutoSave/resumeAutoSave` sont des méthodes utiles au-delà de ce seul plugin.

**Points d'attention :**

- Le plugin accède directement à `Container.get('BoardService')` dans 5 méthodes différentes (`_onBoardRendered`, `_onBoardSaved`, `_applyOp`, `_applyEntries`, `_fallbackSnapshotDiff`). C'est cohérent avec le pattern Container du projet, mais crée un couplage implicite. Un `this._boardService` injecté au `install()` serait plus explicite — mais ce serait un changement de convention pour l'ensemble du projet, pas un problème isolé.
- Le `column:add` dans le differ inclut un champ `index` (ligne 84 de BoardDiffer.js) qui n'est **pas utilisé** par `_applyOp` (la colonne est ajoutée en fin via `board.addColumn()`, puis `column:reorder` la repositionne). Ce champ est informatif et prépare un futur `addColumn(col, index)`, mais pourrait surprendre un lecteur qui cherche son utilisation.

---

## 2. Robustesse

### Défenses en place

| Risque | Protection | Localisation |
|---|---|---|
| Poll avant init | `if (!_previousSnapshot) return` | `_poll()` L336 |
| Tab caché | `if (document.hidden) return` | `_poll()` L338 |
| Changements locaux non sauvés | `if (this._isDirty()) return` | `_poll()` L339 |
| Boucle save→poll→save | `pauseAutoSave()` / `resumeAutoSave()` | `_applyEntries` L374-382, `_fallbackSnapshotDiff` L553-558 |
| Op malformée | Per-op try/catch | `_applyOps` L416-422 |
| Ops non-itérable | `if (!Array.isArray(ops)) return` | `_applyOps` L414 |
| JSON corrompu dans localStorage | try/catch + validation de structure | `_readEventLog` L586-604 |
| localStorage plein / indisponible | try/catch sur setItem | `_appendEvents` L307-311, `_saveSettings` L203-207 |
| Fallbacks concurrents | `_fallbackInProgress` boolean guard | `_poll` L354, `_fallbackSnapshotDiff` L515/569 |
| Uninstall pendant async | `_hooksRegistry?.` optional chaining | `_fallbackSnapshotDiff` L540, L565 |
| État bloqué après erreur | `finally` blocks avancent `_lastKnownRev` + `_previousSnapshot` | `_applyEntries` L381-390, `_fallbackSnapshotDiff` L557-560 |
| Référence partagée pluginData | `_cloneSnapshot()` via JSON round-trip | Tous les points de stockage |
| Snapshot sans `board:afterLoad` | `applyFilters('board:afterLoad', ...)` | `_fallbackSnapshotDiff` L540 |
| Setting invalide | Validation contre `POLL_OPTIONS` whitelist | `_loadSettings` L188 |

### Risques résiduels (inhérents, non fixables sans changement d'archi)

| Risque | Sévérité | Explication |
|---|---|---|
| **Race condition read-modify-write** | FAIBLE | Deux onglets font `_appendEvents` simultanément. Tab A lit le log (rev 5), Tab B lit le log (rev 5), les deux incrémentent à 6. L'un écrase l'écriture de l'autre → un set d'ops est perdu. L'onglet consommateur fera un fallback snapshot diff au prochain cycle. Inhérent à localStorage (pas d'opérations atomiques). Impact réel : quasi-nul en pratique car les saves sont debounced (300ms) et les écritures prennent <1ms. |
| **Collision `_tabId`** | NÉGLIGEABLE | 8 caractères de UUID v4 = ~4 milliards de combinaisons. Collision entre 2-3 onglets du même utilisateur : probabilité ~0. |
| **`board:rendered` multiple** | FAIBLE | Si le hook fire plusieurs fois (hot reload, navigation), `_previousSnapshot` et `_lastKnownRev` sont recalibrés. Des events intermédiaires pourraient être skippés. Comportement correct dans ce cas (on se resync sur l'état actuel). |
| **Perte de précision `Date.now()`** | NÉGLIGEABLE | Les timestamps sont comparés avec LOG_MAX_AGE (30s). Une imprécision de quelques ms est sans conséquence. |

---

## 3. Lisibilité

### Structure interne de LiveSyncPlugin.js

```
Constantes       (L26-53)     — 28 lignes
Propriétés       (L61-122)    — 62 lignes
Lifecycle        (L124-172)   — 48 lignes   install / uninstall
Settings         (L174-208)   — 34 lignes   _loadSettings / _saveSettings
Polling (timer)  (L210-232)   — 22 lignes   _startPolling / restartPolling
Initialisation   (L234-253)   — 19 lignes   _onBoardRendered
Producteur       (L255-312)   — 57 lignes   _onBoardSaved / _appendEvents
Consommateur     (L314-398)   — 84 lignes   _poll / _applyEntries
Application ops  (L400-501)   — 101 lignes  _applyOps / _applyOp (switch)
Fallback         (L503-571)   — 68 lignes   _fallbackSnapshotDiff
Utilitaires      (L573-634)   — 61 lignes   _readEventLog / _isDirty / _cloneSnapshot
```

**Points forts :**

- Progression logique top-to-bottom : lifecycle → config → init → production → consommation → application → recovery → utils
- Diagramme ASCII data-flow dans le header (L8-16) — on comprend l'architecture en 10 secondes
- Flow chart ASCII dans `_poll()` (L321-328) — on comprend la logique de décision sans lire le code
- Cross-références `@see` entre `BoardDiffer.diff()` et `_applyOp()` dans les deux sens
- Commentaires "why" : `// Emit manuel nécessaire : board.pluginData est un objet plain...` (L456-459), `// Spread op.column pour ne pas perdre de futurs champs...` (L465-467)
- Le commentaire sur la direction du diff dans le fallback (L542-543) prévient la confusion

**Points d'attention :**

- La méthode `_fallbackSnapshotDiff` (68 lignes) est la plus longue et la plus dense. Elle combine : lecture du log, await loadSnapshot, filtrage afterLoad, diff, pauseAutoSave, apply, resume, notification. C'est le prix de la robustesse (try/finally imbriqués). La lisibilité reste correcte grâce aux commentaires, mais c'est la partie qu'un newcomer relira le plus.
- Deux blocs de code dupliqués dans `_fallbackSnapshotDiff` (L548-549 et L559-560) pour `_lastKnownRev` + `_previousSnapshot`. C'est la conséquence de l'early return (ops.length === 0) qui diverge du chemin principal. Correct mais visuellement redondant.

### BoardDiffer.js

- Structure limpide : 3 sections numérotées (scalaires → pluginData → colonnes)
- La granularité est documentée dans le header (L7-11)
- Le choix `null` vs `undefined` pour les suppressions est documenté (L56)
- Le commentaire sur le reorder émis systématiquement (L88-92) prévient la question "pourquoi un reorder quand il y a un add ?"

### settingsPanel.js

- Structuré par sections visuelles (Label, Select, Description, Handler)
- Simple et lisible. Aucune complexité cachée.

---

## 4. Conventions CLAUDE.md

| Convention | Respectée | Exemples |
|---|---|---|
| Classes `PascalCase` | oui | `LiveSyncPlugin`, `BoardDiffer` |
| Méthodes `camelCase` | oui | `_applyOps`, `_onBoardSaved`, `restartPolling` |
| Privé `_underscore` | oui | `_pollInterval`, `_tabId`, `_previousSnapshot` |
| Fichiers classes `PascalCase.js` | oui | `LiveSyncPlugin.js`, `BoardDiffer.js` |
| Fichiers utilitaires `camelCase.js` | oui | `settingsPanel.js` |
| En-tête de fichier | oui | Tous les 5 fichiers |
| ASCII schema pour relations complexes | oui | Data-flow diagram L8-16, flow chart `_poll` L321-328 |
| JSDoc classes/méthodes/propriétés | oui | 100% coverage |
| Comments "pourquoi, pas quoi" | oui | Quasi-systématique |
| PHP8-like style (constructor init) | oui | Class fields avec valeurs par défaut |

---

## 5. Performance

| Opération | Fréquence | Coût estimé | Verdict |
|---|---|---|---|
| `_isDirty()` : double `JSON.stringify` | Chaque poll (3s) | ~0.5ms pour un board de 200 cartes | OK |
| `_readEventLog()` : `JSON.parse` | Chaque poll | ~0.1ms (log compact, max ~30s d'entries) | OK |
| `_cloneSnapshot()` : JSON round-trip | Chaque save + chaque apply | ~0.5ms | OK |
| `diff()` : `JSON.stringify` par colonne | Chaque save | ~0.3ms | OK |
| `Container.get('BoardService')` | Chaque `_applyOp` dans la boucle | Map.get, ~0.001ms | OK |
| Compaction `filter()` | Chaque `_appendEvents` | O(n) sur entries, n < 10 typiquement | OK |

**Bottleneck potentiel à grande échelle :** Si le board dépasse 1000+ cartes, les `JSON.stringify` dans `_isDirty()` et `diff()` pourraient dépasser 5ms. Pour l'usage actuel (Kanban personnel, dizaines de cartes), aucun problème. Pour un usage collaboratif multi-utilisateurs avec des boards massifs, il faudrait un dirty flag event-based plutôt qu'un stringify compare.

**Optimisation non faite mais acceptable :** `document.hidden` est checké avant `_isDirty()` — c'est le bon ordre (cheap check first).

---

## 6. Sécurité

| Vecteur | Statut | Explication |
|---|---|---|
| XSS via event log | Protégé | Les données passent par le model (setters, constructeurs), pas injectées directement dans le DOM |
| Injection localStorage | Protégé | `_readEventLog` valide la structure. Les ops passent par le switch de `_applyOp` qui n'exécute que des actions connues. `default` émet un `console.warn` |
| Prototype pollution | Protégé | `JSON.parse` ne restore pas les prototypes. Les objets sont des POJO |
| Denial of service (log géant) | Protégé | Compaction à 30s. Un attaquant qui écrit dans le même localStorage peut faire grossir le log, mais c'est same-origin |
| Tab spoofing (`tabId`) | Théorique | Un script same-origin pourrait écrire des entries avec un `tabId` forgé. Impact : l'onglet cible appliquerait des ops arbitraires. Mais same-origin = même application, pas un vrai vecteur d'attaque |

---

## 7. Évolutivité / Migration backend

### Points de remplacement identifiés

| Composant actuel | Remplacement backend | Impact code |
|---|---|---|
| `localStorage.getItem(EVENTS_KEY)` dans `_readEventLog` | `GET /api/events?since=<rev>` | Modifier `_readEventLog` uniquement |
| `localStorage.setItem(EVENTS_KEY, ...)` dans `_appendEvents` | Supprimé (le serveur produit les events) | Supprimer `_appendEvents`, adapter `_onBoardSaved` |
| `setInterval(_poll, ...)` | WebSocket/SSE listener | Remplacer `_startPolling`/`_poll` par un listener |
| `_applyOps` / `_applyOp` | **Inchangé** | Le patcher est transport-agnostic |
| `_fallbackSnapshotDiff` | **Inchangé** (GET /api/board au lieu de loadSnapshot) | Changer la source, même logique |

**Estimation changement :** Seules les sections "Producteur" et "Consommateur" changeraient. "Application des opérations" et "Fallback" restent identiques. Le format d'events est le même.

### Extensibilité du format d'ops

Ajouter un nouveau type d'opération (ex: `card:update` pour du diff granulaire par carte) :

1. Ajouter le cas dans `BoardDiffer.diff()`
2. Ajouter le `case` dans `_applyOp()`
3. Les cross-refs `@see` rappellent de faire les deux

---

## 8. Testabilité

### BoardDiffer.js — Trivialement testable

Fonction pure, pas de dépendance. Exemples de tests :

```
diff({...}, {...}) avec nom changé        → [{ type: 'board:name', value: '...' }]
diff({...}, {...}) avec colonne ajoutée   → [{ type: 'column:add', ... }, { type: 'column:reorder', ... }]
diff(same, same)                          → []
diff avec pluginData supprimé             → [{ type: 'board:pluginData', key: '...', value: null }]
```

### LiveSyncPlugin.js — Testable avec mocks

- `Container.get('BoardService')` : mockable via `Container.set`
- `localStorage` : mockable (ou `jest-localstorage-mock`)
- `document.hidden` : mockable
- `crypto.randomUUID` : mockable
- `setInterval` / `clearInterval` : fake timers (jest/vitest)

Scénarios testables :

- install → poll → aucun changement → rien ne se passe
- save dans un tab → poll dans un autre → ops appliquées
- poll quand dirty → skip
- log corrompu → `_readEventLog` retourne log vide
- fallback quand `_lastKnownRev < oldestEntry.rev`
- uninstall pendant fallback async → pas de crash
- op inconnue → console.warn, pas de crash

### Status : aucun test écrit

C'est le point faible principal. BoardDiffer en particulier devrait avoir des tests unitaires — c'est la pièce la plus critique (si le diff est faux, tout est faux) et la plus facile à tester.

---

## 9. Modifications du core

### Board.js — `removeColumn` + `reorderColumns`

| Critère | Évaluation |
|---|---|
| Cohérence avec l'existant | Style identique à `addColumn` / `moveColumn` |
| JSDoc | Oui |
| Guard clause | `findIndex === -1 → return`, `reordered.length !== _columns.length → return` |
| Emit 'change' | Oui |
| Pas de side effects non documentés | Oui |

### Column.js — `replaceCards`

| Critère | Évaluation |
|---|---|
| Cohérence | Simple et direct |
| JSDoc | Mentionne l'appelant (LiveSyncPlugin) |
| Emit 'change' | Oui |

### BoardService.js — `loadSnapshot` + `pauseAutoSave` + `resumeAutoSave`

| Critère | Évaluation |
|---|---|
| Cohérence | Oui |
| `_autoSavePaused` dans `_debouncedSave` | Early return propre |
| `pauseAutoSave` annule le timer en cours | `clearTimeout` |
| `loadSnapshot` retourne les données brutes (pas filtrées) | Documenté, filtrage fait côté plugin |
| JSDoc | Chaque méthode documentée |

---

## 10. Compromis assumés

| Compromis | Raison | Alternative possible |
|---|---|---|
| Granularité `column:cards` bulk (pas card-by-card) | Cohérent avec le re-render des ColumnViews qui fait `innerHTML = ''`. Moins de code, moins de cas limites. | Diff card-level pour réduire la taille des ops. Complexité +++ pour un gain minimal en localStorage. |
| `JSON.stringify` pour deep equal | Simple, pas de dépendance. Correct pour les types présents (POJO, strings, numbers, arrays). | Deep-equal library. Over-engineering pour ce cas. |
| Polling vs BroadcastChannel | Polling fonctionne même en cross-origin iframe. BroadcastChannel serait plus réactif mais ne persiste pas l'état (pas de log pour les onglets dormants). | Hybride BroadcastChannel + polling fallback. Complexité ++ pour un gain de latence marginal (3s → instant). |
| Compaction time-based (30s) vs count-based | Simple, prédictible. Un onglet qui dort >30s fait fallback. | Count-based (garder les N derniers). Moins prévisible mais plus résistant aux onglets dormants. |
| Pas de versioning du format d'events | Un seul format existe. Versionner maintenant serait prématuré. | Champ `version` dans le log. À ajouter si le format change. |

---

## 11. Recommandations prioritaires

### P1 — Tests unitaires pour BoardDiffer

La pièce la plus critique du système est une fonction pure sans test. Couvrir les cas : identique, nom changé, colonne ajoutée/supprimée/réordonnée, cartes modifiées, pluginData ajouté/modifié/supprimé, `null`/`undefined` edge cases.

### P2 — Tests d'intégration pour le cycle producteur/consommateur

Un test qui simule : save → appendEvents → poll → applyEntries → vérifier l'état du board. Avec mocks de localStorage et Container.

### P3 — Documenter le champ `index` inutilisé dans `column:add`

Le differ émet `{ type: 'column:add', column, index }` mais `_applyOp` n'utilise pas `index` (la colonne est pushée en fin puis repositionnée par `column:reorder`). Un commentaire dans le differ ou dans `_applyOp` clarifierait ce choix.

### P4 (optionnel) — Considérer BroadcastChannel en complément

Pour les cas où la réactivité <1s est souhaitée, un `BroadcastChannel` peut notifier les autres onglets instantanément après un save. Le polling resterait comme filet de sécurité pour les onglets dormants.
