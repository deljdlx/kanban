# Changelog

Un changelog par semaine. Format : sections par type de changement.

---

## Semaine du 9 février 2026

### Fonctionnalités

- **Infrastructure de sync backend offline-first** — Nouveau layer `src/sync/` avec SyncService (orchestrateur), SyncQueue (queue FIFO persistante IndexedDB), BackendAdapter (interface abstraite + NoOp), RestBackendAdapter (implémentation REST). BoardDiffer et OpApplier extraits de LiveSyncPlugin vers `src/sync/` pour partage. (`src/sync/SyncService.js`, `src/sync/SyncQueue.js`, `src/sync/BackendAdapter.js`, `src/sync/RestBackendAdapter.js`, `src/sync/BoardDiffer.js`, `src/sync/OpApplier.js`)
- **Migration IndexedDB v2** — Nouveau store `sync-queue` avec indexes `by-board` et `by-status`. Upgrade incrémental via `oldVersion` checks. (`src/services/storage/Database.js`)
- **6 hooks sync backend** — `sync:queued`, `sync:pushed`, `sync:pushFailed`, `sync:pulled`, `sync:pullFailed`, `sync:online` déclarés dans hookDefinitions.js. (`src/plugins/hookDefinitions.js`)

### Infrastructure

- **SyncService intégré dans Application.init()** — Initialisé après les plugins pour respecter les priorités de hooks (board:saved priority 20 > LiveSyncPlugin priority 10). (`src/Application.js`)
- **LiveSyncPlugin imports mis à jour** — BoardDiffer et OpApplier importés depuis `src/sync/` au lieu du dossier local. (`LiveSyncPlugin/LiveSyncPlugin.js`)

