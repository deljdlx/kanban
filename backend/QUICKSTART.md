# Guide de démarrage rapide - Backend Kanban

## Installation

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
```

## Démarrage

```bash
php artisan serve
```

Le backend sera accessible sur `http://localhost:8000`

## Accès rapide

- **API Base URL** : `http://localhost:8000/api`
- **Documentation interactive** : `http://localhost:8000/docs/api`

## Utilisateurs de test

Créés automatiquement par les seeders :

| Email | Password | Rôle | Permissions |
|-------|----------|------|-------------|
| admin@kanban.local | password | admin | Toutes |
| member@kanban.local | password | member | Gestion cartes + commentaires |
| viewer@kanban.local | password | viewer | Lecture + commentaires |

## Exemple d'utilisation

### 1. Se connecter

```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@kanban.local",
    "password": "password"
  }'
```

Réponse :
```json
{
  "user": {
    "id": "...",
    "name": "Admin User",
    "email": "admin@kanban.local"
  },
  "token": "1|abcdef..."
}
```

### 2. Créer un board

```bash
curl -X POST http://localhost:8000/api/boards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "Mon Projet",
    "data": {
      "columns": []
    }
  }'
```

### 3. Ajouter des colonnes via operations

```bash
curl -X POST http://localhost:8000/api/boards/{boardId}/ops \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "ops": [
      {
        "type": "column:add",
        "column": {
          "id": "col-1",
          "title": "À faire",
          "cards": []
        },
        "index": 0
      }
    ],
    "clientRevision": 0
  }'
```

### 4. Récupérer le snapshot du board

```bash
curl http://localhost:8000/api/boards/{boardId} \
  -H "Authorization: Bearer {token}"
```

## Tests

```bash
# Tous les tests
php artisan test

# Tests spécifiques
php artisan test --filter=AuthTest
php artisan test --filter=BoardTest
php artisan test --filter=IntegrationTest

# Avec couverture
php artisan test --coverage
```

## Code quality

```bash
# Formater le code
./vendor/bin/pint

# Lister les routes
php artisan route:list --path=api
```

## Connexion avec le frontend

Le frontend Vite doit configurer l'adaptateur REST :

```javascript
import RestBackendAdapter from './sync/RestBackendAdapter.js';

const adapter = new RestBackendAdapter({
  baseUrl: 'http://localhost:8000',
  getHeaders: () => ({
    'Authorization': `Bearer ${localStorage.getItem('apiToken')}`
  })
});
```

## Structure du projet

```
backend/
├── app/
│   ├── Http/Controllers/Api/  # Controllers API
│   │   ├── AuthController.php
│   │   ├── BoardController.php
│   │   ├── BoardOpsController.php
│   │   ├── ImageController.php
│   │   ├── TaxonomyController.php
│   │   └── UserController.php
│   └── Models/                # Modèles Eloquent
│       ├── Board.php
│       ├── Image.php
│       ├── OpsLog.php
│       ├── Taxonomy.php
│       └── User.php
├── database/
│   ├── migrations/            # Migrations
│   ├── seeders/              # Seeders
│   │   ├── RolesAndPermissionsSeeder.php
│   │   └── TestDataSeeder.php
│   └── factories/            # Factories pour tests
├── routes/
│   └── api.php               # Routes API
├── tests/
│   └── Feature/              # Tests fonctionnels
│       ├── AuthTest.php
│       ├── BoardTest.php
│       ├── BoardOpsTest.php
│       └── IntegrationTest.php
└── README_API.md             # Documentation détaillée
```

## Endpoints principaux

| Méthode | URL | Description |
|---------|-----|-------------|
| POST | /api/login | Connexion |
| POST | /api/logout | Déconnexion |
| GET | /api/me | Profil utilisateur |
| GET | /api/boards | Liste des boards |
| POST | /api/boards | Créer un board |
| GET | /api/boards/{id} | Détails d'un board |
| PUT | /api/boards/{id} | Mettre à jour un board |
| DELETE | /api/boards/{id} | Supprimer un board |
| POST | /api/boards/{id}/ops | Push operations |
| GET | /api/boards/{id}/ops | Pull operations |
| POST | /api/boards/{id}/images | Upload image |
| GET | /api/images/{id} | Télécharger image |
| DELETE | /api/images/{id} | Supprimer image |
| GET | /api/taxonomies | Liste des taxonomies |
| GET | /api/users | Liste des utilisateurs |

## Opérations de synchronisation

Types d'opérations supportées :

- `board:name` - Modifier nom du board
- `board:backgroundImage` - Modifier image de fond
- `board:pluginData` - Modifier données plugin
- `column:add` - Ajouter colonne
- `column:remove` - Supprimer colonne
- `column:reorder` - Réordonner colonnes
- `column:title` - Modifier titre colonne
- `column:pluginData` - Modifier données plugin colonne
- `column:cards` - Remplacer cartes d'une colonne

## Dépannage

### Erreur 500 sur /api/login

Vérifier que les seeders ont été exécutés :
```bash
php artisan migrate:fresh --seed
```

### CORS bloqué

Vérifier `SANCTUM_STATEFUL_DOMAINS` dans `.env` :
```env
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173
```

### Tests échouent

Régénérer la base de données de test :
```bash
php artisan migrate:fresh --seed --env=testing
```

## Prochaines étapes

1. Démarrer le frontend Vite : `cd ../frontend && npm run dev`
2. Configurer le RestBackendAdapter dans le frontend
3. Tester la synchronisation entre frontend et backend
4. Explorer la documentation API interactive sur `/docs/api`

## Liens utiles

- [Laravel 12 Documentation](https://laravel.com/docs/12.x)
- [Sanctum Authentication](https://laravel.com/docs/12.x/sanctum)
- [Spatie Permission](https://spatie.be/docs/laravel-permission)
- [Scramble API Docs](https://scramble.dedoc.co)
