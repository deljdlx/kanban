# Instructions Copilot — Projet Kanban

## Structure du dépôt

```
/                   ← racine git
├── frontend/       ← application frontend (Vite + Vanilla JS)
│   ├── src/        ← code source JS
│   ├── vendor/     ← librairies tierces (pickr) — servi par Vite publicDir
│   ├── mocks/      ← données mock API pour le dev (servi par plugin Vite)
│   ├── docs/       ← documentation technique
│   ├── package.json
│   └── ...
├── backend/        ← API Laravel 12
│   ├── app/
│   ├── routes/
│   ├── database/
│   └── ...
├── .husky/         ← hooks git (pre-commit: cd frontend && npx lint-staged)
├── CLAUDE.md       ← instructions Claude Code
└── .gitignore
```

**Toutes les commandes npm depuis `frontend/`** : `cd frontend && npx eslint src/`
**Toutes les commandes artisan depuis `backend/`** : `cd backend && php artisan ...`

---

## Principe fondamental

**La compréhensibilité du code > all.**
Un développeur junior doit pouvoir comprendre le code en le lisant.
Chaque fichier doit être auto-explicatif. Privilégier la clarté à la concision.

---

## Frontend — Conventions JS

### Style PHP8-like

```js
class MyClass {
    /**
     * @type {string}
     */
    _privateField;

    constructor(dependency) {
        this._privateField = null;
        this._dependency = dependency;
    }

    get privateField() {
        return this._privateField;
    }
}
```

### Nommage

- Classes : `PascalCase`
- Méthodes/variables : `camelCase`
- Propriétés privées : `_prefixUnderscore`
- Fichiers : `PascalCase.js` pour classes, `camelCase.js` pour utilitaires

### Commentaires obligatoires

1. **En-tête de fichier** : rôle du module en commentaire JSDoc
2. **JSDoc** : pour chaque classe, méthode et propriété
3. **Pourquoi, pas quoi** : expliquer les décisions, pas paraphraser le code
4. **Relations complexes** : schéma ASCII si nécessaire

### Architecture frontend

- **Storage 100% IndexedDB** (pas de localStorage) — DB version 2
  - Stores : `meta`, `boards`, `images`, `sync-queue`
- **Offline-first** : IndexedDB = source de vérité, backend = miroir
- **Plugin system** : chaque plugin a un `manifest.json`, un `install(hooks)`, un `uninstall(hooks)`
- **Services async** : `StorageService.get/set/remove` sont tous `async`
- **Sync ops-based** : `BoardDiffer` diff snapshots → ops typées, `SyncQueue` persiste en IndexedDB
- **Container** : registre de services singleton (`Container.set/get/has`)
- **HookRegistry** : système d'événements (actions + filtres) avec priorités

### ESLint

- Lancer `cd frontend && npx eslint <fichiers modifiés>` après toute modification
- Les **erreurs** doivent être corrigées immédiatement
- Unused params : préfixer avec `_` (ex: `_event`)
- `console.log` interdit (utiliser `console.warn` ou `console.error`)

---

## Backend — Conventions Laravel

### Stack

- Laravel 12, PHP 8.3+
- `laravel/sanctum` — auth API par tokens
- `spatie/laravel-permission` — rôles et permissions granulaires
- `spatie/laravel-query-builder` — filtres/tri sur les endpoints GET
- `intervention/image` — traitement d'images
- `pestphp/pest` — tests

### Conventions PHP

- PSR-12 (via Laravel Pint)
- Models avec UUID (`HasUuids` trait) — attention aux `uuidMorphs` pour Sanctum et Spatie
- Form Requests pour la validation
- API Resources pour normaliser les réponses JSON
- Transactions + `lockForUpdate()` pour les opérations concurrentes (surtout ops sync)

### Endpoints API

| Méthode | URL | Auth | Description |
|---------|-----|------|-------------|
| POST | `/api/login` | non | Login → token Sanctum |
| POST | `/api/logout` | oui | Revoke token |
| GET | `/api/me` | oui | User courant |
| GET | `/api/users` | oui | Liste users |
| GET | `/api/taxonomies` | oui | Taxonomies de tags |
| GET | `/api/boards` | oui | Liste boards |
| GET | `/api/boards/{id}` | oui | Snapshot board |
| PUT | `/api/boards/{id}` | oui | Push snapshot |
| POST | `/api/boards` | oui | Créer board |
| DELETE | `/api/boards/{id}` | oui | Supprimer board |
| POST | `/api/boards/{id}/ops` | oui | Push ops sync |
| GET | `/api/boards/{id}/ops?since=N` | oui | Pull ops sync |
| POST | `/api/boards/{id}/images` | oui | Upload image |
| GET | `/api/images/{id}` | oui | Download image |
| DELETE | `/api/images/{id}` | oui | Supprimer image |

### Rôles et permissions (Spatie)

| Rôle | Droits |
|------|--------|
| `admin` | Tout |
| `member` | CRUD cartes, déplacer, commenter |
| `viewer` | Lecture + commenter |

### Sync ops — Types d'opérations

Board-level : `board:name`, `board:backgroundImage`, `board:pluginData`
Column-level : `column:add`, `column:remove`, `column:reorder`, `column:title`, `column:pluginData`, `column:cards`

Le backend stocke les ops dans `ops_log` et incrémente `server_revision` sur le board. Toujours utiliser `lockForUpdate()` + transaction pour éviter les race conditions.

---

## Documentation obligatoire

Toute modification du code **frontend** doit s'accompagner de la mise à jour des docs dans `frontend/docs/` :

| Fichier | Contenu |
|---------|---------|
| `frontend/docs/ARCHITECTURE.md` | Couches, init, routing, container |
| `frontend/docs/PLUGIN-SYSTEM.md` | Hooks, lifecycle plugins, catalogue hooks |
| `frontend/docs/DATA-MODELS.md` | Modèles, events, persistence IndexedDB |
| `frontend/docs/VIEWS-UI.md` | Vues, modales, permissions, styles |

Chaque plugin a un `README.md` dans son dossier. Le mettre à jour à chaque modification.

Changelog : `frontend/CHANGELOG.md` — un changelog par semaine.

---

## Vérifications avant commit

### Frontend
```bash
cd frontend && npx eslint src/  # 0 erreurs
cd frontend && npx vitest run   # tous les tests passent
```

### Backend
```bash
cd backend && ./vendor/bin/pint --test      # code style
cd backend && ./vendor/bin/phpstan analyse  # analyse statique
cd backend && php artisan test              # tests Pest
```