- **Réorganisation dépôt : frontend/** — Tous les fichiers de l'application déplacés dans `frontend/` pour préparer l'arrivée du backend. `.husky/` reste à la racine git avec `cd frontend && npx lint-staged`. `CLAUDE.md` mis à jour avec les nouveaux chemins. (`frontend/`, `.husky/pre-commit`, `CLAUDE.md`, `.gitignore`)

### Documentation

- Mise à jour `ARCHITECTURE.md` : nouveau layer sync, SyncService dans le diagramme Container et la séquence init
- Mise à jour `DATA-MODELS.md` : store sync-queue, schema, metadata de révision
- Mise à jour `PLUGIN-SYSTEM.md` : 6 hooks sync:* dans le catalogue
- Mise à jour `LiveSyncPlugin/README.md` : note extraction BoardDiffer/OpApplier

### Corrections critiques

- **actionFactory.js : bug read-modify-write sur les couleurs de carte** — `setCardColor`/`removeCardColor` lisaient depuis `StorageService.get('kanban:cardColors')` (ancienne clé globale) au lieu de `board.pluginData['card-colors']`. Corrigé : les méthodes utilisent désormais `board.setPluginData()` directement, rendues synchrones. (`WorkflowPlugin/actionFactory.js`)
- **pluginDataRef → setPluginData() dans 12 sites** — Tous les plugins qui mutaient `board.pluginDataRef` directement utilisent désormais `board.setPluginData(key, value)` pour garantir l'émission de `'change'` et le déclenchement de l'auto-save. Ajout de `Board.removePluginData(key)` pour la suppression safe. (`Board.js`, `ColorPluginFactory.js`, `NoteManager.js`, `CardLinksPlugin.js`, `WorkflowPlugin.js`, `LinearSyncPlugin.js`, `ColumnTogglePlugin.js`, `CustomFieldsPlugin.js`, `ColumnMappingPlugin.js`, `OpApplier.js`)
- **BoardService.save() fire-and-forget → await** — Les appels à `BoardService.save()` dans les plugins et services qui étaient en fire-and-forget sont maintenant `await`ed dans les fonctions async. (`BoardService.js`, `FileAttachmentPlugin.js`, `WorkflowPlugin.js`, `LinearSyncPlugin.js`, `ChecklistPlugin.js`, `ClickCounterPlugin.js`, `CommentsPanel.js`)

### Corrections hautes

- **beforeunload handler** — `Application.create()` enregistre un handler `beforeunload` qui appelle `BoardService.flush()` pour sauvegarder les données non-persistées avant fermeture de l'onglet. (`Application.js`)
- **crypto.randomUUID() → generateId()** — Les 2 usages directs de `crypto.randomUUID()` (non disponible en HTTP ni backend-ready) remplacés par `generateId()` de `src/utils/id.js`. (`ImagePastePlugin.js`, `LiveSyncPlugin.js`)
- **ColumnMappingPlugin : double emit('change')** — `setPluginData()` émet déjà 'change', les appels explicites `board.emit('change')` en doublon ont été retirés. (`ColumnMappingPlugin.js`, `settingsPanel.js`)

### Infrastructure

- **ExplorerView routée via StorageService** — `ExplorerView.js` n'importe plus directement `Database.js` ni `IndexedDBImageStorage`. Nouvelles méthodes ajoutées à `StorageService` : `countRecords()`, `getAllRecords()`, `getRecord()`, export de `STORES`. (`StorageService.js`, `ExplorerView.js`)
- **Debounce _saveSettings() dans 3 plugins** — Les plugins avec sliders (AnimationPlugin, Perspective3DPlugin, SnowflakeCursorPlugin) debounce maintenant `_saveSettings()` à 300ms pour éviter les écritures excessives dans IndexedDB pendant le drag. (`AnimationPlugin.js`, `Perspective3DPlugin.js`, `SnowflakeCursorPlugin.js`)
- **Suppression du répertoire persistence/** — `src/persistence/` (PersistenceStrategy.js, LocalStorageStrategy.js) supprimé — code mort jamais importé depuis la migration IndexedDB.

### Tests

- **Mise à jour tests après migration setPluginData** — `CardLinksPlugin.test.js` : assertions mises à jour pour vérifier `setPluginData` au lieu de `emit('change')`. `StorageService.test.js` : mock `STORES` ajouté. (`CardLinksPlugin.test.js`, `StorageService.test.js`)

### Documentation

- **READMEs plugins mis à jour** — Références à `pluginDataRef`, `crypto.randomUUID()`, `BoardService.save()` non-await et absence de debounce corrigées dans 8 READMEs. (`ColumnTogglePlugin`, `LiveSyncPlugin`, `ChecklistPlugin`, `ClickCounterPlugin`, `AnimationPlugin`, `Perspective3DPlugin`, `SnowflakeCursorPlugin`, `CardLinksPlugin`)
- **DATA-MODELS.md** — Diagramme Board : ajout `setPluginData()`, `removePluginData()`, `get pluginData()`. Points clés mis à jour.
- **Audit** — Section pluginData mise à jour : tous les plugins migrés, `pluginDataRef` marqué comme déprécié.

### Infrastructure

- **CSS : uniformisation formulaires plugins → classes fondation** — Remplacement de 11 classes CSS plugin-spécifiques (`.tsp-checkbox`, `.tsp-reset`, `.ksp-reset`, `.p3d-checkbox-row`, `.p3d-preset-btn`, `.p3d-setting-label`, `.livesync-settings-*`, `.lsync-checkbox-row`, `.scp-color-btn`) par les classes fondation (`.checkbox-row`, `.btn--cancel`, `.btn--secondary.btn--sm`, `.label`, `.input`, `.form-hint`). Suppression de 19 règles CSS mortes dans 6 fichiers `styles.js`. Ajout `accent-color` dans `.checkbox-row` fondation. (`_components.scss`, `ToastPlugin/settingsPanel.js`, `ToastPlugin/styles.js`, `KeyboardShortcutsPlugin/settingsPanel.js`, `KeyboardShortcutsPlugin/styles.js`, `Perspective3DPlugin/settingsPanel.js`, `Perspective3DPlugin/styles.js`, `LiveSyncPlugin/settingsPanel.js`, `LiveSyncPlugin/styles.js`, `LinearSyncPlugin/settingsPanel.js`, `LinearSyncPlugin/styles.js`, `SnowflakeCursorPlugin/settingsPanel.js`, `SnowflakeCursorPlugin/styles.js`)
- **CSS : inline styles settings panels → classes CSS** — Suppression de 44 inline styles de layout/spacing dans 11 fichiers JS, remplacés par des classes CSS réutilisables (`.checkbox-row`, `.form-hint`, `.form-group`, `.label`, `.hidden`). Ajout de 2 utility classes dans `_components.scss`. (`_components.scss`, `DemoPlugin/settingsPanel.js`, `DemoPlugin/DemoPlugin.js`, `MarkdownPlugin/settingsPanel.js`, `AnimationPlugin/settingsPanel.js`, `CardColorPlugin/settingsPanel.js`, `ColumnColorPlugin/settingsPanel.js`, `SnowflakeCursorPlugin/settingsPanel.js`, `ThemePlugin/settingsPanel.js`, `ColumnMappingPlugin/settingsPanel.js`, `TaxonomyPluginFactory.js`, `ProfilePanel.js`)
- **CSS : display toggles + déduplication classes plugin** — Remplacement de 11 `style.display` restants par `.hidden` classList dans 6 fichiers. Suppression de `.tp-label` (doublon de `.label` fondation) dans ThemePlugin. (`ColorPluginFactory.js`, `BoardNotesPlugin.js`, `RuleEditor.js`, `SelectUser.js`, `UploadZone.js`, `HomeView.js`, `ThemePlugin/styles.js`, `ThemePlugin/settingsPanel.js`)
- **CSS : review architecture globale — fondations dans plugins (2 passes)** — Vérification systématique de l'utilisation des classes fondation (`_components.scss`) dans tous les plugins. Fix bug `.btn-primary` → `.btn--primary` dans ColumnMappingPlugin. Fix `.btn--small` (inexistant) → `.btn--sm` dans CustomFieldsPlugin et FieldTypeRegistry. Migration boutons WorkflowPlugin (6) + BoardNotesPlugin (2) + CustomFieldsPlugin edit/remove (2) vers `.btn--*` fondation. Migration inputs/selects WorkflowPlugin, ColumnMappingPlugin, ToastPlugin, ClickCounter, Pomodoro, Checklist vers `.input` fondation. Ajout `.label` manquant dans CustomFieldsPlugin, ColumnMappingPlugin, ColorPluginFactory. Migration `.taxonomy-settings-input` → `.input .taxonomy-settings-input`. Fix 9 variables CSS non-standard dans ColumnTogglePlugin. Table classes fondation ajoutée dans `PLUGIN-SYSTEM.md`. (`ColumnMappingPlugin/settingsPanel.js`, `ColumnMappingPlugin/styles.js`, `WorkflowPlugin/RuleListPanel.js`, `WorkflowPlugin/RuleEditor.js`, `WorkflowPlugin/styles.js`, `BoardNotesPlugin/BoardNotesPlugin.js`, `BoardNotesPlugin/styles.js`, `ChecklistPlugin/ChecklistPlugin.js`, `ChecklistPlugin/styles.js`, `ClickCounterPlugin/styles.js`, `PomodoroPlugin/styles.js`, `CustomFieldsPlugin/settingsPanel.js`, `CustomFieldsPlugin/styles.js`, `TaxonomyPluginFactory.js`, `taxonomySettingsStyles.js`, `ColumnTogglePlugin/styles.js`, `ToastPlugin/settingsPanel.js`, `ToastPlugin/styles.js`, `ColorPluginFactory.js`, `FieldTypeRegistry.js`, `PLUGIN-SYSTEM.md`)

### Tests

- **Tests unitaires couche Storage** — 109 tests couvrant BoardStorage (35), IndexedDBImageStorage (18), ExportImportService (34) et StorageService (22). Mock factory `fakeDB.js` simule IndexedDB via Maps pour contourner happy-dom. (`BoardStorage.test.js`, `IndexedDBImageStorage.test.js`, `ExportImportService.test.js`, `StorageService.test.js`, `__tests__/fakeDB.js`)

### Fonctionnalités

- **Champ résumé (summary) sur les cartes** — Nouveau champ texte `summary` sur le modèle Card, affiché entre le titre et la description. Même pipeline que description : rendu Markdown via `render:description`, éditable dans les modales ajout/édition, visible dans le détail carte, préservé à l'export/import (y compris remap images markdown). (`Card.js`, `CardView.js`, `ModalEditCard.js`, `ModalAddCard.js`, `InfoPanel.js`, `ExportImportService.js`, `LinearSyncPlugin.js`, `_card.scss`)
- **Authentification front-end (mode multi)** — Écran de login (email + mot de passe), session via sessionStorage, route guard sur toutes les pages sauf /login. En mode solo, rien ne change. (`AuthService.js`, `LoginView.js`, `_login.scss`, `credentials.json`)
- **AuthService** — Service singleton gérant login/logout/session. Hash SHA-256 côté client, design "backend-ready" (remplacer `_authenticate()` par un `fetch POST` suffit). (`AuthService.js`)
- **UserService : suppression du fetch me.json** — L'utilisateur courant est désormais déterminé par AuthService.getUserId() au lieu de /api/me.json. (`UserService.js`)
- **LinearSyncPlugin** — Plugin d'integration Linear : synchronise les issues Linear dans le board Kanban via l'API GraphQL. Mapping workflow states → colonnes, polling periodique configurable, bouton sync dans le header, onglet de configuration dans les settings du board. (`LinearSyncPlugin/`)

### Robustesse

- **HomeView : retrait du code debug** — Commentaire `TEST` et `console.log` retirés de `_animateCards()`. (`HomeView.js`)
- **HomeView : .catch() sur getUrl()** — `ImageStorageService.getUrl()` pour les couvertures de boards est maintenant protégé contre les rejets de promesse. (`HomeView.js`)
- **CommentsPanel : .catch() sur getImageUrl()** — `StorageService.getImageUrl()` pour les fichiers joints est maintenant protégé contre les rejets de promesse. (`CommentsPanel.js`)
- **Fetch : response.ok avant .json()** — Les 3 endpoints (`taxonomies.json`, `board.json`, `users.json`/`me.json`) vérifient `response.ok` avant d'appeler `.json()`, donnant un message d'erreur HTTP clair au lieu d'une erreur de parsing JSON. (`TaxonomyService.js`, `BoardService.js`, `UserService.js`)
- **ChecklistPlugin / ClickCounterPlugin : champ _handlers déclaré** — `_handlers` est maintenant déclaré comme champ de classe avec JSDoc, évitant un throw si `uninstall()` est appelé avant `install()`. (`ChecklistPlugin.js`, `ClickCounterPlugin.js`)

### Infrastructure

- **CSS : inline styles → classes CSS** — `tabsBar.style.display` → `.hidden` dans BaseModal, `deleteBtn.style.marginRight` → `.btn--footer-left` dans ModalEditCard, `cancelBtn.style.display` → `.hidden` dans ModalPluginSettings, `link.style.opacity/pointerEvents` → `.comment-file-link--loading` dans CommentsPanel, `editBtn.style.display` → `.hidden` dans CommentsPanel. (`BaseModal.js`, `ModalEditCard.js`, `ModalPluginSettings.js`, `CommentsPanel.js`, `_modal.scss`, `_card-detail.scss`)

### Corrections hautes

- **ImageDropPlugin : uninstall() complet** — Les 5 hooks (`board:willChange`, `board:rendered`, `card:renderBody`, `modal:cardDetail:renderContent`, `card:typeActivated`) sont maintenant tous retirés dans `uninstall()`. Avant, seuls 2 sur 5 étaient nettoyés, causant des fuites mémoire. (`ImageDropPlugin.js`)
- **Router : guard contre boucle infinie** — Si la route `'/'` n'est pas enregistrée, `_handleCurrentHash()` ne boucle plus infiniment. Un guard détecte le cas et log une erreur. (`Router.js`)
- **AnimationPlugin : .catch() sur _loadSettings()** — Le fire-and-forget `_loadSettings()` avait un rejet de promesse silencieux. Ajout de `.catch()` comme les autres plugins. (`AnimationPlugin.js`)
- **HomeView : cleanup file input orphelin** — `_importBoard()` track maintenant le `<input type="file">` dans `this._fileInput` et le retire dans `destroy()` pour éviter les inputs orphelins dans le DOM. (`HomeView.js`)

### Infrastructure

- **CSS : suppression des fallbacks light-theme** — Retrait de tous les fallbacks hex et rgba dans les `var()` CSS des plugins (~26 fichiers). L'app utilise un thème dark exclusif, les fallbacks light auraient mal rendu si les variables manquaient. (`styles.js` × 19, `settingsPanel.js` × 3, `taxonomySettingsStyles.js`, `ColumnMappingPlugin.js`, `ImageDropPlugin.js`)
- **CSS : correction des noms de variables erronés** — `--text-muted` → `--color-text-muted`, `--border-color` → `--color-border`, `--bg-secondary` → `--color-surface-hover`, `--text-color` → `--color-text`, `--danger-color` → `--color-danger`. (`ColumnMappingPlugin/styles.js`, `ColumnMappingPlugin/settingsPanel.js`, `LiveSyncPlugin/settingsPanel.js`)
- **CSS : inline styles → classes CSS** — Remplacement des `style.cssText` et assignations inline par des classes CSS dans les settings panels. (`ColumnMappingPlugin/settingsPanel.js` → `.mapping-subtitle`, `.mapping-separator`, `.mapping-empty`; `LiveSyncPlugin/settingsPanel.js` → `.livesync-settings-label`, `.livesync-settings-select`, `.livesync-settings-hint`)
- **LiveSyncPlugin : ajout de styles.js** — Nouveau fichier `styles.js` pour les styles du settings panel, câblé via PluginAssembler. (`LiveSyncPlugin/styles.js`, `LiveSyncPlugin/index.js`)
- **ProfilePanel : inline styles → SCSS** — Extraction de ~15 inline styles vers des classes CSS `.profile-avatar-preview`, `.profile-color-swatches`, `.profile-color-swatch`, `.profile-color-swatch--selected`. Seul `backgroundColor` reste dynamique. (`ProfilePanel.js`, `_board-settings.scss`)
- **ModalDeleteColumn : inline styles → CSS** — Warning text utilise `.modal-warning-text`, bouton désactivé utilise la pseudo-classe `:disabled` native de `.btn`. (`ModalDeleteColumn.js`, `_modal.scss`)
- **ModalAddCard : display toggles → classList** — Les 6 `style.display` pour montrer/cacher les panels de type de carte utilisent maintenant `classList.add/remove('hidden')`. (`ModalAddCard.js`, `_components.scss`)
- **date.js : locale extraite en constante** — `'fr-FR'` (6 occurrences) remplacé par `const LOCALE = 'fr-FR'`. (`date.js`)
- **appMode.js : lecture de la variable d'environnement** — `APP_MODE` lit `import.meta.env.VITE_APP_MODE` avec fallback `'solo'`, comme indiqué dans le commentaire existant. (`appMode.js`)

### Fonctionnalités

- **ColumnTogglePlugin : afficher/masquer des colonnes** — Nouveau plugin avec dropdown "Colonnes" dans le header du board. Permet de cocher/décocher des colonnes pour les afficher ou les masquer. Persiste dans `board.pluginData['column-toggle']`. Nouveau hook `header:renderActions` ajouté dans HeaderView. (`ColumnTogglePlugin/`, `hookDefinitions.js`, `HeaderView.js`, `registry/index.js`)
- **ColumnMappingPlugin : refonte UX du settings panel** — Le formulaire d'ajout de mappings passe d'un mode « un mapping à la fois » (3 selects séparés) à une vue « board-first » : choisir un board source, voir toutes ses colonnes avec un select inline par colonne (ignorer / colonne locale / créer), et ajouter tous les mappings en un clic. Les colonnes déjà mappées sont pré-sélectionnées. (`settingsPanel.js`, `styles.js`)

### Corrections hautes

- **ColumnMappingPlugin : cartes miroir visibles sans reload après ajout de mappings** — `_onBoardRendered()` détecte maintenant les boards sources manquants dans le cache (ajoutés depuis le settings panel) même après le prefetch initial, au lieu de retourner immédiatement quand `_prefetchTriggered` est déjà `true`. (`ColumnMappingPlugin.js`)
- **ColumnMappingPlugin : board courant exclu de la liste source** — Le select des boards sources passait `board.id` (undefined, le modèle Board n'a pas de propriété `id`) au lieu de `BoardService.getCurrentBoardId()`. Le board courant n'était jamais filtré. (`settingsPanel.js`)
- **ColumnMappingPlugin : rendu miroir via pipeline CardView** — Les cartes miroir passent maintenant par `CardView.render()`, le même pipeline que les cartes normales. Les hooks `render:description` (MarkdownPlugin), `card:renderBody` (widgets) et `card:beforeRender` (filtres) s'appliquent. Un hint par carte indique les plugins manquants qui amélioreraient le rendu. (`ColumnMappingPlugin/ColumnMappingPlugin.js`)

### Corrections critiques

- **Board/Column : pluginData cloné dans les constructeurs** — `pluginData` était assigné par référence directe, permettant à un plugin de corrompre les données d'un autre via mutation. Ajout de `{ ...pluginData }` dans les constructeurs. (`Board.js`, `Column.js`)
- **Application.init() : Promise.allSettled()** — Remplace `Promise.all()` par `Promise.allSettled()` pour que l'échec d'un service (ex: IndexedDB quota) n'empêche pas les autres de s'initialiser. Log explicite par service en erreur. (`Application.js`)
- **Plugins : .catch() sur _initAsync() fire-and-forget** — `TaxonomyPluginFactory` et `KeyboardShortcutsPlugin` appelaient `_initAsync()` sans catch. Les erreurs de chargement IndexedDB étaient silencieusement perdues. (`TaxonomyPluginFactory.js`, `KeyboardShortcutsPlugin.js`)
- **TaxonomyPluginFactory : documentation du double _registerTaxonomy()** — Clarification du double appel intentionnel (sync avec defaults + async après chargement) et réordonnancement pour enregistrer la taxonomie avant le fire-and-forget. (`TaxonomyPluginFactory.js`)

### Fonctionnalités

- **ColumnMappingPlugin : création de colonne simplifiée** — Le bouton « Créer » séparé est supprimé. Quand « Créer une colonne » est sélectionné, le champ est pré-rempli avec le nom de la colonne source, et le bouton « + Ajouter » crée la colonne + le mapping en une action. (`settingsPanel.js`)
- **ColumnMappingPlugin : rendu enrichi des cartes miroir** — Les cartes miroir affichent désormais les couleurs CardColor (bordure + fond), la description tronquée, les tags, la progression checklist, et les custom fields visibles du board source. Un hint informatif s'affiche si le board source utilise des plugins non activés localement. (`ColumnMappingPlugin/ColumnMappingPlugin.js`, `ColumnMappingPlugin/styles.js`)

- **ColumnMappingPlugin** — Nouveau plugin qui permet de mapper des colonnes d'autres boards dans le board courant. Les cartes importées sont affichées en lecture seule (miroir) sous les cartes locales de chaque colonne. Onglet "Column Mapping" dans Board Settings pour configurer les mappings. API DevTools `kanban.mappings.*` pour list/add/remove/clear/refresh. (`ColumnMappingPlugin/`, `registry/index.js`, `DevToolsPlugin.js`)

- **DevToolsPlugin** — Nouveau plugin (priority: 1) qui expose `window.kanban` pour piloter le Kanban depuis la console devtools. API namespacée : board, columns, cards, hooks, plugins, storage, filters, users, app. Feedback console avec emojis, `kanban.help()` affiche l'aide formatée. (`DevToolsPlugin/DevToolsPlugin.js`, `registry/index.js`)

- **Mode solo-offline** — L'application fonctionne avec un seul utilisateur local configurable. Flag `isSoloMode()` dans `src/config/appMode.js` comme point unique de bascule solo/multi. (`appMode.js`)
- **UserService solo mode** — En solo, `UserService` charge un profil depuis IndexedDB au lieu de l'API. `getUserById()` retourne le solo user pour tout ID non-null (compatibilité boards existants). Nouvelle méthode `updateProfile()`. (`UserService.js`)
- **Panneau Profil** — Onglet "Profil" dans ModalBoardSettings (solo mode) pour configurer nom, initiales, couleur de l'avatar avec preview live et sauvegarde en IndexedDB. (`ProfilePanel.js`, `ModalBoardSettings.js`)
- **UI solo mode** — Masquage des éléments multi-user inutiles en solo : SelectUser dans ModalAddCard/ModalEditCard (auto-assign), filtres assignee/auteur dans FilterDropdown, assignee/auteur dans InfoPanel, badge assignee et auteur dans CardView. (`ModalAddCard.js`, `ModalEditCard.js`, `FilterDropdown.js`, `InfoPanel.js`, `CardView.js`)

### Corrections critiques

- **CommentsPanel : liens fichiers désactivés pendant le chargement** — Les liens vers les fichiers joints dans les commentaires sont maintenant grisés et non-cliquables tant que l'URL n'est pas chargée depuis IndexedDB. Évite les clics sur un lien vide. (`CommentsPanel.js`)
- **CommentsPanel : warning si fichiers non stockables** — Si le boardId est indisponible lors de la soumission d'un commentaire avec fichiers joints, un toast prévient l'utilisateur au lieu de perdre les fichiers silencieusement. (`CommentsPanel.js`)
- **RuleEngine : sandbox renforcée** — Le code des règles workflow s'exécute en mode strict (`'use strict'`), empêchant l'accès à `window` via `this`. Les objets `ctx` et `board` sont gelés (`Object.freeze`) pour empêcher les mutations accidentelles. (`RuleEngine.js`)
- **Application : error boundary sur chargement board** — `fetchBoard()` et `setActiveBoard()` sont maintenant protégés par try/catch. Si IndexedDB échoue, un écran d'erreur s'affiche au lieu d'un crash. (`Application.js`)
- **ExportImportService : images corrompues tolérées** — `blobToDataUrl()` est maintenant protégé par try/catch dans `exportAll()` et `exportBoard()`. Une image corrompue est ignorée au lieu de bloquer l'export entier. (`ExportImportService.js`)
- **PomodoroPlugin : timer survit au re-render** — Si le board re-rend les cartes pendant qu'un timer Pomodoro tourne, l'interval est reconnecté aux nouveaux éléments DOM au lieu de continuer à mettre à jour des éléments détachés. (`PomodoroPlugin.js`)

### Corrections hautes

- **Modale détail ticket en full viewport** — La popup de détail d'un ticket utilise maintenant le pattern "full viewport avec marge" (`calc(100vw - 48px)` x `calc(100vh - 48px)`) comme les autres modales, au lieu de `max-width: 700px`. Responsive mobile inclus. (`_card-detail.scss`)
- **CommandPalettePlugin : masquer le mode `@` en solo** — Le préfixe `@` (recherche assignee) et son hint sont désormais masqués en mode solo-offline, car filtrer par le seul utilisateur est inutile. En solo, taper `@` fait une recherche carte normale. (`CommandPalettePlugin.js`)
- **ModalEditCard : guard footer null** — Protection contre un querySelector null sur `.modal-footer` dans la méthode `open()`. (`ModalEditCard.js`)

### Infrastructure

- **Factory d'identifiants centralisée** — Tous les IDs d'entités (board, col, card, comment, img, note, rule, cf, item) passent par `generateId(prefix)` dans `src/utils/id.js`. Remplace ~30 appels dispersés (`crypto.randomUUID()`, `Math.random()`, `Date.now()`). `setIdGenerator(fn)` permet de brancher des IDs serveur. (`src/utils/id.js`, `demoBoard.js`, `BoardStorage.js`, `IndexedDBImageStorage.js`, `BoardService.js`, `Application.js`, `ModalAddCard.js`, `Comment.js`, `ExportImportService.js`, `ImageDropPlugin.js`, `Note.js`, `ChecklistPlugin.js`, `ClickCounterPlugin.js`, `PomodoroPlugin.js`, `YouTubePlugin.js`, `BoardStatsPlugin.js`, `WorkflowPlugin.js`, `CustomFieldsPlugin.js`)

### Documentation

- Ajout section "Génération d'identifiants" dans `ARCHITECTURE.md`
- Ajout section "Mode Solo-Offline" dans `ARCHITECTURE.md`
- Ajout sections "Onglet Profil" et "Éléments cachés en solo mode" dans `VIEWS-UI.md`

---

## Semaine du 3 février 2026

### Fonctionnalités

- **Champs personnalises (CustomFieldsPlugin)** — Definir des champs personnalises par board (texte, nombre, date, liste, checkbox, URL) et remplir ces champs pour chaque carte. Badges sur les cartes, onglet "Champs" dans les modales ajout/edition, section dans le detail carte. Panneau settings pour CRUD des definitions. (`CustomFieldsPlugin/CustomFieldsPlugin.js`, `CustomFieldsPlugin/settingsPanel.js`, `CustomFieldsPlugin/styles.js`, `CustomFieldsPlugin/index.js`, `CustomFieldsPlugin/manifest.json`, `registry/index.js`)
- **FieldTypeRegistry** — Registre transversal des types de champs reutilisable par d'autres plugins. 6 types integres : text, number, date, select, checkbox, url. (`src/plugins/lib/FieldTypeRegistry.js`)
- **Onglets horizontaux pour les plugins** — Remplacement des filtres par checkboxes par des onglets horizontaux (Tous, Apparence, Widgets, Taxonomies, Productivité, Autre) dans l'onglet Plugins de ModalBoardSettings. L'onglet "Tous" groupe par catégorie avec section headers, les autres affichent uniquement la catégorie sélectionnée. (`PluginsPanel.js`, `_board-settings.scss`)
- **Animation d'entrée de board** — Les colonnes puis les cartes apparaissent en cascade staggerée à l'ouverture d'un board. Effets colonnes (cascade, pop, glissement gauche, fondu) et effets cartes (cascade, pop, élévation) configurables indépendamment via deux selects dans le panneau AnimationPlugin. Persistence IndexedDB. (`AnimationPlugin.js`, `effects.js`, `settingsPanel.js`, `manifest.json`)
- **Hook `board:displayed`** — Nouveau hook émis uniquement au premier affichage d'un board (navigation). `board:rendered` continue de fire à chaque render. L'AnimationPlugin écoute `board:displayed` au lieu de `board:rendered` pour ne pas rejouer les animations lors des re-renders (card move, card add, etc.). (`BoardView.js`, `hookDefinitions.js`, `AnimationPlugin.js`)
- **Export/Import UI** — Bouton "📥 Exporter ce board" dans l'onglet Général de ModalBoardSettings (télécharge un JSON avec images). Bouton "📂 Importer" dans le header de HomeView (file picker, détection single-board vs full export, toast avec stats). (`GeneralPanel.js`, `HomeView.js`, `_board-settings.scss`)
- **Supprimer board depuis les settings** — Bouton "🗑️ Supprimer ce board" dans une zone de danger en bas de l'onglet Général de ModalBoardSettings. Ouvre ModalConfirmDelete, ferme la modale et redirige vers l'accueil après suppression. (`GeneralPanel.js`, `ModalBoardSettings.js`, `_board-settings.scss`)

### Documentation

- **README par plugin** — Création d'un `README.md` dans chacun des 28 dossiers de plugins. Chaque README documente l'architecture, le fonctionnement (hooks, DOM, persistence) et les instructions de modification. (`src/plugins/registry/*/README.md`)
- **Règle CLAUDE.md** — Ajout de la règle de maintenance des README de plugins dans les instructions projet. (`CLAUDE.md`)

### Corrections hautes

- **Board re-render à chaque frappe dans les settings** — Les setters de métadonnées (`name`, `description`, `coverImage`, `backgroundImage`) émettent désormais `emit('change', { meta: true })`. BoardView ignore ces changements pour ne pas reconstruire le plateau inutilement. L'auto-save (BoardService) continue de fonctionner normalement. (`Board.js`, `BoardView.js`)

### Fonctionnalités

- **KeyboardShortcutsPlugin** — Raccourcis clavier centralisés et paramétrables (priority 5). Raccourcis par défaut : Escape (fermer modale), Alt+N (nouvelle carte), Alt+H (accueil), Alt+, (paramètres board), Alt+R (reset filtres). Guards contextuels (saisie texte, board actif, palette ouverte). Panneau de réglages avec capture de touche click-to-record, détection de conflits et bouton réinitialiser. Persistence IndexedDB. Coexistence avec CommandPalettePlugin (chacun gère ses propres raccourcis). (`KeyboardShortcutsPlugin/KeyboardShortcutsPlugin.js`, `KeyboardShortcutsPlugin/settingsPanel.js`, `KeyboardShortcutsPlugin/styles.js`, `KeyboardShortcutsPlugin/manifest.json`, `KeyboardShortcutsPlugin/index.js`, `registry/index.js`)
- **CommandPalettePlugin** — Palette de commandes `Ctrl+K` / `Cmd+K` style VS Code. Recherche de cartes (défaut), actions (`>`), filtrage par tags (`#`) et assignees (`@`), navigation entre boards (`/`). Navigation clavier (↑↓ + Enter), gestion async anti-stale pour la recherche de boards, index des cartes reconstruit automatiquement via hooks. (`CommandPalettePlugin/CommandPalettePlugin.js`, `CommandPalettePlugin/styles.js`, `CommandPalettePlugin/manifest.json`, `CommandPalettePlugin/index.js`, `registry/index.js`)

