# ImageDropPlugin

Déposer une image sur une colonne pour créer une carte image.

---

## Architecture

```
ImageDropPlugin/
├── manifest.json      — Métadonnées, hooks écoutés
├── index.js           — Point d'entrée (assemblePlugin)
├── ImageDropPlugin.js — Logique principale (drop, rendu, viewer)
└── styles.js          — Styles CSS injectés
```

---

## Fonctionnement

### Type de carte

Type enregistré : `widget:image` via `CardTypeRegistry`.

### Structure de données

```js
// card.data
{
    imageId: 'img-uuid';
}
```

L'image est stockée dans IndexedDB. `imageId` est la référence pour la résolution async de l'URL blob.

### Hooks écoutés

| Hook                             | Rôle                                                    |
| -------------------------------- | ------------------------------------------------------- |
| `board:rendered`                 | Attache les listeners de drop sur chaque `.column-body` |
| `card:renderBody`                | Remplace le body par l'image (résolution async)         |
| `card:typeActivated`             | Active le rendu quand le type est reconnu dynamiquement |
| `modal:cardDetail:renderContent` | Affiche l'image en grand dans la modale détail          |

### Flux de drop

```
Drop image sur .column-body
    │
    ▼
Overlay visuel "Déposer l'image ici"
    │
    ▼
ImageStorageService.store(file, boardId)
    │
    ▼
Création carte { type: 'widget:image', data: { imageId } }
```

### Rendu async

Le widget affiche un squelette (placeholder) pendant la résolution de l'URL blob depuis IndexedDB. Le clic sur l'image ouvre un viewer plein écran.

---

## Comment modifier

### Supporter le drop de plusieurs images

Dans le handler `drop`, itérer sur `e.dataTransfer.files` au lieu de prendre uniquement `files[0]`.

### Ajouter un redimensionnement

Avant `ImageStorageService.store()`, utiliser un `<canvas>` pour redimensionner l'image si elle dépasse une taille maximale.
