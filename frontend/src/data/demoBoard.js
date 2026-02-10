/**
 * demoBoard.js — Donnees de demonstration pour un board pre-rempli.
 *
 * Exporte une fonction qui genere un board avec des colonnes et cartes
 * de demonstration. Les IDs sont generes dynamiquement a chaque appel.
 */
import { generateId } from '../utils/id.js';

/**
 * Genere les colonnes et cartes de demonstration.
 *
 * @returns {Array} Colonnes avec cartes
 */
export function generateDemoColumns() {
    const now = new Date().toISOString();

    return [
        {
            id: generateId('col'),
            title: 'A faire',
            cards: [
                {
                    id: generateId('card'),
                    title: 'Definir les specs du projet',
                    description: `Rediger le **cahier des charges** avec les fonctionnalites principales.

### Livrables attendus
- Document de specs fonctionnelles
- Liste des *user stories*
- Criteres d'acceptation

> Le document doit etre valide par le PO avant de passer en dev.`,
                    tags: { priority: ['high'] },
                    createdAt: now,
                },
                {
                    id: generateId('card'),
                    title: 'Maquettes UI/UX',
                    description: `Creer les wireframes et les maquettes haute fidelite.

\`\`\`mermaid
graph LR
    A[Wireframes] --> B[Maquettes HD]
    B --> C[Prototype cliquable]
    C --> D[Validation PO]
    D -->|OK| E[Dev]
    D -->|Retour| B
\`\`\`

Outils : **Figma** ou Penpot.`,
                    tags: {},
                    createdAt: now,
                },
                {
                    id: generateId('card'),
                    title: 'Setup environnement de dev',
                    description: `Configurer le repo Git, CI/CD et les outils de developpement.

### Checklist
1. Initialiser le repo avec \`git init\`
2. Configurer le \`vite.config.js\`
3. Ajouter ESLint + Prettier
4. Pipeline CI : lint + build + tests

\`\`\`js
// vite.config.js
export default {
  root: 'src',
  build: { outDir: '../dist' }
}
\`\`\``,
                    tags: {},
                    createdAt: now,
                },
            ],
        },
        {
            id: generateId('col'),
            title: 'En cours',
            cards: [
                {
                    id: generateId('card'),
                    title: "Implementer l'authentification",
                    description: `Login, logout, gestion des sessions utilisateur.

\`\`\`mermaid
sequenceDiagram
    participant U as Utilisateur
    participant F as Frontend
    participant A as API
    U->>F: Saisit email + mdp
    F->>A: POST /auth/login
    A-->>F: JWT token
    F->>F: Stocke le token
    F-->>U: Redirige vers /dashboard
\`\`\`

**Securite** : hashage \`bcrypt\`, token JWT avec expiration 24h.`,
                    tags: { priority: ['medium'] },
                    createdAt: now,
                },
                {
                    id: generateId('card'),
                    title: 'API REST endpoints',
                    description: `Creer les endpoints CRUD pour les ressources principales.

| Methode | Route | Description |
|---------|-------|-------------|
| \`GET\` | /api/items | Liste paginee |
| \`POST\` | /api/items | Creation |
| \`PUT\` | /api/items/:id | Mise a jour |
| \`DELETE\` | /api/items/:id | Suppression |

Respecter les conventions **REST** et retourner les codes HTTP adaptes.`,
                    tags: {},
                    createdAt: now,
                },
            ],
        },
        {
            id: generateId('col'),
            title: 'Review',
            cards: [
                {
                    id: generateId('card'),
                    title: "Page d'accueil",
                    description: `Revue de code et tests de la landing page.

### Points de verification
- [ ] Responsive mobile / tablet / desktop
- [ ] Accessibilite (contraste, alt, focus)
- [ ] Performance (LCP < 2.5s)
- [ ] Tests unitaires passes`,
                    tags: {},
                    createdAt: now,
                },
            ],
        },
        {
            id: generateId('col'),
            title: 'Termine',
            cards: [
                {
                    id: generateId('card'),
                    title: 'Choix de la stack technique',
                    description: `Decision prise : **Vite** + Vanilla JS + IndexedDB.

\`\`\`mermaid
graph TD
    subgraph Frontend
        V[Vite] --> JS[Vanilla JS]
        JS --> SCSS[SCSS]
    end
    subgraph Storage
        IDB[(IndexedDB)]
    end
    JS --> IDB
\`\`\`

Pas de framework lourd pour garder la *simplicite* et les *performances*.`,
                    tags: {},
                    createdAt: now,
                },
                {
                    id: generateId('card'),
                    title: 'Creation du repo',
                    description: 'Repository initialise avec la structure de base.',
                    tags: {},
                    createdAt: now,
                },
            ],
        },
    ];
}