### Robustesse

- **Error boundaries rendu global** — Chaque niveau de la chaîne de rendu (Application → BoardView → ColumnView → CardListRenderer) est protégé par try/catch. Une carte qui plante n'empêche pas les autres de s'afficher, une colonne en erreur affiche un placeholder, et un board qui échoue propose un retour à l'accueil. Le destroy est résilient à tous les niveaux. Les placeholders utilisent le design system dark (`--color-danger-bg/border`), sont exclus du drag SortableJS, et les fallbacks sont crash-proof (accès safe aux propriétés). (`Application.js`, `BoardView.js`, `ColumnView.js`, `CardListRenderer.js`, `DragDropHandler.js`, `_variables.scss`, `_board.scss`, `_column.scss`, `_card.scss`)
- **Error boundary plugins** — Un plugin qui plante (throw dans un callback de hook ou dans uninstall) ne crash plus l'application. HookRegistry catch chaque callback individuellement dans `doAction()` et `applyFilters()` (pour les filters, la valeur courante est conservée). PluginManager catch les erreurs de `uninstall()` dans `disable()` et `unregister()`. (`HookRegistry.js`, `PluginManager.js`)

### Fonctionnalités

- Fichiers joints dans les commentaires : upload, chips en attente, liens téléchargeables (`Comment.js`, `CommentsPanel.js`)
- Composant `UploadZone` réutilisable avec mode standard (zone dashed) et compact (bouton 📎) (`src/components/UploadZone.js`, `_upload-zone.scss`)
- Utilitaires fichier extraits en module partagé : `getFileIcon()`, `formatFileSize()` (`src/utils/file.js`)

