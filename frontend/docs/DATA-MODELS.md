# Data Models & Storage

> Modeles de donnees, systeme d'evenements et persistence IndexedDB.

**Docs connexes** : [Architecture](./ARCHITECTURE.md) | [Plugin System](./PLUGIN-SYSTEM.md) | [Views & UI](./VIEWS-UI.md)

---

## Graphe des modeles

```mermaid
%%{init: {'theme': 'default'}}%%
graph TB
    subgraph Models["Modeles (src/models/)"]
        style Models fill:#fef9c3,stroke:#ca8a04,color:#1e1b4b

        BOARD["Board<br/><i>extends EventEmitter</i>"]
        COL["Column<br/><i>extends EventEmitter</i>"]
        CARD["Card"]
        HIST["CardHistory"]
        COMMENTS["CardComments"]
        COMMENT["Comment"]
        HENTRY["HistoryEntry"]
    end

    BOARD -->|"_columns[]"| COL
    COL -->|"_cards[]"| CARD
    CARD -->|"_history"| HIST
    CARD -->|"_comments"| COMMENTS
    COMMENTS -->|"_comments[]"| COMMENT
    HIST -->|"_entries[]"| HENTRY

    style BOARD fill:#fef9c3,stroke:#ca8a04,color:#1e1b4b
    style COL fill:#fef9c3,stroke:#ca8a04,color:#1e1b4b
    style CARD fill:#fef9c3,stroke:#ca8a04,color:#1e1b4b
    style HIST fill:#dbeafe,stroke:#2563eb,color:#1e1b4b
    style COMMENTS fill:#dbeafe,stroke:#2563eb,color:#1e1b4b
    style COMMENT fill:#dbeafe,stroke:#2563eb,color:#1e1b4b
    style HENTRY fill:#dbeafe,stroke:#2563eb,color:#1e1b4b
```

---

## Board

Conteneur racine du plateau. Emet `'change'` a chaque mutation et relaie les `'change'` de ses colonnes (bubbling).

**Fichier** : [`src/models/Board.js`](../src/models/Board.js)

```mermaid
%%{init: {'theme': 'default'}}%%
classDiagram
    class Board {
        -string _name
        -string _description
        -object _coverImage
        -object _backgroundImage
        -object _pluginData
        -Column[] _columns
        +get columns() Column[]
        +getColumnById(id) Column
        +getCardById(cardId) card+column
        +addColumn(column)
        +removeColumn(columnId)
        +moveColumn(from, to)
        +moveCard(cardId, fromCol, toCol, index)
        +get pluginData() object
        +setPluginData(key, value)
        +removePluginData(key)
        +allCards()* Card
        +entries()* card+column
        +toJSON() object
    }
```

**Points cles** :
- `columns` getter retourne une **copie** du tableau (immutabilite externe)
- `pluginData` getter retourne une **copie shallow** de `_pluginData` (lecture safe)
- `setPluginData(key, value)` : mutation safe avec `emit('change')` → auto-save
- `removePluginData(key)` : suppression safe avec `emit('change')` → auto-save
- `_onColumnChangeBound` : handler unique branche sur chaque Column pour le bubbling
- `removeColumn()` fait `column.off('change', ...)` avant de supprimer (cleanup)

---

## Column

Liste ordonnee de Cards. Emet `'change'` a chaque mutation (add, remove, move, rename).

**Fichier** : [`src/models/Column.js`](../src/models/Column.js)

```mermaid
%%{init: {'theme': 'default'}}%%
classDiagram
    class Column {
        -string _id
        -string _title
        -Card[] _cards
        -object _pluginData
        +get cards() Card[]
        +get count() number
        +getCardById(id) Card
        +addCard(card, index?)
        +removeCard(cardId) Card
        +moveCard(fromIndex, toIndex)
        +replaceCards(newCards)
        +updateTitle(newTitle)
        +toJSON() object
    }
```

**Points cles** :
- `cards` getter retourne une **copie** (pas de mutation externe)
- `replaceCards()` : remplacement bulk en une seule emission `'change'` (utilise par la migration de colonnes)
- `_pluginData` : donnees par colonne (ex: couleur de colonne)

---

## Card

