# Perspective3DPlugin

Effet de perspective 3D sur le board avec rotations, zoom et effets de survol.

---

## Architecture

```
Perspective3DPlugin/
├── manifest.json              — Métadonnées, hooks écoutés
├── index.js                   — Point d'entrée (assemblePlugin)
├── Perspective3DPlugin.js     — Logique principale (transforms CSS)
├── settingsPanel.js           — Sliders + presets
└── styles.js                  — Styles CSS (transitions 3D)
```

---

## Fonctionnement

### Hook écouté

| Hook             | Rôle                                               |
| ---------------- | -------------------------------------------------- |
| `board:rendered` | Applique les transforms CSS 3D sur l'élément board |

### Paramètres

| Paramètre   | Description                  | Plage         |
| ----------- | ---------------------------- | ------------- |
| `rotateX`   | Rotation axe X (inclinaison) | -30 / +30 deg |
| `rotateY`   | Rotation axe Y (pivot)       | -30 / +30 deg |
| `zoom`      | Échelle globale              | 0.5 / 1.5     |
| `intensity` | Force de l'effet de survol   | 0 / 20        |

### Presets

| Nom         | Description                     |
| ----------- | ------------------------------- |
| Subtil      | Légère inclinaison, zoom normal |
| Normal      | Inclinaison moyenne             |
| Dramatique  | Forte perspective               |
| Isométrique | Vue isométrique classique       |
| À plat      | Aucune rotation                 |

### Persistence

IndexedDB via `StorageService` — objet avec les 4 paramètres. La sauvegarde est **debounced (300ms)** pour éviter les écritures excessives pendant le drag des sliders.

---

## Comment modifier

### Ajouter un preset

Dans `settingsPanel.js`, ajouter une entrée dans le tableau de presets :

```js
{ label: 'Mon preset', values: { rotateX: 10, rotateY: -5, zoom: 1.1, intensity: 8 } }
```

### Ajouter un paramètre (ex: perspective distance)

1. **Perspective3DPlugin.js** — Ajouter la propriété, le getter/setter, la mise à jour dans `_apply()`
2. **settingsPanel.js** — Ajouter un slider
3. Mettre à jour `_loadSettings()` / `_saveSettings()`