### Refactoring

- FileAttachmentPlugin utilise `UploadZone` et `file.js` au lieu de construire le DOM et les utilitaires en interne
- Styles upload zone déplacés de `styles.js` (plugin) vers `_upload-zone.scss` (global SCSS)
- GC et ExportImport scannent les fichiers des commentaires (`comment.files[].id`)

### UX/UI

- **Icones d'action des cartes agrandies** — Taille 28px (vs 24), opacity 0.6 au repos avec transition a 1.0 au hover carte/bouton, gap augmente a 4px. Meme traitement pour le bouton couleur du CardColorPlugin. (`_card.scss`, `CardColorPlugin/styles.js`)
- **Bouton Supprimer en rouge dans la modale detail** — Bordure et texte rouge au repos, fond rouge + texte blanc au hover. Distingue clairement l'action destructive du bouton Editer. (`_card-detail.scss`)
- **IndexedDB Explorer masque en production** — Conditionne avec `import.meta.env.DEV`, visible uniquement en dev. (`HomeView.js`)
- **Titres de section dans la liste des plugins** — Plugins groupes par categorie (Apparence, Widgets, Taxonomies, Productivite, Autre) avec titres uppercase dans le panneau de configuration. (`PluginsPanel.js`, `_board-settings.scss`)

### Infrastructure

