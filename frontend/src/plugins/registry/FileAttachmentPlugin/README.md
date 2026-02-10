# FileAttachmentPlugin

Attacher des fichiers (tous types) à une carte avec upload, téléchargement et suppression.

---

## Architecture

```
FileAttachmentPlugin/
├── manifest.json              — Métadonnées, hooks écoutés
├── index.js                   — Point d'entrée (assemblePlugin)
├── FileAttachmentPlugin.js    — Logique principale (upload, rendu, CRUD)
└── styles.js                  — Styles CSS injectés (grille de fichiers)
```

---

## Fonctionnement

### Hooks écoutés

| Hook                             | Rôle                                              |
| -------------------------------- | ------------------------------------------------- |
| `modal:cardDetail:renderContent` | Grille lecture seule (icône MIME, téléchargement) |
| `modal:editCard:opened`          | Onglet "Fichiers" avec UploadZone + gestion       |
| `card:rendered`                  | Badge `📎 N` sur les cartes avec fichiers         |
| `card:deleted`                   | Cleanup des blobs IndexedDB orphelins             |

### Structure de données

```js
// card.data.files
[
    {
        id: 'file-uuid',
        name: 'rapport.pdf',
        size: 102400,
        mimeType: 'application/pdf',
        createdAt: '2026-01-15T10:00:00Z',
        description: 'Rapport Q4',
    },
];
```

Les blobs sont stockés dans IndexedDB via `StorageService.storeImage()`. Les métadonnées sont dans `card.data.files`.

### Onglet "Fichiers" (modale édition)

- `UploadZone` (composant réutilisable) en mode standard (zone dashed)
- Grille CSS Grid responsive (`auto-fill, minmax(160px, 1fr)`)
- Description éditable inline
- Bouton téléchargement + bouton suppression par fichier

### Badge

Un badge `📎 N` est injecté sur chaque carte ayant des fichiers, via un scan DOM après rendu.

---

## Comment modifier

### Limiter la taille des fichiers

Ajouter un guard dans le handler d'upload :

```js
if (file.size > MAX_SIZE) {
    alert('Fichier trop volumineux');
    return;
}
```

### Ajouter un aperçu image

Dans la grille de fichiers, vérifier `mimeType.startsWith('image/')` et afficher un `<img>` via `StorageService.getUrl(file.id)`.