Objet de donnees pur (pas d'EventEmitter). Contient l'historique et les commentaires.

**Fichier** : [`src/models/Card.js`](../src/models/Card.js)

```mermaid
%%{init: {'theme': 'default'}}%%
classDiagram
    class Card {
        -string _id
        -string _title
        -string _description
        -string _summary
        -object _tags
        -string _assignee
        -string _author
        -string _createdAt
        -string _type
        -object _data
        -object _image
        -CardHistory _history
        -CardComments _comments
        +update(title, description, summary, tags, assignee)
        +addComment(comment)
        +updateComment(id, text, userId)
        +recordMove(from, to, userId)
        +toJSON() object
    }
```

**Points cles** :
- `_type` : `'standard'` ou `'widget:*'` (carte speciale geree par un plugin)
- `_summary` : texte court affiché entre le titre et la description sur la carte
- `_tags` : multi-taxonomie `{ priority: ['high'], type: ['feature', 'ux'] }`
- `_data` : donnees libres pour les widgets (ex: compteur, config YouTube)
- `_image` : reference IndexedDB `{ id: string }`
- Tous les getters retournent des **copies** (deep clone pour `tags`)

---

## Comment

Entite representant un commentaire sur une carte. Peut contenir des fichiers joints.

**Fichier** : [`src/models/Comment.js`](../src/models/Comment.js)

```mermaid
%%{init: {'theme': 'default'}}%%
classDiagram
    class Comment {
        -string _id
        -string _text
        -string|null _authorId
        -string _date
        -Array _files
        +get files() Array
        +updateText(newText)
        +toJSON() object
    }
```

**Points cles** :
- `_files` : tableau de fichiers joints `[{ id, name, size, mimeType }]`
- Backward-compatible : anciens commentaires sans `files` recoivent `[]`
- `files` getter retourne une **copie** defensive du tableau
- Les blobs sont stockes dans IndexedDB via StorageService (meme store que les images)

---

## CardComments

Collection de commentaires d'une carte. Encapsule le CRUD et la serialisation.

**Fichier** : [`src/models/CardComments.js`](../src/models/CardComments.js)

```mermaid
%%{init: {'theme': 'default'}}%%
classDiagram
    class CardComments {
        -Comment[] _comments
        +getAll() Comment[]
        +get count() number
        +add(comment)
        +findById(commentId) Comment
        +updateText(commentId, newText) object|null
        +toJSON() Array
    }
```

**Points cles** :
- `getAll()` retourne une **copie** du tableau (isolation memoire)
- `updateText()` retourne `{ oldText, comment }` pour que CardHistory puisse enregistrer le diff
- Le constructeur reconstruit des instances `Comment` depuis les donnees brutes (restauration IndexedDB)

---

## HistoryEntry

Value object totalement immuable representant une action dans l'historique d'une carte.

**Fichier** : [`src/models/HistoryEntry.js`](../src/models/HistoryEntry.js)

```mermaid
%%{init: {'theme': 'default'}}%%
classDiagram
    class HistoryEntry {
        -string _action
        -string _date
        -string|null _userId
        -object|null _changes
        +get action() string
        +get date() string
        +get userId() string|null
        +get changes() object|null
        +toJSON() object
    }
```

**Points cles** :
- `_action` : type d'action (`'created'`, `'updated'`, `'moved'`, `'commented'`, `'comment_edited'`, `'reordered'`)
- `_changes` : format standard `{ field: { from, to } }` (ex: `{ title: { from: 'A', to: 'B' } }`)
- `_date` : auto-generee si absente

---

## CardHistory

Timeline d'une carte. Encapsule le tableau d'HistoryEntry et fournit des raccourcis types pour chaque type d'action.

**Fichier** : [`src/models/CardHistory.js`](../src/models/CardHistory.js)

```mermaid
%%{init: {'theme': 'default'}}%%
classDiagram
    class CardHistory {
        -HistoryEntry[] _entries
        +getAll() HistoryEntry[]
        +record(action, userId, changes, date?)
        +recordUpdate(changes, userId)
        +recordComment(authorId, date)
        +recordCommentEdit(oldText, newText, userId)
        +recordMove(fromTitle, toTitle, userId)
        +recordReorder(columnTitle, fromIndex, toIndex, userId)
        +toJSON() Array
    }
```

**Points cles** :
- Deux chemins de construction : nouvelle carte (cree automatiquement l'entree `'created'`) ou restauration depuis des donnees brutes
- `recordUpdate()` ignore les diffs vides (pas de pollution historique)
- `recordReorder()` convertit les index 0-based en positions 1-based pour l'affichage
- `getAll()` retourne une **copie** du tableau

---

## Systeme d'evenements

```mermaid
%%{init: {'theme': 'default'}}%%
graph BT
    subgraph Events["Bubbling des evenements 'change'"]
        style Events fill:#dcfce7,stroke:#16a34a,color:#1e1b4b

        COL_EMIT["Column.emit('change')"]
        BOARD_RELAY["Board relaie → emit('change')"]
        BS_SAVE["BoardService._debouncedSave()"]
        BV_RENDER["BoardView._rerender()"]
    end

    COL_EMIT -->|"Board ecoute via _onColumnChangeBound"| BOARD_RELAY
    BOARD_RELAY -->|"BoardService ecoute"| BS_SAVE
    BOARD_RELAY -->|"BoardView ecoute"| BV_RENDER

    style COL_EMIT fill:#fef9c3,stroke:#ca8a04,color:#1e1b4b
    style BOARD_RELAY fill:#fef9c3,stroke:#ca8a04,color:#1e1b4b
    style BS_SAVE fill:#dcfce7,stroke:#16a34a,color:#1e1b4b
    style BV_RENDER fill:#dbeafe,stroke:#2563eb,color:#1e1b4b
```

**EventEmitter** : [`src/lib/EventEmitter.js`](../src/lib/EventEmitter.js) — micro implementation `on()`, `off()`, `emit()`

**Flux** :
1. Une mutation sur Column (ex: `addCard`) emet `'change'`
2. Board relaie en emettant son propre `'change'`
3. **BoardService** ecoute → debounce 300ms → `save()` dans IndexedDB
4. **BoardView** ecoute → `_rerender()` (detruit + reconstruit toutes les ColumnView)

---

## Persistence IndexedDB

Aucun `localStorage` — tout est dans IndexedDB via la librairie `idb`. Version actuelle : **DB_VERSION 2**.

```mermaid
%%{init: {'theme': 'default'}}%%
graph TB
    subgraph IDB["IndexedDB 'kanban' (v2)"]
        style IDB fill:#ffedd5,stroke:#ea580c,color:#1e1b4b

        META["meta<br/><i>key: string</i><br/>Board registry, settings globaux,<br/>plugins desactives, revision sync"]
        BOARDS["boards<br/><i>key: id</i><br/>Donnees completes de chaque board<br/>(colonnes, cartes, pluginData)"]
        IMAGES["images<br/><i>key: auto-increment</i><br/>Blobs des images<br/>Index: by-board, by-card"]
        SYNCQ["sync-queue<br/><i>key: auto-increment</i><br/>Queue de sync backend (ops FIFO)<br/>Index: by-board, by-status"]
    end

    subgraph Facade["StorageService (facade)"]
        style Facade fill:#dcfce7,stroke:#16a34a,color:#1e1b4b
        GET["get(key) / set(key, value)"]
        LOAD["loadBoard(id) / saveBoard(id, data)"]
        IMG["storeImage() / getImageUrl()"]
        DRV["setDriver(driver)"]
    end

    subgraph Driver["StorageDriver (strategie)"]
        style Driver fill:#e0f2fe,stroke:#0284c7,color:#1e1b4b
        LOCAL["LocalStorageDriver<br/>IndexedDB via BoardStorage"]
        BACKEND["BackendStorageDriver<br/>REST via httpClient"]
    end

    subgraph Impl["Implementation"]
        style Impl fill:#dbeafe,stroke:#2563eb,color:#1e1b4b
        DB["Database.js<br/>idb wrapper + schema"]
        BSTO["BoardStorage.js<br/>CRUD boards + registry"]
        IMGSTO["IndexedDBImageStorage.js<br/>Blobs + Object URL cache"]
    end

    GET --> BSTO --> META
    DRV --> LOCAL
    DRV --> BACKEND
    LOAD --> LOCAL
    LOCAL --> BSTO --> BOARDS
    BACKEND -->|"HTTP"| API["Backend REST"]
    IMG --> IMGSTO --> IMAGES
    BSTO --> DB
    IMGSTO --> DB
```

### StorageDriver (pattern strategie)

`StorageService` delegue les operations board a un driver interchangeable via `setDriver(driver)` :

| Driver | Source | Usage |
|---|---|---|
| `LocalStorageDriver` (defaut) | IndexedDB via BoardStorage | Mode offline / BackendPlugin desactive |
| `BackendStorageDriver` | REST via httpClient | BackendPlugin actif et utilisateur connecte |

Les **settings** (`get/set/remove`) et les **images** restent toujours en IndexedDB local, seules les operations board changent de source.

Le **board actif** est stocke comme setting local (`storage:activeBoard`) dans le store meta, independant du driver. Migration automatique depuis l'ancien `registry.activeBoard` au premier acces.

**Fichiers** :
- [`src/services/StorageService.js`](../src/services/StorageService.js) — Facade unifiee (tout async) + driver
- [`src/services/storage/StorageDriver.js`](../src/services/storage/StorageDriver.js) — Interface abstraite (7 methodes board-only)
- [`src/services/storage/LocalStorageDriver.js`](../src/services/storage/LocalStorageDriver.js) — Wrap BoardStorage (IndexedDB)
- [`src/services/storage/BackendStorageDriver.js`](../src/services/storage/BackendStorageDriver.js) — Pur REST via httpClient
- [`src/services/storage/Database.js`](../src/services/storage/Database.js) — Ouverture IndexedDB, schema, migrations
- [`src/services/storage/BoardStorage.js`](../src/services/storage/BoardStorage.js) — CRUD boards, registry, settings
- [`src/services/storage/IndexedDBImageStorage.js`](../src/services/storage/IndexedDBImageStorage.js) — Blobs avec Object URL caching
- [`src/services/storage/ExportImportService.js`](../src/services/storage/ExportImportService.js) — Export/import JSON avec images base64

---

## Flux de sauvegarde

```mermaid
%%{init: {'theme': 'default'}}%%
sequenceDiagram
    participant U as Utilisateur
    participant V as ColumnView
    participant BS as BoardService
    participant B as Board
    participant SS as StorageService
    participant IDB as IndexedDB

    U->>V: Drag carte vers autre colonne
    V->>BS: moveCard(cardId, fromCol, toCol, index)
    BS->>B: board.moveCard(...)
    B->>B: emit('change')
    B-->>BS: _debouncedSave() [300ms]

    Note over BS: Attend 300ms sans autre mutation

    BS->>BS: board.toJSON()
    BS->>BS: Hooks.applyFilters('board:beforeSave', data)
    BS->>SS: saveBoard(boardId, data)
    SS->>IDB: boards.put(data)
    IDB-->>BS: OK
    BS->>BS: Hooks.doAction('board:saved')
```

**Points cles** :
- Le debounce de 300ms evite les saves multiples lors de mutations rapides
- `board:beforeSave` permet aux plugins de transformer les donnees avant persistence
- `_savePending` permet `flush()` avant fermeture de tab
- `pauseAutoSave()` / `resumeAutoSave()` : utilise par LiveSyncPlugin pendant la sync

---

## Multi-Board

```mermaid
%%{init: {'theme': 'default'}}%%
graph LR
    subgraph Registry["Board Registry (meta store)"]
        style Registry fill:#f3e8ff,stroke:#7c3aed,color:#1e1b4b
        R["{ boards: [...], activeBoard: 'board-xyz' }"]
    end

    subgraph Boards["Boards (boards store)"]
        style Boards fill:#dcfce7,stroke:#16a34a,color:#1e1b4b
        B1["board-abc → { name, columns, pluginData }"]
        B2["board-xyz → { name, columns, pluginData }"]
        B3["board-123 → { name, columns, pluginData }"]
    end

    R -->|"activeBoard"| B2
    R -->|"boards[]"| B1
    R -->|"boards[]"| B3

    style B2 fill:#fef9c3,stroke:#ca8a04,color:#1e1b4b
```

Chaque entree du registre contient : `{ id, name, createdAt, updatedAt, columnCount, cardCount }`

Operations : `createBoard()`, `deleteBoard()`, `duplicateBoard()`, `renameBoard()`, `setActiveBoard()`

---

## Images

Les images sont stockees comme Blobs dans IndexedDB avec des index pour recherche rapide.

| Index | Usage |
|---|---|
| `by-board` | Recuperer toutes les images d'un board (cleanup) |
| `by-card` | Recuperer l'image d'une carte specifique |

**Object URL caching** : `IndexedDBImageStorage._urlCache` (Map) evite de recreer des Object URLs a chaque acces. `revokeAllUrls()` est appele a chaque changement de vue pour eviter les memory leaks.

---

## Sync Queue (store `sync-queue`)

Queue FIFO persistante utilisee par SyncService pour envoyer les operations au backend. Ajoutee en DB_VERSION 2.

**Schema d'une entree :**

| Champ | Type | Description |
|---|---|---|
| `id` | `number` | Auto-increment (FIFO naturel) |
| `boardId` | `string` | ID du board concerne |
| `ops` | `Array` | Operations issues de BoardDiffer.diff() |
| `status` | `string` | `'pending'`, `'sending'` ou `'failed'` |
| `retryCount` | `number` | Nombre de tentatives echouees |
| `createdAt` | `number` | Timestamp de creation (Date.now()) |
| `error` | `string\|null` | Dernier message d'erreur |

**Index :**

| Index | Usage |
|---|---|
| `by-board` | Recuperer les entrees d'un board specifique |
| `by-status` | Recuperer les entrees par statut (recovery stale) |

**Machine d'etat :**

```
pending ──dequeue()──► sending ──ack()──► (supprime)
                          │
                        nack()
                          │
                          ▼
                       failed (retryCount < 5 → repasse pending)
```

**Fichier** : [`src/sync/SyncQueue.js`](../src/sync/SyncQueue.js)

---

## Metadata de revision sync

Le SyncService stocke la revision serveur de chaque board dans le store `meta`.

| Cle | Format |
|---|---|
| `sync:board:{boardId}:revision` | `{ serverRevision: number, lastSyncedAt: number }` |
