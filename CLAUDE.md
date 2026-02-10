# Instructions Claude — Projet Kanban

## Structure du dépôt

```
/                   ← racine git
├── frontend/       ← application frontend (Vite + Vanilla JS)
│   ├── src/        ← code source
│   ├── public/     ← fichiers statiques
│   ├── docs/       ← documentation technique
│   ├── package.json
│   └── ...
├── .husky/         ← hooks git (pre-commit)
├── CLAUDE.md       ← ce fichier
└── .gitignore
```

> **Toutes les commandes npm doivent être exécutées depuis `frontend/`.**
> Ex : `cd frontend && npx eslint src/` ou `cd frontend && npx vitest run`

---

## Principe fondamental

> **La compréhensibilité du code > all**
>
> Un développeur noob doit pouvoir comprendre le code en le lisant.
> Chaque fichier doit être auto-explicatif. Privilégier la clarté à la concision.
---

## Conventions de code

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
1. **En-tête de fichier** : rôle du module
2. **Relations complexes** : schéma ASCII si nécessaire
3. **Pourquoi, pas quoi** : expliquer les décisions, pas paraphraser le code
4. **JSDoc** : pour chaque classe/méthode/propriété

### Review de code
Charge le fichier .claude/review.md et applique la procédure de revue.

### Diagrammes Mermaid
Toujours utiliser le thème clair avec cette directive en première ligne :
```
%%{init: {'theme': 'default'}}%%
```

---

## Vérification obligatoire

> **Après toute modification de fichier `.js`, lancer `cd frontend && npx eslint <fichiers modifiés>` et corriger les erreurs avant de considérer la tâche terminée.**

- Lancer ESLint sur chaque fichier JS créé ou modifié (depuis `frontend/`)
- Les **erreurs** doivent être corrigées immédiatement
- Les **warnings** sur du code existant (non modifié) peuvent être ignorés

---

## Documentation obligatoire

> **Toute modification du code DOIT s'accompagner de la mise à jour de la documentation dans `frontend/docs/`.**

Les 4 fichiers de documentation doivent refléter l'état actuel du code à tout moment :

| Fichier | Contenu |
|---|---|
| `frontend/docs/ARCHITECTURE.md` | Couches, init, routing, container, conventions |
| `frontend/docs/PLUGIN-SYSTEM.md` | Hooks, lifecycle plugins, catalogue hooks, guide création plugin |
| `frontend/docs/DATA-MODELS.md` | Modèles, events, persistence IndexedDB, multi-board |
| `frontend/docs/VIEWS-UI.md` | Vues, modales, permissions, styles SCSS |

### Quand mettre à jour
- **Ajout/suppression d'un hook** → mettre à jour le catalogue dans `frontend/docs/PLUGIN-SYSTEM.md`
- **Nouveau model ou propriété** → mettre à jour le graphe dans `frontend/docs/DATA-MODELS.md`
- **Nouvelle vue, modale ou bouton** → mettre à jour `frontend/docs/VIEWS-UI.md`
- **Nouvelle permission** → mettre à jour le graphe permissions dans `frontend/docs/VIEWS-UI.md`
- **Nouveau service ou plugin** → mettre à jour `frontend/docs/ARCHITECTURE.md` et/ou `frontend/docs/PLUGIN-SYSTEM.md`
- **Changement d'architecture (routing, init, storage)** → mettre à jour `frontend/docs/ARCHITECTURE.md` et `frontend/docs/DATA-MODELS.md`
- **Modification d'un plugin** → mettre à jour le `README.md` dans le dossier du plugin

### README de plugin

> **Chaque plugin possède un `README.md` dans son dossier. Il DOIT être mis à jour à chaque modification du plugin.**

Le README d'un plugin documente :
- **Rôle** : ce que fait le plugin en une phrase
- **Architecture** : arbre des fichiers avec rôle de chacun
- **Fonctionnement** : mécanismes internes (hooks, DOM, persistence)
- **Comment modifier** : checklist pas-à-pas pour les cas courants (ajouter un effet, un setting, etc.)
- **Persistence** : format IndexedDB si applicable (clé, structure, migrations)

### Changelog

> **Fichier `frontend/CHANGELOG.md` — un changelog par semaine.**

- Regrouper les changements par semaine (titre : `## Semaine du <lundi> <mois> <année>`)
- Sections par type : `Fonctionnalités`, `Corrections critiques`, `Corrections hautes`, `Tests`, `Documentation`, `Infrastructure`
- N'inclure que les sections pertinentes (pas de section vide)
- Chaque entrée : une ligne concise avec les fichiers impactés entre parenthèses
- Mettre à jour le changelog **à chaque session de travail** qui produit des modifications
