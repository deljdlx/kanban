# SnowflakeCursorPlugin

Effet de particules : des flocons suivent le curseur avec gravité et vent.

---

## Architecture

```
SnowflakeCursorPlugin/
├── manifest.json              — Métadonnées
├── index.js                   — Point d'entrée (assemblePlugin)
├── SnowflakeCursorPlugin.js   — Moteur de particules (canvas, boucle RAF)
├── Snowflake.js               — Classe particule (physique individuelle)
├── settingsPanel.js           — Sliders + color picker (Pickr)
└── styles.js                  — Styles CSS (canvas overlay)
```

---

## Fonctionnement

### Moteur de particules

- Canvas plein écran en overlay (`pointer-events: none`)
- `requestAnimationFrame` pour la boucle de rendu
- Émission de particules à la position du curseur (`mousemove`)
- Limite max de particules (défaut 120)

### Physique (`Snowflake.js`)

Chaque particule a :

- Position (x, y) initialisée au curseur
- Vélocité (vx, vy) avec dispersion aléatoire
- Gravité (accélération verticale)
- Friction (décélération progressive)
- Vent sinusoïdal (oscillation horizontale)
- Durée de vie (fade out progressif)
- Taille variable

### Paramètres configurables

| Paramètre  | Description           | Défaut    |
| ---------- | --------------------- | --------- |
| `color`    | Couleur des flocons   | `#ffffff` |
| `density`  | Taux d'émission       | 3         |
| `size`     | Taille des particules | 4         |
| `lifetime` | Durée de vie (frames) | 60        |
| `gravity`  | Force de gravité      | 0.1       |

### Persistence

IndexedDB via `StorageService`. La sauvegarde est **debounced (300ms)** pour éviter les écritures excessives pendant le drag des sliders.

---

## Comment modifier

### Changer la forme des particules

Dans `Snowflake.js`, modifier la méthode `draw(ctx)` — remplacer `arc()` par un autre dessin (étoile, carré, emoji, etc.).

### Ajouter un paramètre (ex: vent)

1. **Snowflake.js** — Utiliser le paramètre dans `update()`
2. **SnowflakeCursorPlugin.js** — Ajouter la propriété et le passage au constructeur
3. **settingsPanel.js** — Ajouter un slider
4. Mettre à jour `_loadSettings()` / `_saveSettings()`
