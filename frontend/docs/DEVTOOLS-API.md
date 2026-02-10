# DevTools API — `window.kanban`

> Reference complete de l'API console pour piloter le Kanban depuis les devtools du navigateur.

**Plugin source** : [`src/plugins/registry/DevToolsPlugin/`](../src/plugins/registry/DevToolsPlugin/)
**Docs connexes** : [Architecture](./ARCHITECTURE.md) | [Plugin System](./PLUGIN-SYSTEM.md) | [Data Models](./DATA-MODELS.md)

---

## Demarrage rapide

Ouvrir la console du navigateur (`F12` > Console) et taper :

```js
kanban.help()               // Affiche l'aide formatee
kanban.board.meta()         // Nom et description du board courant
console.table(kanban.columns.list())  // Colonnes en tableau
console.table(kanban.cards.list())    // Toutes les cartes
```

L'API est disponible des le chargement de la page. Le plugin a la priorite 1 (enregistre en premier).

---

## Conventions

| Convention | Exemple |
|---|---|
| Les mutations affichent un feedback console | `✅ Carte ajoutee : "Ma carte" (card-abc123)` |
| Les echecs affichent un message | `❌ Colonne introuvable : col-xxx` |
| Les methodes async retournent une Promise | `await kanban.storage.boards()` |
| Les methodes de lecture sont synchrones | `kanban.cards.list()` |
| `null` signifie "pas de board charge" | `kanban.board.get()` → `null` si aucun board |

---

## Reference par namespace

### `kanban.board.*` — Board courant

Lecture et modification des metadonnees du board actuellement affiche.

| Methode | Retour | Description |
|---|---|---|
| `.get()` | `Board \| null` | Instance du Board model |
| `.id()` | `string \| null` | ID du board courant |
| `.meta()` | `Object \| null` | `{ name, description, coverImage, backgroundImage }` |
| `.setName(name)` | `void` | Renomme le board (sauvegarde auto) |
| `.setDescription(d)` | `void` | Change la description (sauvegarde auto) |
| `.pluginData()` | `Object` | Donnees des plugins (copie shallow) |
| `.setPluginData(key, value)` | `void` | Modifie une entree dans pluginData |
| `.save()` | `Promise<void>` | Force un flush de sauvegarde immediat |

```js
// Renommer le board
kanban.board.setName('Sprint 42')

// Lire les donnees du plugin card-colors
kanban.board.pluginData()['card-colors']

// Injecter des donnees plugin manuellement
kanban.board.setPluginData('my-plugin', { foo: 'bar' })
```

---

### `kanban.columns.*` — CRUD colonnes

| Methode | Retour | Description |
|---|---|---|
| `.list()` | `[{ id, title, cardCount }]` | Toutes les colonnes |
| `.get(id)` | `Column \| null` | Instance Column par ID |
| `.add(title)` | `Column` | Cree une colonne en fin de board |
| `.remove(id, targetId?)` | `boolean` | Supprime une colonne. Si `targetId` fourni, migre les cartes vers cette colonne. |
| `.rename(id, newTitle)` | `void` | Renomme une colonne |

```js
// Lister les colonnes
console.table(kanban.columns.list())
// → [{ id: "col-abc", title: "A faire", cardCount: 3 }, ...]

// Ajouter une colonne
kanban.columns.add('Backlog')

// Supprimer en migrant les cartes
const cols = kanban.columns.list()
kanban.columns.remove(cols[0].id, cols[1].id)
```

---

### `kanban.cards.*` — CRUD cartes + recherche

| Methode | Retour | Description |
|---|---|---|
| `.list()` | `[{ id, title, column, columnId, assignee, type, tags }]` | Toutes les cartes avec leur colonne |
| `.get(id)` | `{ card, column } \| null` | Carte + colonne parente |
| `.find(fn)` | `Card[]` | Filtre avec predicat `fn(card) → boolean` |
| `.search(query)` | `Card[]` | Recherche par titre (insensible a la casse) |
| `.add(colId, data, idx?)` | `Card \| null` | Cree une carte (auto-ID si `data.id` absent) |
| `.remove(colId, cardId)` | `Card \| null` | Supprime une carte |
| `.move(cardId, from, to, idx)` | `boolean` | Deplace entre colonnes |
| `.byAssignee(userId)` | `Card[]` | Cartes assignees a un user |
| `.byTag(taxonomy, term)` | `Card[]` | Cartes avec un tag specifique |

