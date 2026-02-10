# Hooks disponibles

Référence de tous les hooks émis par l'application.
Déclarés dans `hookDefinitions.js`, validés en mode dev par `HookRegistry._warnIfUnknown()`.

Les plugins peuvent aussi déclarer leurs propres hooks via leur `manifest.json`
(section `hooks.provides`). Le PluginManager les enregistre automatiquement
dans le HookRegistry avec leurs métadonnées.

---

## Board

### `board:afterLoad` (filter)

|                    |                                                       |
| ------------------ | ----------------------------------------------------- |
| **Émis dans**      | `BoardService.fetchBoard()`                           |
| **Valeur**         | `data` — données brutes du board `{ columns: [...] }` |
| **Retour attendu** | `data` (transformé ou non)                            |

Appelé après le chargement des données (localStorage ou API), avant la construction du Board model.

### `board:rendered` (action)

|               |                                                              |
| ------------- | ------------------------------------------------------------ |
| **Émis dans** | `BoardView.render()`                                         |
| **Arguments** | `{ board, element }` — instance Board + HTMLElement du board |

Appelé après la construction complète du DOM du board et son insertion dans le conteneur.
Permet aux plugins d'attacher leurs comportements à l'élément board (observers, boutons, etc.).

### `board:beforeSave` (filter)

|                    |                                                    |
| ------------------ | -------------------------------------------------- |
| **Émis dans**      | `BoardService.save()`                              |
| **Valeur**         | `data` — sérialisation du board (`board.toJSON()`) |
| **Retour attendu** | `data` (transformé ou non)                         |

Permet de modifier les données avant écriture dans la stratégie de persistence.

### `board:saved` (action)

|                  |                                             |
| ---------------- | ------------------------------------------- |
| **Émis dans**    | `BoardService.save()`                       |
| **Arguments**    | `{ board }` — instance Board                |
| **Notification** | type: success, template: "Board sauvegardé" |

Notification post-sauvegarde réussie.

### `board:saveFailed` (action)

|                  |                                                         |
| ---------------- | ------------------------------------------------------- |
| **Émis dans**    | `BoardService.save()`                                   |
| **Arguments**    | `{ error }` — objet erreur                              |
| **Notification** | type: error, template: "Erreur de sauvegarde : {error}" |

Notification en cas d'échec de la sauvegarde.

---

## Card — Données

### `card:beforeCreate` (filter)

|                    |                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------- |
| **Émis dans**      | `ColumnView._openAddCardModal()`, `main.js` (HeaderView callback)                       |
| **Valeur**         | `cardData` — données du formulaire `{ id, title, description, tags, assignee, author }` |
| **Retour attendu** | `cardData` (transformé ou non)                                                          |

Appelé avant `new Card(data)`. Permet de valider ou enrichir les données.

### `card:created` (action)

|                  |                                                                   |
| ---------------- | ----------------------------------------------------------------- |
| **Émis dans**    | `ColumnView._openAddCardModal()`, `main.js` (HeaderView callback) |
| **Arguments**    | `{ card, column }` — Card instance + Column parent                |
| **Notification** | type: success, template: "Carte \"{title}\" créée"                |

Notification après création et insertion dans la colonne.

### `card:beforeUpdate` (filter)

|                               |                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------- |
| **Émis dans**                 | `ColumnView._openEditCardModal()`, `ColumnView._openEditCardModalAndReturn()` |
| **Valeur**                    | `data` — données du formulaire `{ title, description, tags, assignee }`       |
| **Arguments supplémentaires** | `card` — instance Card en cours de modification                               |
| **Retour attendu**            | `data` (transformé ou non)                                                    |

Appelé avant `card.update(data)`. Permet de valider ou transformer les modifications.

### `card:updated` (action)

|               |                                                                               |
| ------------- | ----------------------------------------------------------------------------- |
| **Émis dans** | `ColumnView._openEditCardModal()`, `ColumnView._openEditCardModalAndReturn()` |
| **Arguments** | `{ card }` — Card instance mise à jour                                        |

Notification après mise à jour du modèle.

### `card:deleted` (action)

