# UploadZone & Utilitaires fichier

> Composant reutilisable d'upload et fonctions d'affichage de fichiers.

**Docs connexes** : [Views & UI](./VIEWS-UI.md) | [Plugin System](./PLUGIN-SYSTEM.md) | [Data Models](./DATA-MODELS.md)

---

## Vue d'ensemble

Trois modules independants, zero logique metier :

| Module | Fichier | Role |
|---|---|---|
| `UploadZone` | `src/components/UploadZone.js` | Composant DOM d'upload (browse + drag-drop) |
| `getFileIcon` | `src/utils/file.js` | Emoji par type MIME |
| `formatFileSize` | `src/utils/file.js` | Taille lisible (`1.2 MB`) |

Styles dans `src/styles/components/_upload-zone.scss` (charge via `main.scss`).

---

## UploadZone

### Import

```js
import UploadZone from '../components/UploadZone.js';
```

### Deux modes

```
Mode standard                    Mode compact
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│                         │      ┌──────┐
│  Glisser un fichier     │      │  📎  │
│  ici ou [parcourir]     │      └──────┘
│                         │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
  Zone dashed + drag-drop         Bouton seul
  Cas : onglet, panel             Cas : formulaire inline
```

### Constructeur

```js
new UploadZone({
    onFiles,        // (FileList) => void  — seul param obligatoire
    label,          // string  — texte zone standard (defaut: 'Glisser un fichier ici ou ')
    multiple,       // boolean — selection multiple (defaut: false)
    accept,         // string  — filtre MIME, ex: 'image/*,.pdf' (defaut: '')
    compact,        // boolean — mode compact bouton (defaut: false)
    browseLabel,    // string  — texte du lien parcourir (defaut: 'parcourir')
})
```

### Methodes

| Methode | Retour | Description |
|---|---|---|
| `render()` | `HTMLElement` | Construit et retourne l'element DOM |
| `destroy()` | `void` | Retire les listeners drag-drop, libere les references |

### Exemples

**Mode standard** — onglet fichiers d'un plugin :

```js
const zone = new UploadZone({
    onFiles: (fileList) => this._handleUpload(fileList),
    multiple: true,
});
panel.appendChild(zone.render());

// Plus tard, au demontage :
zone.destroy();
```

**Mode compact** — bouton 📎 dans un formulaire :

```js
const zone = new UploadZone({
    onFiles: (fileList) => this._addPendingFiles(fileList),
    multiple: true,
    compact: true,
});
actionsBar.appendChild(zone.render());
```

**Filtrer par type** — images uniquement :

```js
const zone = new UploadZone({
    onFiles: (files) => handleImages(files),
    accept: 'image/*',
});
```

**Textes personnalises** :

```js
const zone = new UploadZone({
    onFiles: callback,
    label: 'Deposer une image ici ou ',
    browseLabel: 'choisir un fichier',
});
```

### Lifecycle

```
new UploadZone(options)
        │
        ▼
    render()  ──►  HTMLElement ajoute au DOM
        │
        │          L'utilisateur browse ou drop des fichiers
        │                    │
        │                    ▼
        │              onFiles(FileList) est appele
        │
        ▼
    destroy()  ──►  Listeners retires, references nullees
```

**Important** : toujours appeler `destroy()` avant de retirer l'element du DOM, surtout en mode standard (qui attache 4 listeners drag-drop). En mode compact, `destroy()` est un no-op safe.

### Classes CSS

| Classe | Element | Mode |
|---|---|---|
| `.upload-zone` | Conteneur racine | Les deux |
| `.upload-zone--dragover` | Etat survol drag | Standard |
| `.upload-zone--compact` | Modificateur compact | Compact |
| `.upload-zone-label` | Texte "Glisser un fichier..." | Standard |
| `.upload-zone-browse` | Lien/bouton "parcourir" | Standard |
| `.upload-zone-attach-btn` | Bouton 📎 | Compact |

---

## Utilitaires fichier

### Import

```js
import { getFileIcon, formatFileSize } from '../utils/file.js';
```

### `getFileIcon(mimeType)`

Retourne un emoji representant le type de fichier.

```js
getFileIcon('application/pdf')     // '📄'
getFileIcon('image/png')           // '🖼️'
getFileIcon('video/mp4')           // '🎬'
getFileIcon('audio/mpeg')          // '🎵'
getFileIcon('text/plain')          // '📝'
getFileIcon('application/zip')     // '📦'
getFileIcon('unknown/type')        // '📎' (defaut)
getFileIcon(null)                  // '📎'
```

**Table des correspondances** :

| Type MIME | Emoji |
|---|---|
| `application/pdf` | 📄 |
| `image/*` | 🖼️ |
| `video/*` | 🎬 |
| `audio/*` | 🎵 |
| `text/*` | 📝 |
| `*spreadsheet*`, `*excel*` | 📊 |
| `*presentation*`, `*powerpoint*` | 📽️ |
| `*document*`, `*word*` | 📃 |
| `*zip*`, `*rar*`, `*compressed*` | 📦 |
| Autre / null | 📎 |

### `formatFileSize(bytes)`

Formate une taille en octets en chaine lisible.

```js
formatFileSize(0)           // '0 B'
formatFileSize(512)         // '512 B'
formatFileSize(1536)        // '1.5 KB'
formatFileSize(2621440)     // '2.5 MB'
formatFileSize(1073741824)  // '1.0 GB'
```

---

## Utilisations dans le projet

| Consommateur | Mode | Ce qu'il fait |
|---|---|---|
| `FileAttachmentPlugin` | Standard | Upload de fichiers joints a une carte (onglet Fichiers) |
| `CommentsPanel` | Compact | Bouton 📎 pour attacher des fichiers a un commentaire |

Les deux utilisent aussi `getFileIcon` et `formatFileSize` pour l'affichage des metadonnees.

---

## Ajout dans un nouveau contexte

Pour utiliser l'upload de fichiers ailleurs :

```js
import UploadZone from '../components/UploadZone.js';
import StorageService from '../services/StorageService.js';
import Application from '../Application.js';
import { getFileIcon, formatFileSize } from '../utils/file.js';

// 1. Creer la zone
const zone = new UploadZone({
    onFiles: (fileList) => storeFiles(fileList),
    multiple: true,
    compact: false,       // ou true pour un formulaire inline
});
container.appendChild(zone.render());

// 2. Stocker les fichiers dans IndexedDB
async function storeFiles(fileList) {
    const boardId = Application.instance?.currentBoardId;

    for (const file of fileList) {
        const id = await StorageService.storeImage({
            blob: file,
            boardId,
            cardId: 'card-xxx',
            mimeType: file.type || 'application/octet-stream',
        });

        // id est la cle IndexedDB — stocker dans le modele
        console.log(`Stocke : ${getFileIcon(file.type)} ${file.name} (${formatFileSize(file.size)})`);
    }
}

// 3. Afficher un lien de telechargement
const url = await StorageService.getImageUrl(fileId);
const link = document.createElement('a');
link.href = url;
link.download = fileName;

// 4. Cleanup
zone.destroy();
```

**Checklist** pour un nouveau consommateur :
- [ ] Appeler `zone.destroy()` au demontage
- [ ] Scanner `files[].id` dans `ImageGarbageCollectorPlugin._collectReferencedImages()` pour que le GC ne supprime pas les blobs
- [ ] Remapper `files[].id` dans `ExportImportService._remapImageReferences()` pour que l'import fonctionne
