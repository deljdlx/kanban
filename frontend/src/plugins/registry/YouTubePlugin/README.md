# YouTubePlugin

Carte widget avec vidéo YouTube embarquée (lazy-loading).

---

## Architecture

```
YouTubePlugin/
├── manifest.json      — Métadonnées, hooks écoutés
├── index.js           — Point d'entrée (assemblePlugin)
├── YouTubePlugin.js   — Logique principale (widget, extraction URL)
└── styles.js          — Styles CSS (ratio 16:9, overlay play)
```

---

## Fonctionnement

### Type de carte

Type enregistré : `widget:youtube` via `CardTypeRegistry`.

### Structure de données

```js
// card.data
{ videoId: "dQw4w9WgXcQ", videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ" }
```

### Hooks écoutés

| Hook                             | Rôle                                                  |
| -------------------------------- | ----------------------------------------------------- |
| `modal:addCard:opened`           | Formulaire de création (champ URL + aperçu thumbnail) |
| `card:renderBody`                | Remplace le body par le widget vidéo                  |
| `modal:cardDetail:renderContent` | Affiche le lecteur en grand dans la modale détail     |

### Formats d'URL supportés

- `youtube.com/watch?v=ID`
- `youtu.be/ID`
- `youtube.com/embed/ID`

L'extraction du `videoId` est faite par regex.

### Lazy-loading

La carte affiche la **thumbnail** YouTube (`img.youtube.com/vi/<id>/hqdefault.jpg`) avec un bouton play en overlay. Le clic charge l'iframe YouTube (avec `autoplay=1`). Cela évite de charger des iframes pour toutes les cartes vidéo du board.

---

## Comment modifier

### Supporter d'autres plateformes (Vimeo, etc.)

1. Ajouter une regex d'extraction dans la méthode de parsing d'URL
2. Adapter l'URL de thumbnail et l'URL d'embed
3. Éventuellement différencier le `card.data` par plateforme