- **ESLint** — Flat config (v10) avec `eslint:recommended` + `eslint-config-prettier`. Regles : `eqeqeq`, `no-var`, `no-unused-vars` (warn, ignore `_prefix`), `no-console` (warn, allow warn/error), `prefer-const`. Globales navigateur declarees. 0 erreurs, 25 warnings au setup. (`eslint.config.js`)
- **Prettier** — Formatage automatique : singleQuote, tabWidth 4, trailingComma all, printWidth 120, endOfLine lf. Formatage progressif via le hook pre-commit. (`.prettierrc`, `.prettierignore`)
- **EditorConfig** — Conventions editeur partagees : UTF-8, LF, 4 espaces, trailing whitespace. (`.editorconfig`)
- **Husky + lint-staged** — Hook pre-commit qui lance ESLint --fix + Prettier --write sur les fichiers stages. Bloque le commit si erreurs ESLint non fixables. (`.husky/pre-commit`, `package.json`)

### Documentation

- **docs/TOOLING.md** — Guide complet des outils de qualite de code : commandes, regles, configuration, formatage progressif.

### Fonctionnalités

- **Priorité déclarative des plugins** — Champ `priority` dans le manifest (défaut 10, plus petit = enregistré plus tôt). `Application._registerPlugins()` trie les plugins avant enregistrement. ToastPlugin déclare `priority: 99` pour être enregistré en dernier. L'ordre dans `registry/index.js` n'a plus d'importance fonctionnelle. (`PluginAssembler.js`, `Application.js`, `ToastPlugin/manifest.json`, `registry/index.js`)
- **Timeout async plugin.install()** — Warning console si `plugin.install()` ne résout pas dans les 5 secondes. Pas de rejet, juste un avertissement pour aider au debug. Nouvelle méthode `_installWithTimeout()` utilisée dans `register()` et `enable()`. (`PluginManager.js`)
- **FileAttachmentPlugin** — Attacher des fichiers (tous types) à une carte. Grille de cards dans la modale détail (onglet Informations, lecture seule avec téléchargement) et dans la modale d'édition (onglet Fichiers, upload bouton + drag-drop, description éditable inline, suppression). Icônes MIME, CSS Grid responsive (`auto-fill, minmax(160px, 1fr)`). Badge 📎 N sur les cartes. Blobs stockés dans IndexedDB, métadonnées dans `card.data.files`. Nettoyage auto à la suppression de carte + support GC et export/import. (`FileAttachmentPlugin/`, `ImageGarbageCollectorPlugin.js`, `ExportImportService.js`, `registry/index.js`)
- **Ordre des onglets modales (`addTab` order)** — `addTab(label, { order })` accepte un paramètre optionnel `order` (défaut 10, plus petit = plus à gauche). Les onglets sont insérés triés dans le DOM via `insertBefore`. Activation par référence directe (tab + panel) au lieu d'index fragile. Backward-compatible : les plugins sans `order` obtiennent la position par défaut. Fichiers (5), Liens (10), Couleur (15). (`BaseModal.js`, `ModalEditCard.js`, `ModalAddCard.js`, `FileAttachmentPlugin.js`, `CardLinksPlugin.js`, `ColorPluginFactory.js`)

