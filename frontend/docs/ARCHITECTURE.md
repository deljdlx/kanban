# Architecture Globale

> Vue d'ensemble du projet Kanban : couches, initialisation, navigation et conventions.

**Docs connexes** : [Plugin System](./PLUGIN-SYSTEM.md) | [Data Models](./DATA-MODELS.md) | [Views & UI](./VIEWS-UI.md)

---

## Couches applicatives

```mermaid
%%{init: {'theme': 'default'}}%%
graph TB
    subgraph Entry["Point d'entrée"]
        style Entry fill:#f3e8ff,stroke:#7c3aed,color:#1e1b4b
        MAIN["main.js"]
        APP["Application.js"]
    end

    subgraph Views["Couche Vue"]
        style Views fill:#dbeafe,stroke:#2563eb,color:#1e1b4b
        BV["BoardView"]
        CV["ColumnView"]
        CARD["CardView"]
        MODALS["Modales"]
        HEADER["HeaderView"]
        HOME["HomeView"]
    end

    subgraph Services["Couche Services"]
        style Services fill:#dcfce7,stroke:#16a34a,color:#1e1b4b
        BS["BoardService"]
        PS["PermissionService"]
        US["UserService"]
        AS["AuthService"]
        FS["FilterStore"]
        SS["StorageService"]
        RT["Router"]
        TS["TaxonomyService"]
        CTR["CardTypeRegistry"]
        ISS["ImageStorageService"]
    end

    subgraph Models["Couche Modèles"]
        style Models fill:#fef9c3,stroke:#ca8a04,color:#1e1b4b
        BOARD["Board"]
        COL["Column"]
        CARDM["Card"]
    end

    subgraph Plugins["Système de Plugins"]
        style Plugins fill:#ffe4e6,stroke:#e11d48,color:#1e1b4b
        HR["HookRegistry"]
        PM["PluginManager"]
        PREG["28 plugins"]
    end

    subgraph Sync["Sync (src/sync/)"]
        style Sync fill:#e0f2fe,stroke:#0284c7,color:#1e1b4b
        SYNCSVC["SyncService"]
        SYNCQ["SyncQueue"]
        BADAPT["BackendAdapter"]
        BDIFF["BoardDiffer"]
        OPAPP["OpApplier"]
    end

    subgraph Storage["Persistence IndexedDB"]
        style Storage fill:#ffedd5,stroke:#ea580c,color:#1e1b4b
        DB["Database.js (idb)"]
        BSTO["BoardStorage"]
        IMGSTO["IndexedDBImageStorage"]
    end

    MAIN --> APP
    APP --> BV
    APP --> HOME
    APP --> RT
    APP --> PM

    APP --> SYNCSVC
    SYNCSVC --> SYNCQ
    SYNCSVC --> BADAPT
    SYNCSVC --> BDIFF
    SYNCSVC --> OPAPP
    SYNCQ --> DB

    BV --> CV
    CV --> CARD
    CV --> MODALS

    CV --> BS
    CV --> PS
    MODALS --> BS

    BS --> BOARD
    BOARD --> COL
    COL --> CARDM

    BS --> SS
    SS --> DB
    SS --> BSTO
    SS --> IMGSTO

    BS --> HR
    PM --> HR
    PREG --> HR
```

---

## Séquence de démarrage

L'application s'initialise en 3 phases synchronisées :

```mermaid
%%{init: {'theme': 'default'}}%%
sequenceDiagram
    participant M as main.js
    participant A as Application
    participant S as Services
    participant P as PluginManager
    participant R as Router

    rect rgb(243, 232, 255)
    Note over M,R: Phase 1 — Initialisation
    M->>A: Application.create('#app')
    A->>A: AuthService.init() (sync — charge session sessionStorage)
    A->>S: Promise.all([ UserService, TaxonomyService, StorageService, PluginManager ]).init()
    S-->>A: Services prêts (IndexedDB ouverte)
    A->>P: registerPlugins() — séquentiel (await each)
    P-->>A: 27 plugins installés
    A->>A: SyncService.init() — hooks board:saved (priority 20), recovery stale
    A->>A: mount(rootElement)
    end

    rect rgb(219, 234, 254)
    Note over M,R: Phase 2 — Routing (avec auth guard)
    M->>R: addRoute('/login')
    M->>R: addRoute('/', requireAuth)
    M->>R: addRoute('/board/:id', requireAuth)
    M->>R: addRoute('/explorer', requireAuth)
    M->>R: start() — hashchange listener + traitement hash initial
    end

    rect rgb(220, 252, 231)
    Note over M,R: Phase 3 — Affichage
    R->>A: openBoard(boardId)
    A->>A: teardownCurrentView()
    A->>S: BoardService.fetchBoard(id)
    A->>A: BoardService.buildBoard()
    A->>A: renderHeader() + new BoardView().render()
    A->>P: Hooks.doAction('board:didChange')
    end
```