|                  |                                                     |
| ---------------- | --------------------------------------------------- |
| **Émis dans**    | `ColumnView._openCardDetail()`                      |
| **Arguments**    | `{ card, column }` — Card supprimée + Column source |
| **Notification** | type: info, template: "Carte \"{title}\" supprimée" |

Notification avant suppression de la carte de la colonne.

### `card:moved` (action)

|                  |                                                                                   |
| ---------------- | --------------------------------------------------------------------------------- |
| **Émis dans**    | `Board.moveCard()`                                                                |
| **Arguments**    | `{ card, fromColumn, toColumn }` — Card déplacée + colonnes source et destination |
| **Notification** | type: info, template: "Carte déplacée vers \"{column}\""                          |

Appelé après le déplacement d'une carte entre colonnes (ou réordonnancement dans la même colonne).
L'historique de la carte est enregistré avant l'émission de ce hook.

---

## Card — Rendu

### `card:beforeRender` (filter)

|                    |                                      |
| ------------------ | ------------------------------------ |
| **Émis dans**      | `CardView.render()`                  |
| **Valeur**         | `{ title, description, tags, card }` |
| **Retour attendu** | Même objet (transformé ou non)       |

Permet de modifier les données affichées sans toucher au modèle.

### `card:renderBody` (action)

|               |                                  |
| ------------- | -------------------------------- |
| **Émis dans** | `CardView.render()`              |
| **Arguments** | `{ card, cardElement, handled }` |

| Argument      | Type          | Description                                     |
| ------------- | ------------- | ----------------------------------------------- |
| `card`        | `Card`        | Instance du modèle Card                         |
| `cardElement` | `HTMLElement` | Élément DOM de la carte                         |
| `handled`     | `boolean`     | Mettre à `true` pour empêcher le rendu standard |

Permet aux plugins widget de prendre le contrôle complet du rendu de la carte.
Si `handled` est mis à `true` par un plugin, le rendu standard (titre, description, tags) est ignoré.

Utilisé par : ClickCounterPlugin, ChecklistPlugin, YouTubePlugin, BoardStatsPlugin, PomodoroPlugin.

### `card:rendered` (action)

|               |                                                       |
| ------------- | ----------------------------------------------------- |
| **Émis dans** | `ColumnView._renderBody()`                            |
| **Arguments** | `{ card, element }` — Card instance + HTMLElement DOM |

Appelé après insertion de la carte dans le DOM. Permet le post-traitement
(ajout de boutons, badges, styles) sans MutationObserver.

### `card:beforeDestroy` (action)

|               |                                                          |
| ------------- | -------------------------------------------------------- |
| **Émis dans** | `ColumnView._renderBody()`                               |
| **Arguments** | `{ cardId, element }` — ID de la carte + HTMLElement DOM |

Appelé avant la suppression de l'élément DOM d'une carte lors du re-render.
Permet aux plugins de nettoyer les event listeners et ressources attachés à l'élément.

### `card:typeActivated` (action)

|               |                                           |
| ------------- | ----------------------------------------- |
| **Émis dans** | `CardTypeRegistry._notifyExistingCards()` |
| **Arguments** | `{ cardType, cardId, element }`           |

| Argument   | Type          | Description                                  |
| ---------- | ------------- | -------------------------------------------- |
| `cardType` | `string`      | Identifiant du type (ex: `'widget:counter'`) |
| `cardId`   | `string`      | ID de la carte                               |
| `element`  | `HTMLElement` | Élément DOM de la carte                      |

Appelé pour chaque carte existante d'un type donné lorsque ce type est (ré)activé
dans le CardTypeRegistry (ex: quand un plugin widget est activé).
Permet aux plugins de se ré-attacher aux éléments DOM existants.

---

## Rendu de contenu

### `render:description` (action)

|               |                                                          |
| ------------- | -------------------------------------------------------- |
| **Émis dans** | `CardView.render()`, `ModalCardDetail._buildInfoPanel()` |
| **Arguments** | `{ element, text, context }`                             |

| Argument  | Type          | Description                                    |
| --------- | ------------- | ---------------------------------------------- |
| `element` | `HTMLElement` | Élément DOM contenant la description           |
| `text`    | `string`      | Texte brut de la description                   |
| `context` | `string`      | `'card'` (vue carte) ou `'modal'` (vue détail) |

