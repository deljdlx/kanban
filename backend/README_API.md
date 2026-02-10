# Kanban Backend API

API REST Laravel 12 pour l'application Kanban.

## Stack

- **Laravel 12** - Framework PHP
- **Sanctum** - Authentification API par tokens
- **Spatie Permission** - Gestion des rôles et permissions
- **Spatie Query Builder** - Filtres et tri sur les endpoints GET
- **Intervention Image** - Traitement d'images
- **Scramble** - Documentation API auto-générée

## Installation

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
```

## Configuration

### Base de données

Par défaut, SQLite est utilisé (`database/database.sqlite`). Pour utiliser MySQL/PostgreSQL, modifier `.env` :

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=kanban
DB_USERNAME=root
DB_PASSWORD=
```

### CORS & Sanctum

Pour autoriser le frontend :

```env
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173
SESSION_DOMAIN=localhost
```

### Stockage des images

Par défaut : `storage/app/images/`

Configurable S3 dans `config/filesystems.php`

## Démarrage

```bash
php artisan serve
```

L'API sera disponible sur `http://localhost:8000/api`

## Documentation API

Documentation interactive générée par Scramble :

```
http://localhost:8000/docs/api
```

## Authentification

### Login

```http
POST /api/login
Content-Type: application/json

{
  "email": "admin@kanban.local",
  "password": "password"
}
```

Réponse :
```json
{
  "user": { "id": "...", "name": "Admin User", "email": "admin@kanban.local" },
  "token": "1|..."
}
```

### Utiliser le token

Ajouter le header à chaque requête :

```
Authorization: Bearer {token}
```

### Logout

```http
POST /api/logout
Authorization: Bearer {token}
```

## Endpoints principaux

### Auth

- `POST /api/login` - Connexion
- `POST /api/logout` - Déconnexion
- `GET /api/me` - Profil utilisateur courant

### Utilisateurs

- `GET /api/users` - Liste des utilisateurs (admin only)

### Boards

- `GET /api/boards` - Liste des boards
- `GET /api/boards/{id}` - Détails d'un board
- `POST /api/boards` - Créer un board
- `PUT /api/boards/{id}` - Mettre à jour un board
- `DELETE /api/boards/{id}` - Supprimer un board

### Sync Operations

- `POST /api/boards/{id}/ops` - Push operations
- `GET /api/boards/{id}/ops?since={rev}` - Pull operations

### Images

- `POST /api/boards/{boardId}/images` - Upload image
- `GET /api/images/{id}` - Télécharger image
- `DELETE /api/images/{id}` - Supprimer image

### Taxonomies

- `GET /api/taxonomies` - Liste des taxonomies

## Rôles et permissions

### Rôles

| Rôle   | Description                        |
|--------|------------------------------------|
| admin  | Accès total                        |
| member | Gestion des cartes et commentaires |
| viewer | Lecture seule + commentaires       |

### Permissions

| Permission       | admin | member | viewer |
|------------------|-------|--------|--------|
| board.create     | ✓     |        |        |
| board.edit       | ✓     |        |        |
| board.delete     | ✓     |        |        |
| board.view       | ✓     | ✓      | ✓      |
| card.create      | ✓     | ✓      |        |
| card.edit        | ✓     | ✓      |        |
| card.delete      | ✓     | ✓      |        |
| image.upload     | ✓     | ✓      |        |
| image.delete     | ✓     | ✓      |        |
| comment.create   | ✓     | ✓      | ✓      |
| comment.edit.own | ✓     | ✓      | ✓      |

## Tests

```bash
# Tous les tests
php artisan test

# Tests spécifiques
php artisan test --filter=AuthTest
php artisan test --filter=BoardTest
php artisan test --filter=BoardOpsTest
```

## Code quality

```bash
# Formater le code (PSR-12)
./vendor/bin/pint

# Analyse statique (PHPStan)
./vendor/bin/phpstan analyse
```

## Utilisateurs de test

Créés automatiquement par le seeder :

| Email                  | Password | Rôle   |
|------------------------|----------|--------|
| admin@kanban.local     | password | admin  |
| member@kanban.local    | password | member |
| viewer@kanban.local    | password | viewer |

## Structure des données

### Board

```json
{
  "id": "uuid",
  "name": "My Kanban Board",
  "data": {
    "columns": [
      {
        "id": "col-1",
        "title": "To Do",
        "cards": []
      }
    ]
  },
  "serverRevision": 0
}
```

### Operations

Types d'opérations supportées :

- `board:name` - Modifier le nom du board
- `board:backgroundImage` - Modifier l'image de fond
- `board:pluginData` - Modifier les données de plugin
- `column:add` - Ajouter une colonne
- `column:remove` - Supprimer une colonne
- `column:reorder` - Réordonner les colonnes
- `column:title` - Modifier le titre d'une colonne
- `column:pluginData` - Modifier les données de plugin d'une colonne
- `column:cards` - Remplacer les cartes d'une colonne

## Troubleshooting

### Erreur 500 sur /api/login

Vérifier que la table `users` a bien les colonnes `initials` et `color`.

### CORS bloqué

Vérifier `SANCTUM_STATEFUL_DOMAINS` dans `.env`.

### Token invalide

Régénérer le token :
```bash
php artisan sanctum:purge-expired
```

## Contribution

1. Formatter le code : `./vendor/bin/pint`
2. Lancer les tests : `php artisan test`
3. Vérifier la documentation : `http://localhost:8000/docs/api`
