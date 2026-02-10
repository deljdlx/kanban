# PriorityTaxonomyPlugin

Taxonomie "Priorité" pour classifier les cartes (Haute, Moyenne, Basse).

---

## Architecture

```
PriorityTaxonomyPlugin/
└── index.js   — Configuration + appel à la factory
```

Plugin mono-fichier généré par `TaxonomyPluginFactory` (`src/plugins/lib/TaxonomyPluginFactory.js`).

---

## Fonctionnement

Identique à `ComplexityTaxonomyPlugin` — voir la documentation de la factory.

### Termes par défaut

| Clé      | Label   | Couleur            |
| -------- | ------- | ------------------ |
| `high`   | Haute   | `#ff4444` (rouge)  |
| `medium` | Moyenne | `#ffaa00` (orange) |
| `low`    | Basse   | `#44bb44` (vert)   |

### Persistence

- **Valeur par carte** : `card.tags.priority`
- **Termes personnalisés** : IndexedDB via `StorageService`

---

## Comment modifier

Voir `ComplexityTaxonomyPlugin/README.md` — même pattern exact.