**Fichiers clés** :
- [`src/main.js`](../src/main.js) — Bootstrap, routes, lancement
- [`src/Application.js`](../src/Application.js) — Orchestrateur singleton
- [`src/services/Router.js`](../src/services/Router.js) — Routeur hash-based (`#/login`, `#/`, `#/board/:id`, `#/explorer`)
- [`src/services/AuthService.js`](../src/services/AuthService.js) — Authentification front-end (login, session, guard)

---

## Container (Service Locator)

Tous les singletons sont enregistrés dans un Container léger pour injection et tests.

```mermaid
%%{init: {'theme': 'default'}}%%
graph LR
    subgraph Container["Container.js"]
        style Container fill:#f3e8ff,stroke:#7c3aed,color:#1e1b4b
        MAP["Map&lt;string, instance&gt;"]
    end

    BS["BoardService"] -->|set| MAP
    SS["StorageService"] -->|set| MAP
    PS["PermissionService"] -->|set| MAP
    AUS["AuthService"] -->|set| MAP
    HR["HookRegistry"] -->|set| MAP
    PM["PluginManager"] -->|set| MAP
    RT["Router"] -->|set| MAP
    APP["Application"] -->|set| MAP
    SYNC["SyncService"] -->|set| MAP

    MAP -->|get| CONSUMER["N'importe quel module"]

    style BS fill:#dcfce7,stroke:#16a34a,color:#1e1b4b
    style SS fill:#dcfce7,stroke:#16a34a,color:#1e1b4b
    style PS fill:#dcfce7,stroke:#16a34a,color:#1e1b4b
    style AUS fill:#dcfce7,stroke:#16a34a,color:#1e1b4b
    style HR fill:#ffe4e6,stroke:#e11d48,color:#1e1b4b
    style PM fill:#ffe4e6,stroke:#e11d48,color:#1e1b4b
    style RT fill:#dcfce7,stroke:#16a34a,color:#1e1b4b
    style APP fill:#f3e8ff,stroke:#7c3aed,color:#1e1b4b
    style SYNC fill:#e0f2fe,stroke:#0284c7,color:#1e1b4b
    style CONSUMER fill:#dbeafe,stroke:#2563eb,color:#1e1b4b
```

**Pattern** : chaque service s'enregistre lui-même en fin de fichier :
```js
const boardService = new BoardService();
Container.set('BoardService', boardService);
export default boardService;
```

**Fichier** : [`src/Container.js`](../src/Container.js) — `get(name)`, `set(name, instance)`, `has(name)`, `reset()`

---

## Navigation & Routes

```mermaid
%%{init: {'theme': 'default'}}%%
graph LR
    subgraph Routes["Routes hash-based"]
        style Routes fill:#dbeafe,stroke:#2563eb,color:#1e1b4b
        R0["#/login → showLogin()"]
        R1["#/ → requireAuth → showHome()"]
        R2["#/board/:id → requireAuth → openBoard(id)"]
        R3["#/explorer → requireAuth → showExplorer()"]
    end

    R0 --> LOGIN["LoginView"]
    R1 --> HOME["HomeView"]
    R2 --> BOARD["BoardView"]
    R3 --> EXPLORER["ExplorerView"]

    style LOGIN fill:#ffe4e6,stroke:#e11d48,color:#1e1b4b
    style HOME fill:#dcfce7,stroke:#16a34a,color:#1e1b4b
    style BOARD fill:#dcfce7,stroke:#16a34a,color:#1e1b4b
    style EXPLORER fill:#dcfce7,stroke:#16a34a,color:#1e1b4b
```

