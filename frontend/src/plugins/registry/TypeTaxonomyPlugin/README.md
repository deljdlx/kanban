# TypeTaxonomyPlugin

Taxonomie "Type" pour classifier les cartes (Feature, Bug, UX).

---

## Architecture

```
TypeTaxonomyPlugin/
└── index.js   — Configuration + appel à la factory
```

Plugin mono-fichier généré par `TaxonomyPluginFactory` (`src/plugins/lib/TaxonomyPluginFactory.js`).

---

## Fonctionnement

Identique à `ComplexityTaxonomyPlugin` — voir la documentation de la factory.

### Termes par défaut

| Clé       | Label   | Couleur            |
| --------- | ------- | ------------------ |
| `feature` | Feature | `#6c63ff` (violet) |
| `bug`     | Bug     | `#ff6b6b` (rouge)  |
| `ux`      | UX      | `#ffc857` (jaune)  |

### Persistence

- **Valeur par carte** : `card.tags.type`
- **Termes personnalisés** : IndexedDB via `StorageService`

---

## Comment modifier

Voir `ComplexityTaxonomyPlugin/README.md` — même pattern exact.
