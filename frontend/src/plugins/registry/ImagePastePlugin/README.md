# ImagePastePlugin

Coller des images depuis le presse-papier dans les descriptions et commentaires.

---

## Architecture

```
ImagePastePlugin/
├── manifest.json      — Métadonnées, hooks écoutés
├── index.js           — Point d'entrée (assemblePlugin)
├── ImagePastePlugin.js — Logique principale (paste, stockage)
└── styles.js          — Vide (requis par le pattern)
```

---

## Fonctionnement

### Deux mécanismes de capture

| Cible             | Mécanisme                    | Déclencheur                                      |
| ----------------- | ---------------------------- | ------------------------------------------------ |
| Description carte | Hook `modal:editCard:opened` | Attache un listener `paste` sur le textarea      |
| Commentaires      | Délégation document          | Capture `paste` sur `.card-detail-comment-input` |

### Flux de paste

```
Ctrl+V avec image dans le presse-papier
    │
    ▼
clipboardData.items → file (image/*)
    │
    ▼
ImageStorageService.store(file, boardId, cardId)
    │
    ▼
Insère ![image](img:<id>) dans le textarea à la position du curseur
    │
    ▼
MarkdownPlugin résout img:<id> → blob URL au rendu
```

### Marqueur unique

Un marqueur temporaire `[uploading-<uuid>...]` est inséré pendant l'upload pour éviter les collisions si l'utilisateur colle plusieurs images rapidement. Il est remplacé par le markdown final une fois l'upload terminé.

---

## Comment modifier

### Supporter le paste dans un nouveau champ

Ajouter un listener `paste` sur le nouveau textarea, en réutilisant la méthode `_handlePaste()` existante.

### Ajouter un redimensionnement avant stockage

Intercepter le fichier entre la lecture du clipboard et `ImageStorageService.store()` pour passer par un `<canvas>`.