**Cycle de navigation** : `hashchange` → `Router._handleCurrentHash()` → match → `requireAuth` guard → `Application.openBoard(id)` (ou `showHome()`)

**Auth guard** (mode multi uniquement) : les routes `/`, `/board/:id` et `/explorer` sont wrappées par `requireAuth()`. Si `AuthService.isAuthenticated()` retourne `false`, l'URL cible est mémorisée et l'utilisateur est redirigé vers `/login`. En mode solo, le guard est transparent.

A chaque changement de vue, `Application._teardownCurrentView()` :
1. Détruit le header
2. Révoque les Object URLs (images)
3. `currentView.destroy()`
4. Vide le container DOM
5. Reset `_currentBoard` / `_currentBoardId`

---

## Conventions du projet

| Convention | Exemple |
|---|---|
| Classes | `PascalCase` — `BoardService`, `ColumnView` |
| Méthodes / variables | `camelCase` — `removeColumn()`, `targetColumnId` |
| Propriétés privées | `_prefixUnderscore` — `this._board` |
| Fichiers classes | `PascalCase.js` — `BoardView.js` |
| Fichiers utilitaires | `camelCase.js` — `backgroundImage.js` |
| Hooks core | `domaine:action` — `board:rendered`, `card:moved` |
| Hooks plugins | `pluginName:action` — `boardNotes:created` |
| Singletons | Export default + `Container.set()` |

---

## Mode Solo-Offline

L'application fonctionne en mode **solo-offline** : un seul utilisateur local emule cote front.

**Flag de mode** : [`src/config/appMode.js`](../src/config/appMode.js) — `isSoloMode()` retourne `true` en mode solo, `false` en multi.

**Comportement en solo** :
- `UserService` cree un seul user admin (`solo-user`) dont le profil est stocke en IndexedDB (cle `userProfile`)
- `getUserById(id)` retourne le solo user pour **tout** ID non-null (compatibilite boards existants)
- Les elements UI multi-user sont caches (SelectUser, filtres assignee/auteur, badges assignee)
- Un onglet "Profil" dans ModalBoardSettings permet de configurer nom, initiales et couleur

**Passage en multi** : changer `APP_MODE` en `'multi'` dans `appMode.js` (ou lire `import.meta.env.VITE_APP_MODE`).

---

## Génération d'identifiants

Tous les identifiants d'entités (board, colonne, carte, commentaire, image, note, règle, champ, item) sont générés via une **factory centralisée** :

**Fichier** : [`src/utils/id.js`](../src/utils/id.js) — `generateId(prefix)`, `setIdGenerator(fn)`

```js
import { generateId } from '../utils/id.js';

const cardId   = generateId('card');    // → "card-a1b2c3d4"
const boardId  = generateId('board');   // → "board-e5f6g7h8"
```

**Préfixes utilisés** : `board`, `col`, `card`, `comment`, `img`, `note`, `rule`, `cf`, `item`

**Compatibilité backend** : appeler `setIdGenerator(fn)` au démarrage pour remplacer la génération locale par des IDs serveur (UUID v4, auto-increment, etc.).

---

## Arborescence src/

```
src/
├── main.js                          ← Bootstrap
├── Application.js                   ← Orchestrateur
├── Container.js                     ← Service Locator
├── models/                          ← Données pures (EventEmitter)
├── services/                        ← Logique métier + persistence
│   └── storage/                     ← IndexedDB (idb wrapper)
├── views/                           ← DOM, modales, interactions
│   ├── column/                      ← Sous-composants colonne
│   ├── cardDetail/                  ← Panneaux détail carte
│   └── boardSettings/               ← Panneaux settings board
├── sync/                            ← Sync backend (SyncService, SyncQueue, adapters)
├── plugins/                         ← Système de hooks
│   ├── lib/                         ← Factories (Color, Taxonomy)
│   └── registry/                    ← 27 plugins
├── components/                      ← Widgets réutilisables
├── styles/                          ← SCSS (variables, mixins, composants)
├── utils/                           ← Helpers purs
├── lib/                             ← EventEmitter
├── config/                          ← Constantes (historyActions, appMode)
└── data/                            ← Board de démo
```
