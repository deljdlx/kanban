# CustomFieldsPlugin

Permet de definir des champs personnalises par board (texte, nombre, date, liste, checkbox, URL) et de remplir ces champs pour chaque carte.

## Architecture

```
CustomFieldsPlugin/
├── index.js                → Assemblage manifest + plugin + styles + settings
├── manifest.json           → Metadonnees et hooks declares
├── CustomFieldsPlugin.js   → Logique principale (hooks, persistance, DOM)
├── settingsPanel.js        → CRUD des definitions de champs
├── styles.js               → CSS prefixe cfp-
└── README.md               → Ce fichier
```

Depend de `src/plugins/lib/FieldTypeRegistry.js` (registre transversal des types de champs).

Les labels du settings panel utilisent la classe CSS foundation `.label` pour un rendu uniforme.

## Fonctionnement

### Hooks

| Hook                             | Action                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| `board:didChange`                | Charge `_fields` et `_values` depuis `board.pluginData['custom-fields']`           |
| `board:willChange`               | Deconnecte MutationObserver, vide state, retire `.cfp-badges` du DOM               |
| `board:rendered`                 | Setup MutationObserver + process toutes les cartes existantes                      |
| `modal:addCard:opened`           | `addTab('Champs', { order: 5 })` + editeurs vides + hook temporaire `card:created` |
| `modal:editCard:opened`          | `addTab('Champs', { order: 5 })` + editeurs pre-remplis + sauvegarde au close      |
| `modal:cardDetail:renderContent` | Microtask → section champs apres contenu InfoPanel                                 |
| `card:deleted`                   | Supprime `values[card.id]` et sauvegarde                                           |

### MutationObserver

Observe le `.board` pour detecter les cartes ajoutees au DOM (drag & drop, creation).
Pour chaque carte, injecte des badges `.cfp-badges` affichant les champs dont `showOnCard: true` avec une valeur non vide.

### Modales

- **Add card** : onglet "Champs" avec editeurs vides. Un hook temporaire `card:created` sauvegarde les values une fois la carte creee. Cleanup via `onClose()`.
- **Edit card** : onglet "Champs" avec editeurs pre-remplis. Sauvegarde au `onClose()` uniquement si les valeurs ont change.
- **Card detail** : section "Champs personnalises" apres le contenu standard d'InfoPanel via microtask (`Promise.resolve().then()`).

## Persistence

**Cle** : `board.pluginData['custom-fields']`

**Version du schema** : `SCHEMA_VERSION = 1` (constante en haut de `CustomFieldsPlugin.js`)

```json
{
    "version": 1,
    "fields": [
        {
            "id": "cf_1",
            "label": "Sprint",
            "type": "select",
            "config": { "options": ["Sprint 1", "Sprint 2"] },
            "showOnCard": true,
            "order": 0
        }
    ],
    "values": {
        "card-id-123": { "cf_1": "Sprint 1" }
    }
}
```

- **Migration automatique** : `_migrateData()` detecte la version stockee et migre vers `SCHEMA_VERSION` au chargement (switch/case fall-through)
- Export/import automatique car tout est dans `board.pluginData`
- Les values orphelines (champ supprime) restent en storage et sont ignorees
- Pour les champs select : quand on modifie les options, les valeurs qui referencent une option supprimee sont purgees automatiquement (`_purgeOrphanedSelectValues`)

## Comment modifier

### Ajouter un nouveau type de champ

1. Ouvrir `src/plugins/lib/FieldTypeRegistry.js`
2. Creer un objet type avec l'interface `{ label, icon, defaultValue, renderEdit, format }`
3. Appeler `registry.register('montype', monType)` en bas du fichier
4. Le nouveau type apparait automatiquement dans le select du settingsPanel

### Modifier le rendu des badges

1. Ouvrir `CustomFieldsPlugin.js`, methode `_updateBadges()`
2. Modifier la structure DOM ou les conditions d'affichage
3. Ajuster les styles dans `styles.js` (classes `.cfp-badge-*`)

### Modifier le formulaire dans les modales

1. Ouvrir `CustomFieldsPlugin.js`, methode `_buildFieldsForm()`
2. Modifier la structure du groupe `.cfp-field-group`

### Modifier le panneau settings

1. Ouvrir `settingsPanel.js`, fonction `buildSettingsPanel()`
2. Modifier `renderList()` pour la liste ou le formulaire d'ajout
3. Modifier `buildEditForm()` pour le formulaire d'edition inline