### Tests

- **PluginAssembler** — 12 tests : métadonnées (name, label, description, tags, hooks), priority (copie, défaut 10, 0 respecté, 99), modules optionnels (styles, settingsPanel, retour). (`PluginAssembler.test.js`)
- **PluginManager** — 31 tests : register (sync, async, désactivé, erreur sync/async, doublons, hooks provides, événement change), enable/disable (cycle, erreur, no-ops), unregister (cleanup, uninstall, inconnu), timeout async (sync/async rapide sans warning, lent avec warning, timer nettoyé après resolve/reject, warning via enable), tri par priorité (ordre, défaut, stabilité, immutabilité), accesseurs (getPlugin, getAll). (`PluginManager.test.js`)
- **ImageGarbageCollectorPlugin** — Supprime automatiquement les images orphelines en IndexedDB après chaque sauvegarde de board (debounce 10s). Scanne 6 points de référence : background, cover, image legacy carte, image widget, descriptions et commentaires markdown. (`ImageGarbageCollectorPlugin/ImageGarbageCollectorPlugin.js`, `ImageGarbageCollectorPlugin/manifest.json`, `ImageGarbageCollectorPlugin/index.js`, `ImageGarbageCollectorPlugin/styles.js`, `registry/index.js`)
- **ImagePastePlugin** — Coller une image depuis le presse-papier dans la description d'une carte ou dans un commentaire. L'image est stockée dans IndexedDB et référencée via le schéma markdown `![image](img:<id>)`. Descriptions via hook `modal:editCard:opened`, commentaires via délégation globale sur `document`. (`ImagePastePlugin/ImagePastePlugin.js`, `ImagePastePlugin/manifest.json`, `ImagePastePlugin/index.js`, `ImagePastePlugin/styles.js`, `registry/index.js`)
- **MarkdownPlugin — rendu images IndexedDB** — Le MarkdownPlugin résout les références `img:<id>` en Object URLs au moment du rendu. Utilise un placeholder `<div data-image-id>` pour contourner le sanitize DOMPurify, puis remplace par `<img src="blob:...">` de manière asynchrone (même pattern que Mermaid). (`MarkdownPlugin/MarkdownPlugin.js`, `MarkdownPlugin/styles.js`)

