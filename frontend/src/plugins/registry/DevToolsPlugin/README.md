# DevToolsPlugin

Expose `window.kanban` pour piloter le Kanban depuis la console devtools du navigateur.

## Architecture

```
DevToolsPlugin/
├── manifest.json         Métadonnées du plugin (priority: 1)
├── index.js              Point d'entrée (assemblePlugin)
├── DevToolsPlugin.js     Plugin principal — construit l'API window.kanban
└── README.md             Ce fichier
```

## Fonctionnement

### Installation / Désinstallation

- `install()` : crée `window.kanban` avec tous les namespaces
- `uninstall()` : supprime `window.kanban`

### Imports directs

Le plugin importe directement les singletons (pas de Container) :
`Application`, `BoardService`, `StorageService`, `UserService`, `FilterStore`, `Hooks`, `PluginManager`, `generateId`.

### API namespacée

```
window.kanban
├── board.*        Board model + métadonnées
├── columns.*      CRUD colonnes
├── cards.*        CRUD cartes + recherche
├── hooks.*        Introspection HookRegistry
├── plugins.*      Gestion PluginManager
├── storage.*      Multi-board + settings IndexedDB
├── filters.*      FilterStore
├── users.*        UserService
├── app.*          Navigation Application
└── help()         Aide formatée dans la console
```

Appeler `kanban.help()` dans la console pour voir le détail de chaque méthode.

### Feedback console

Chaque mutation affiche un feedback `console.log` avec un emoji :

- `✅` pour les succès
- `❌` pour les échecs

### Priorité 1

Le plugin est enregistré en premier (priority: 1) pour être disponible dès le démarrage de l'application.

## Comment modifier

### Ajouter un namespace

1. Créer `_buildXxxNamespace()` qui retourne un objet de méthodes
2. L'ajouter dans `_buildAPI()` : `xxx: this._buildXxxNamespace()`
3. Ajouter la section correspondante dans `_printHelp()`

### Ajouter une méthode à un namespace existant

1. Ajouter la méthode dans le `_buildXxxNamespace()` concerné
2. Ajouter la ligne dans `_printHelp()`

## Persistence

Aucune donnée persistée. Le plugin ne fait que connecter la console aux services existants.