```js
// Toutes les cartes en tableau
console.table(kanban.cards.list())

// Chercher par titre
kanban.cards.search('authentification')

// Predicat libre
kanban.cards.find(c => c.type === 'widget:counter')

// Cartes haute priorite
kanban.cards.byTag('priority', 'high')

// Creer une carte dans la premiere colonne
const col = kanban.columns.list()[0]
kanban.cards.add(col.id, {
    title: 'Nouvelle carte',
    description: 'Creee depuis la console',
    tags: { priority: ['medium'] }
})

// Creer a une position specifique (index 0 = en haut)
kanban.cards.add(col.id, { title: 'Urgente !' }, 0)

// Deplacer une carte
const cards = kanban.cards.list()
const card = cards[0]
const targetCol = kanban.columns.list()[1]
kanban.cards.move(card.id, card.columnId, targetCol.id, 0)
```

---

### `kanban.hooks.*` — Introspection HookRegistry

| Methode | Retour | Description |
|---|---|---|
| `.list()` | `[{ name, label, category }]` | Tous les hooks enregistres |
| `.meta(hookName)` | `Object \| null` | Metadonnees d'un hook |
| `.trigger(name, ...args)` | `void` | Declenche une action manuellement |
| `.on(name, cb, prio?)` | `void` | Ecoute un hook (priorite optionnelle, defaut 10) |
| `.off(name, cb)` | `void` | Retire un listener (meme reference de callback) |

```js
// Lister tous les hooks du systeme
console.table(kanban.hooks.list())

// Voir les metadonnees d'un hook
kanban.hooks.meta('card:created')

// Ecouter les creations de carte
const onCard = (payload) => console.log('Carte creee !', payload.card.title)
kanban.hooks.on('card:created', onCard)

// Retirer le listener
kanban.hooks.off('card:created', onCard)

// Declencher un hook manuellement
kanban.hooks.trigger('board:rendered', { board: kanban.board.get() })
```

---

### `kanban.plugins.*` — Gestion PluginManager

| Methode | Retour | Description |
|---|---|---|
| `.list()` | `[{ name, label, installed, error }]` | Tous les plugins et leur etat |
| `.get(name)` | `Object \| undefined` | Instance d'un plugin |
| `.isEnabled(name)` | `boolean` | Plugin actuellement actif ? |
| `.enable(name)` | `Promise<void>` | Active un plugin desactive |
| `.disable(name)` | `Promise<void>` | Desactive un plugin actif |

```js
// Lister les plugins
console.table(kanban.plugins.list())

// Desactiver un plugin
await kanban.plugins.disable('snowflake-cursor')

// Reactiver
await kanban.plugins.enable('snowflake-cursor')

// Verifier l'etat
kanban.plugins.isEnabled('theme')  // → true

// Acceder a l'instance interne
kanban.plugins.get('workflow-engine')
```

---

### `kanban.storage.*` — Multi-board + settings IndexedDB

Toutes les methodes sont **async** (retournent une Promise).

| Methode | Retour | Description |
|---|---|---|
| `.boards()` | `Promise<[{ id, name, cardCount, columnCount }]>` | Liste des boards en IndexedDB |
| `.createBoard(name)` | `Promise<string>` | Cree un board, retourne son ID |
| `.deleteBoard(id)` | `Promise<boolean>` | Supprime un board |
| `.renameBoard(id, name)` | `Promise<boolean>` | Renomme un board dans le registre |
| `.duplicateBoard(id)` | `Promise<string \| null>` | Duplique un board, retourne le nouvel ID |
| `.get(key, default?)` | `Promise<any>` | Lit un setting global |
| `.set(key, value)` | `Promise<void>` | Ecrit un setting global |
| `.remove(key)` | `Promise<void>` | Supprime un setting |

```js
// Lister les boards
console.table(await kanban.storage.boards())

// Creer un board
const id = await kanban.storage.createBoard('Projet X')

// Dupliquer le board courant
const newId = await kanban.storage.duplicateBoard(kanban.board.id())

// Lire/ecrire un setting global
await kanban.storage.set('myKey', { hello: 'world' })
await kanban.storage.get('myKey')  // → { hello: 'world' }

// Voir les plugins desactives
await kanban.storage.get('kanban:disabledPlugins', [])
```

---

### `kanban.filters.*` — FilterStore

| Methode | Retour | Description |
|---|---|---|
| `.get()` | `{ assignee, author, tags }` | Filtres actifs |
| `.setAssignee(userId)` | `void` | Filtre par assignee (`null` = tous) |
| `.setAuthor(userId)` | `void` | Filtre par auteur (`null` = tous) |
| `.setTags(tags)` | `void` | Filtre par tags `{ taxonomy: [term, ...] }` |
| `.reset()` | `void` | Reinitialise tous les filtres |
| `.hasActive()` | `boolean` | Au moins un filtre actif ? |

