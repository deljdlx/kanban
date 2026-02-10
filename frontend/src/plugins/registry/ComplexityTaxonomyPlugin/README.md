# ComplexityTaxonomyPlugin

Taxonomie "Complexité" pour classifier les cartes (Simple, Moyenne, Complexe).

---

## Architecture

```
ComplexityTaxonomyPlugin/
└── index.js   — Configuration + appel à la factory
```

Plugin mono-fichier généré par `TaxonomyPluginFactory` (`src/plugins/lib/TaxonomyPluginFactory.js`).

---

## Fonctionnement

### Factory

Tout est géré par `createTaxonomyPlugin()` :

- Enregistrement dans `FilterService` et `TagDefinitionRegistry`
- Badges colorés sur les cartes
- Checkboxes dans les modales d'édition/création
- Dropdown de filtre dans le header
- Panneau de settings pour personnaliser les termes
- Persistence des termes personnalisés dans IndexedDB

### Termes par défaut

| Clé        | Label    | Couleur            |
| ---------- | -------- | ------------------ |
| `simple`   | Simple   | `#44bb44` (vert)   |
| `moyenne`  | Moyenne  | `#ffaa00` (orange) |
| `complexe` | Complexe | `#ff4444` (rouge)  |

### Persistence

- **Valeur par carte** : `card.tags.complexity` → `'simple'` | `'moyenne'` | `'complexe'`
- **Termes personnalisés** : IndexedDB via `StorageService`

---

## Comment modifier

### Ajouter un terme par défaut

Modifier le tableau `defaultTerms` dans `index.js` :

```js
defaultTerms: [
    { key: 'simple', label: 'Simple', color: '#44bb44' },
    { key: 'moyenne', label: 'Moyenne', color: '#ffaa00' },
    { key: 'complexe', label: 'Complexe', color: '#ff4444' },
    { key: 'extreme', label: 'Extrême', color: '#9b59b6' },
],
```

### Créer une nouvelle taxonomie

Copier `index.js`, changer `taxonomyKey`, `label`, `filterLabel` et `defaultTerms`. Enregistrer dans `src/plugins/registry/index.js`.