Permet aux plugins de transformer le rendu de la description (ex: Markdown → HTML).
Le plugin modifie directement `element.innerHTML`.

### `render:comment` (action)

|               |                                         |
| ------------- | --------------------------------------- |
| **Émis dans** | `ModalCardDetail._renderCommentsList()` |
| **Arguments** | `{ element, text, context }`            |

| Argument  | Type          | Description                          |
| --------- | ------------- | ------------------------------------ |
| `element` | `HTMLElement` | Élément DOM contenant le commentaire |
| `text`    | `string`      | Texte brut du commentaire            |
| `context` | `string`      | `'modal'`                            |

Permet aux plugins de transformer le rendu des commentaires (ex: Markdown → HTML).

---

## Modales

### `modal:addCard:opened` (action)

|               |                                                            |
| ------------- | ---------------------------------------------------------- |
| **Émis dans** | `ModalAddCard.open()`                                      |
| **Arguments** | `{ registerCardType, body, pluginsSlot, addTab, onClose }` |

| Argument                   | Type                                  | Description                                                             |
| -------------------------- | ------------------------------------- | ----------------------------------------------------------------------- |
| `registerCardType`         | `Function(typeId, label, buildPanel)` | Enregistre un type de carte widget dans le sélecteur                    |
| `body`                     | `HTMLElement`                         | Corps de la modale                                                      |
| `pluginsSlot`              | `HTMLElement`                         | Slot dédié aux plugins                                                  |
| `addTab(label, { order })` | `Function → HTMLElement`              | Crée un onglet trié par `order` (défaut 10, plus petit = plus à gauche) |
| `onClose(fn)`              | `Function`                            | Enregistre un callback de nettoyage à la fermeture                      |

### `modal:editCard:opened` (action)

|               |                                                        |
| ------------- | ------------------------------------------------------ |
| **Émis dans** | `ModalEditCard.open()`                                 |
| **Arguments** | `{ cardId, card, body, pluginsSlot, addTab, onClose }` |

Mêmes arguments que `modal:addCard:opened` + `cardId` (string) et `card` (instance Card).

### `modal:cardDetail:renderContent` (action)

|               |                                     |
| ------------- | ----------------------------------- |
| **Émis dans** | `ModalCardDetail._buildInfoPanel()` |
| **Arguments** | `{ card, panel, handled }`          |

| Argument  | Type          | Description                                                |
| --------- | ------------- | ---------------------------------------------------------- |
| `card`    | `Card`        | Instance du modèle Card                                    |
| `panel`   | `HTMLElement` | Panneau "Informations" de la modale détail                 |
| `handled` | `boolean`     | Mettre à `true` pour empêcher le rendu standard du panneau |

Permet aux plugins widget de remplacer le contenu du panneau d'informations
dans la modale de détail. Même pattern que `card:renderBody`.

### `modal:boardSettings:opened` (action)

|               |                                   |
| ------------- | --------------------------------- |
| **Émis dans** | `ModalBoardSettings.open()`       |
| **Arguments** | `{ registerTab, board, onClose }` |

| Argument      | Type                              | Description                                        |
| ------------- | --------------------------------- | -------------------------------------------------- |
| `registerTab` | `Function(id, label, buildPanel)` | Enregistre un onglet dans la modale de settings    |
| `board`       | `Board`                           | Instance du modèle Board                           |
| `onClose(fn)` | `Function`                        | Enregistre un callback de nettoyage à la fermeture |

Permet aux plugins d'ajouter leurs propres onglets de configuration
dans la modale de réglages du board.

### `modal:boardSettings:general` (action)

|               |                                           |
| ------------- | ----------------------------------------- |
| **Émis dans** | `ModalBoardSettings._buildGeneralPanel()` |
| **Arguments** | `{ panel, board }`                        |

| Argument | Type          | Description                            |
| -------- | ------------- | -------------------------------------- |
| `panel`  | `HTMLElement` | Zone d'injection dans l'onglet Général |
| `board`  | `Board`       | Instance du modèle Board               |

Permet aux plugins d'injecter des champs personnalisés dans l'onglet "Général"
de la modale de réglages du board (ex: image de fond, options visuelles).