```js
// Voir les filtres actifs
kanban.filters.get()

// Filtrer par priorite haute
kanban.filters.setTags({ priority: ['high'] })

// Combiner plusieurs filtres
kanban.filters.setAssignee('solo-user')
kanban.filters.setTags({ type: ['feature', 'bug'] })

// Verifier et reinitialiser
kanban.filters.hasActive()  // → true
kanban.filters.reset()
```

---

### `kanban.users.*` — UserService

| Methode | Retour | Description |
|---|---|---|
| `.list()` | `[{ id, name, initials, color, role }]` | Tous les utilisateurs |
| `.get(id)` | `Object \| null` | Utilisateur par ID |
| `.current()` | `Object \| null` | Utilisateur connecte |

```js
// Utilisateur courant (solo mode)
kanban.users.current()
// → { id: "solo-user", name: "Utilisateur", initials: "U", color: "#6c63ff", role: "admin" }

// Tous les utilisateurs
console.table(kanban.users.list())
```

---

### `kanban.app.*` — Navigation

Toutes les methodes sont **async**.

| Methode | Retour | Description |
|---|---|---|
| `.openBoard(id)` | `Promise<void>` | Charge et affiche un board |
| `.home()` | `Promise<void>` | Retour a la page d'accueil |
| `.explorer()` | `Promise<void>` | Ouvre l'explorateur IndexedDB |

```js
// Naviguer entre boards
const boards = await kanban.storage.boards()
await kanban.app.openBoard(boards[0].id)

// Retour a l'accueil
await kanban.app.home()

// Ouvrir l'explorateur de donnees
await kanban.app.explorer()
```

---

### `kanban.mappings.*` — Column Mapping (cartes miroir)

Gestion des mappings de colonnes entre boards. Necessite le plugin `column-mapping` actif.

| Methode | Retour | Description |
|---|---|---|
| `.list()` | `[{ localColumnId, sourceBoardId, sourceColumnId }]` | Mappings du board courant |
| `.add(colId, boardId, srcColId)` | `void` | Ajoute un mapping |
| `.remove(index)` | `void` | Supprime un mapping par index |
| `.clear()` | `void` | Supprime tous les mappings |
| `.refresh()` | `Promise<void>` | Recharge les boards sources depuis IndexedDB |

```js
// Lister les mappings
kanban.mappings.list()

// Ajouter un mapping : colonne locale ← board source / colonne source
const cols = kanban.columns.list()
const boards = await kanban.storage.boards()
kanban.mappings.add(cols[0].id, boards[1].id, 'col-xyz')

// Recharger les donnees des boards sources
await kanban.mappings.refresh()

// Supprimer le premier mapping
kanban.mappings.remove(0)

// Tout effacer
kanban.mappings.clear()
```

---

## Recettes utiles

### Exporter toutes les cartes en JSON

```js
JSON.stringify(kanban.cards.list(), null, 2)
```

### Compter les cartes par colonne

```js
console.table(kanban.columns.list().map(c => ({
    colonne: c.title,
    cartes: c.cardCount
})))
```

### Trouver les cartes sans tags

```js
kanban.cards.find(c => Object.keys(c.tags).length === 0)
    .map(c => c.title)
```

### Deplacer toutes les cartes d'une colonne a une autre

```js
const cols = kanban.columns.list()
const from = cols[0]  // source
const to = cols[1]    // destination
const cards = kanban.cards.list().filter(c => c.columnId === from.id)
cards.forEach(c => kanban.cards.move(c.id, from.id, to.id, 0))
```

### Surveiller les evenements en temps reel

```js
const log = (payload) => console.log('Event:', payload)
kanban.hooks.on('card:created', log)
kanban.hooks.on('card:moved', log)
kanban.hooks.on('card:deleted', log)
// Pour arreter :
// kanban.hooks.off('card:created', log)
```

### Creer un board de test avec des colonnes pre-remplies

```js
const id = await kanban.storage.createBoard('Test Board')
await kanban.app.openBoard(id)
kanban.columns.add('Todo')
kanban.columns.add('In Progress')
kanban.columns.add('Done')
const todoCol = kanban.columns.list()[0].id
kanban.cards.add(todoCol, { title: 'Premiere tache' })
kanban.cards.add(todoCol, { title: 'Deuxieme tache' })
```

### Lister les hooks par categorie

```js
const byCategory = {}
kanban.hooks.list().forEach(h => {
    const cat = h.category || 'Sans categorie'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(h.name)
})
console.table(byCategory)
```

---

## Desactiver le plugin

Le DevToolsPlugin se desactive comme tout plugin, via les parametres du board ou via sa propre API :

```js
await kanban.plugins.disable('dev-tools')
// window.kanban n'existe plus
```

Pour reactiver, ouvrir les parametres du board > Plugins > DevTools Console.