### Corrections hautes

- **Export/import — remap `img:` dans les textes markdown** — `_remapImageReferences` remappe maintenant les références `img:<id>` dans les descriptions de cartes et les commentaires lors de l'import. Nouvelle méthode `_remapImageMarkdown` avec regex sur le pattern `![alt](img:<id>)`. (`ExportImportService.js`)
- **`_debouncedSave` — rejection non catchée** — Ajout d'un `catch` dans le debounce auto-save pour éviter les unhandled promise rejections si `save()` échoue de manière inattendue. (`BoardService.js`)
- **`toJSON()` pluginData mutable** — `Board.toJSON()` et `Column.toJSON()` retournent maintenant une copie shallow de `pluginData` au lieu de la référence directe, empêchant les mutations accidentelles du snapshot sérialisé. (`Board.js`, `Column.js`)
- **Styles plugins non retirés au disable/unregister** — `PluginAssembler` câble `_removeStyles()` en plus de `_injectStyles()`. `PluginManager.disable()` et `unregister()` appellent automatiquement `_removeStyles()` pour retirer le `<style>` du `<head>`. (`PluginAssembler.js`, `PluginManager.js`)
- **CardView.destroy() — listener bouton edit non retiré** — Le listener du bouton éditer est maintenant explicitement retiré dans `destroy()`, évitant une rétention mémoire potentielle. (`CardView.js`)

