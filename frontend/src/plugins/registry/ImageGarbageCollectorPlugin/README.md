# ImageGarbageCollectorPlugin

Supprime automatiquement les images orphelines dans IndexedDB après chaque sauvegarde de board.

---

## Architecture

```
ImageGarbageCollectorPlugin/
├── manifest.json                      — Métadonnées, hooks écoutés
├── index.js                           — Point d'entrée (assemblePlugin)
├── ImageGarbageCollectorPlugin.js     — Logique principale (scan + cleanup)
└── styles.js                          — Vide (requis par le pattern)
```

---

## Fonctionnement

### Hook écouté

| Hook          | Rôle                               |
| ------------- | ---------------------------------- |
| `board:saved` | Lance le GC (debounce 10 secondes) |

### Algorithme

1. Récupère toutes les images IndexedDB associées au board courant
2. Scanne le board pour collecter les IDs référencés (6 points de scan)
3. Supprime les images non référencées
4. Log le résultat (nombre + KB libérés)

### Points de scan

| Source                                 | Champ                                 |
| -------------------------------------- | ------------------------------------- |
| Board                                  | `backgroundImage.id`, `coverImage.id` |
| Carte (legacy)                         | `imageId`                             |
| Carte (widget)                         | `data.imageId`                        |
| Fichiers joints                        | `data.files[].id`                     |
| Markdown (descriptions + commentaires) | Pattern `![...](img:<id>)`            |
| Fichiers commentaires                  | `comments[].files[].id`               |

### Debounce

Le GC ne se lance pas à chaque sauvegarde — un debounce de 10 secondes évite les exécutions multiples lors de sauvegardes rapides successives.

---

## Comment modifier

### Ajouter un nouveau point de scan

Si un plugin stocke des images avec un nouveau pattern, ajouter le scan dans la méthode qui collecte les IDs référencés. Chercher les `_collect*` ou le parcours du board dans le fichier principal.