---

### Infrastructure

- **Migration CSS fondation** — Remplacement de `modal-input`, `modal-btn` et `form-group` dupliqué dans `_modal.scss` par les classes fondation (`input`, `textarea`, `btn`, `btn--cancel`, `btn--primary`, `btn--danger`). Ajout de `btn--cancel` dans `_components.scss`. Migration de toutes les vues et plugins. (`_components.scss`, `_modal.scss`, `BaseModal.js`, `ModalAddCard.js`, `ModalEditCard.js`, `ModalAddColumn.js`, `ModalDeleteColumn.js`, `ModalConfirmDelete.js`, `ModalPluginSettings.js`, plugins settings panels)
- **Boutons carte toujours visibles** — Le bouton éditer et le bouton couleur sont maintenant toujours visibles (plus de hover-only). Les deux boutons sont regroupés dans un conteneur `.card-actions` en haut à droite. (`CardView.js`, `_card.scss`, `CardColorPlugin.js`, `CardColorPlugin/styles.js`)
- **Bouton supprimer dans la modale d'édition** — Ajout d'un bouton "Supprimer" (style danger) à gauche du footer de `ModalEditCard`. Ouvre une confirmation avant suppression. Soumis à la permission `deleteCard`. (`ModalEditCard.js`, `ColumnView.js`)
- **Board démo enrichi** — Les descriptions des cartes du board de démonstration utilisent du Markdown (gras, listes, citations, tableaux, blocs de code) et des diagrammes Mermaid (flowchart, sequence diagram, graph). (`demoBoard.js`)

### Fonctionnalités

- **CardLinksPlugin** — Plugin de liens bidirectionnels entre cartes : badge `🔗 N` sur les cartes liées, highlight (box-shadow) des cartes liées au survol, onglet "Liens" dans la modale d'édition avec recherche et ajout/retrait. Nettoyage automatique à la suppression d'une carte. (`CardLinksPlugin/CardLinksPlugin.js`, `CardLinksPlugin/styles.js`, `CardLinksPlugin/index.js`, `CardLinksPlugin/manifest.json`, `registry/index.js`)
- **AnimationPlugin** (ex ModalAnimationPlugin) — Renommé pour refléter son scope élargi. 6 effets modales (pop, fondu, glissement haut/bas, zoom, flip) + 3 effets drop de carte (pop, flash, rebond) avec option "Aucun". Deux selects dans le panneau de settings, persistence IndexedDB en format objet avec migration auto de l'ancien format. (`AnimationPlugin.js`, `effects.js`, `settingsPanel.js`, `index.js`, `manifest.json`)

- **Suppression de colonne** — Bouton 🗑 dans le header de chaque colonne (admin only). Modale de confirmation avec migration des cartes vers une colonne cible au choix. (`ModalDeleteColumn.js`, `BoardService.removeColumn`, `ColumnView.js`)
- **Multi-board** — Support complet : registre IndexedDB, board switcher, données plugins par board, images indexées par board.

### Corrections critiques

- **Board.moveCard() null pointer** — Ajout d'un guard `if (!fromColumn || !toColumn) return` pour éviter un crash si une colonne source ou cible est invalide. (`Board.js`)
- **Import sans validation structurelle** — Ajout de `_validateBoardStructure()` dans `ExportImportService.js`. Vérifie la présence et le type de `id`, `columns[]`, `cards[]`, `title` avant import. Les boards malformés sont ignorés (importAll) ou rejetés (importBoard).

### Corrections hautes

- **pluginData exposé par référence mutable** — Le getter `pluginData` de Board et Column retourne désormais une copie shallow (`{ ...this._pluginData }`). Ajout de `pluginDataRef` pour l'accès direct interne et `setPluginData(key, value)` pour la mutation safe. Migration des 6 sites d'écriture dans les plugins. (`Board.js`, `Column.js`, `OpApplier.js`, `ColorPluginFactory.js`, `NoteManager.js`, `WorkflowPlugin.js`)
- **8 hooks non déclarés dans hookDefinitions.js** — Ajout de 10 hooks avec métadonnées complètes (label, category, payload, notification) : `card:beforeDelete`, `card:beforeMove`, `column:added`, `column:renamed`, `column:beforeRemove`, `column:removed`, `column:renderHeader`, `column:renderBody`. (`hookDefinitions.js`)

### Tests

- **128 tests unitaires** — 5 fichiers de tests couvrant les models et le core :
  - `BoardDiffer.test.js` — 17 tests (fonction pure, tous types d'ops)
  - `Card.test.js` — 27 tests (construction, immutabilité tags/data, update, diff, comments, toJSON)
  - `Column.test.js` — 24 tests (CRUD cartes, pluginData, moveCard, replaceCards, events)
  - `Board.test.js` — 37 tests (colonnes CRUD, moveCard null guard, itérateurs, event bubbling, pluginData)
  - `HookRegistry.test.js` — 23 tests (actions, filters, priorités, récursion, contextes)
- Couverture models : Card 100%, Column 100%, Board 98.9%, CardHistory 100%.

### Documentation

- **4 fichiers onboarding** créés dans `docs/` : `ARCHITECTURE.md`, `PLUGIN-SYSTEM.md`, `DATA-MODELS.md`, `VIEWS-UI.md`.
- **2 audits** : `audits/2026-02-04-livesync-plugin.md` (8.6/10), `audits/2026-02-06-full-codebase.md` (8.2/10).
- **CLAUDE.md** — Ajout directive Mermaid thème clair, règles de maintenance documentation.

### Infrastructure

- **Vitest** configuré avec happy-dom, coverage v8. Scripts `test`, `test:run`, `test:coverage` dans `package.json`.
- **Permission `deleteColumn`** ajoutée dans `PermissionService.js` (admin only).
