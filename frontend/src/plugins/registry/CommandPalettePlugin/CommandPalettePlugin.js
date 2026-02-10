/**
 * CommandPalettePlugin.js — Palette de commandes (Ctrl+K / Cmd+K).
 *
 * Permet de :
 * - Rechercher des cartes (mode par défaut)
 * - Exécuter des actions (préfixe `>`)
 * - Filtrer par tag (préfixe `#`)
 * - Filtrer par assignee (préfixe `@`)
 * - Changer de board (préfixe `/`)
 *
 * Le DOM est créé une seule fois dans install() et affiché/masqué via toggle.
 *
 *
 * ═══════════════════════════════════════════════════════════════
 * GUIDE : AJOUTER DES COMMANDES À LA PALETTE
 * ═══════════════════════════════════════════════════════════════
 *
 * Chaque résultat affiché dans la palette est un objet de la forme :
 *
 *   {
 *       label:       string,     — Texte principal (ex: "Créer une carte")
 *       description: string,     — Sous-texte gris (ex: "Ouvrir le formulaire")
 *       icon:        string,     — Emoji affiché à gauche (ex: "➕")
 *       action:      () => void  — Fonction exécutée au clic ou Enter
 *   }
 *
 * ─────────────────────────────────────────────────────────────
 * 1. AJOUTER UNE ACTION STATIQUE (préfixe `>`)
 * ─────────────────────────────────────────────────────────────
 *
 * Modifier `_getActionResults(query)`. Ajouter un objet au tableau `actions` :
 *
 *   actions.push({
 *       label: 'Exporter le board',
 *       description: 'Télécharger en JSON',
 *       icon: '📥',
 *       action: () => {
 *           ExportImportService.exportBoard(board);
 *       },
 *   });
 *
 * Si l'action nécessite un board actif, l'ajouter dans le bloc `if (board)`.
 * Sinon, l'ajouter après (comme "Accueil" qui est toujours disponible).
 *
 * ─────────────────────────────────────────────────────────────
 * 2. AJOUTER UN MODE DE RECHERCHE (nouveau préfixe)
 * ─────────────────────────────────────────────────────────────
 *
 * Trois étapes :
 *
 * a) Créer la méthode `_getMonModeResults(query)` qui retourne un
 *    tableau d'objets { label, description, icon, action }.
 *
 * b) Ajouter le branchement dans `_onInput()` :
 *
 *      } else if (raw.startsWith('!')) {
 *          const query = raw.slice(1).trim();
 *          this._renderResults(this._getMonModeResults(query));
 *      }
 *
 * c) Ajouter le hint dans `_buildDOM()` (tableau `hints.innerHTML`) :
 *
 *      '<span class="cp-hint"><kbd>!</kbd> Mon mode</span>'
 *
 * ─────────────────────────────────────────────────────────────
 * 3. AJOUTER UN MODE ASYNC (comme la recherche de boards)
 * ─────────────────────────────────────────────────────────────
 *
 * Si la source de données est asynchrone (IndexedDB, API...), utiliser
 * le pattern anti-stale avec `_searchRequestId` :
 *
 *   async _handleMonModeSearch(query) {
 *       const requestId = ++this._searchRequestId;
 *
 *       const data = await MonService.getData();
 *
 *       // Si l'user a tapé autre chose entre-temps, on jette le résultat
 *       if (requestId !== this._searchRequestId) return;
 *
 *       const results = data
 *           .filter(item => this._matches(item.name, query))
 *           .map(item => ({
 *               label: item.name,
 *               description: '...',
 *               icon: '🔮',
 *               action: () => { ... },
 *           }));
 *
 *       if (requestId !== this._searchRequestId) return;
 *       this._renderResults(results);
 *   }
 *
 * Le double-check du requestId (avant et après le build des résultats)
 * évite tout flash de résultats périmés.
 *
 * Dans `_onInput()`, appeler directement (sans `this._renderResults()`) :
 *
 *      } else if (raw.startsWith('!')) {
 *          const query = raw.slice(1).trim();
 *          this._handleMonModeSearch(query);  // async, gère son propre rendu
 *      }
 *
 * ─────────────────────────────────────────────────────────────
 * 4. RÉSUMÉ DES PRÉFIXES EXISTANTS
 * ─────────────────────────────────────────────────────────────
 *
 *   (aucun) → _getCardResults()        — Recherche cartes par titre
 *   >       → _getActionResults()      — Actions statiques (modales, nav)
 *   #       → _getTagResults()         — Filtrage par terme de taxonomie
 *   @       → _getAssigneeResults()    — Filtrage par assignee
 *   /       → _handleBoardSearch()     — Navigation entre boards (async)
 *
 * ═══════════════════════════════════════════════════════════════
 */
import Application from '../../../Application.js';
import Router from '../../../services/Router.js';
import BoardService from '../../../services/BoardService.js';
import StorageService from '../../../services/StorageService.js';
import FilterStore from '../../../services/FilterStore.js';
import TaxonomyService from '../../../services/TaxonomyService.js';
import UserService from '../../../services/UserService.js';
import ModalCardDetail from '../../../views/ModalCardDetail.js';
import { isSoloMode } from '../../../config/appMode.js';
import ModalAddCard from '../../../views/ModalAddCard.js';
import ModalAddColumn from '../../../views/ModalAddColumn.js';
import ModalBoardSettings from '../../../views/ModalBoardSettings.js';

export default class CommandPalettePlugin {
    // =========================================================
    // Champs privés
    // =========================================================

    /** @type {import('../../HookRegistry.js').default|null} */
    _hooks = null;

    /** @type {HTMLElement|null} */
    _overlay = null;

    /** @type {HTMLInputElement|null} */
    _input = null;

    /** @type {HTMLElement|null} */
    _resultsList = null;

    /** @type {boolean} */
    _isOpen = false;

    /** @type {Array<{card: import('../../../models/Card.js').default, column: import('../../../models/Column.js').default}>} */
    _cardIndex = [];

    /** @type {Array<{label: string, description: string, icon: string, action: function}>} */
    _currentResults = [];

    /** @type {number} Index du résultat actif (navigation clavier) */
    _activeIndex = -1;

    /** @type {number} Anti-stale pour les recherches async (boards) */
    _searchRequestId = 0;

    /** @type {Object<string, function>} Handlers pour removeAction propre */
    _handlers = {};

    /** @type {function} Référence au listener keydown pour pouvoir le retirer */
    _boundKeydown = null;

    // =========================================================
    // Lifecycle
    // =========================================================

    /**
     * Installe le plugin : styles, DOM, raccourci clavier, hooks.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        this._hooks = hooks;

        if (typeof this._injectStyles === 'function') {
            this._injectStyles();
        }

        this._buildDOM();
        this._buildCardIndex();

        // Raccourci clavier global
        this._boundKeydown = (e) => this._onKeydown(e);
        document.addEventListener('keydown', this._boundKeydown);

        // Hooks — reconstruction de l'index
        this._handlers.onBoardDidChange = () => this._buildCardIndex();
        this._handlers.onBoardWillChange = () => this.close();
        this._handlers.onCardCreated = () => this._buildCardIndex();
        this._handlers.onCardUpdated = () => this._buildCardIndex();
        this._handlers.onCardDeleted = () => this._buildCardIndex();
        this._handlers.onCardMoved = () => this._buildCardIndex();
        this._handlers.onColumnAdded = () => this._buildCardIndex();
        this._handlers.onColumnRemoved = () => this._buildCardIndex();

        hooks.addAction('board:didChange', this._handlers.onBoardDidChange);
        hooks.addAction('board:willChange', this._handlers.onBoardWillChange);
        hooks.addAction('card:created', this._handlers.onCardCreated);
        hooks.addAction('card:updated', this._handlers.onCardUpdated);
        hooks.addAction('card:deleted', this._handlers.onCardDeleted);
        hooks.addAction('card:moved', this._handlers.onCardMoved);
        hooks.addAction('column:added', this._handlers.onColumnAdded);
        hooks.addAction('column:removed', this._handlers.onColumnRemoved);
    }

    /**
     * Désinstalle le plugin : ferme la palette, retire listeners et DOM.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        this.close();

        // Retirer le listener clavier
        if (this._boundKeydown) {
            document.removeEventListener('keydown', this._boundKeydown);
            this._boundKeydown = null;
        }

        // Retirer les hooks
        hooks.removeAction('board:didChange', this._handlers.onBoardDidChange);
        hooks.removeAction('board:willChange', this._handlers.onBoardWillChange);
        hooks.removeAction('card:created', this._handlers.onCardCreated);
        hooks.removeAction('card:updated', this._handlers.onCardUpdated);
        hooks.removeAction('card:deleted', this._handlers.onCardDeleted);
        hooks.removeAction('card:moved', this._handlers.onCardMoved);
        hooks.removeAction('column:added', this._handlers.onColumnAdded);
        hooks.removeAction('column:removed', this._handlers.onColumnRemoved);

        // Retirer le DOM
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }

        // Styles
        if (typeof this._removeStyles === 'function') {
            this._removeStyles();
        }

        this._hooks = null;
    }

    // =========================================================
    // DOM
    // =========================================================

    /**
     * Construit le DOM de la palette (une seule fois).
     * Créé masqué, affiché/masqué via open()/close().
     *
     * @private
     */
    _buildDOM() {
        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'cp-overlay';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        // Panel
        const panel = document.createElement('div');
        panel.className = 'cp-panel';

        // Header avec icône + input
        const header = document.createElement('div');
        header.className = 'cp-header';

        const searchIcon = document.createElement('span');
        searchIcon.className = 'cp-search-icon';
        searchIcon.textContent = '🔍';

        const input = document.createElement('input');
        input.className = 'cp-input';
        input.type = 'text';
        input.placeholder = 'Rechercher une carte...';
        input.addEventListener('input', () => this._onInput());

        header.appendChild(searchIcon);
        header.appendChild(input);

        // Résultats
        const results = document.createElement('div');
        results.className = 'cp-results';

        // Hints (raccourcis clavier)
        const hints = document.createElement('div');
        hints.className = 'cp-hints';
        const hintItems = [
            '<span class="cp-hint"><kbd>&gt;</kbd> Actions</span>',
            '<span class="cp-hint"><kbd>#</kbd> Tags</span>',
        ];
        if (!isSoloMode()) {
            hintItems.push('<span class="cp-hint"><kbd>@</kbd> Assignees</span>');
        }
        hintItems.push(
            '<span class="cp-hint"><kbd>/</kbd> Boards</span>',
            '<span class="cp-hint"><kbd>↑↓</kbd> Naviguer</span>',
            '<span class="cp-hint"><kbd>↵</kbd> Ouvrir</span>',
            '<span class="cp-hint"><kbd>Esc</kbd> Fermer</span>',
        );
        hints.innerHTML = hintItems.join('');

        // Assemblage
        panel.appendChild(header);
        panel.appendChild(results);
        panel.appendChild(hints);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        this._overlay = overlay;
        this._input = input;
        this._resultsList = results;
    }

    // =========================================================
    // Open / Close / Toggle
    // =========================================================

    /**
     * Ouvre la palette de commandes.
     */
    open() {
        if (this._isOpen) return;
        this._isOpen = true;
        this._overlay.classList.add('cp-overlay--visible');
        this._input.value = '';
        this._activeIndex = -1;
        this._renderResults([]);
        this._input.focus();
    }

    /**
     * Ferme la palette de commandes et réinitialise l'état.
     */
    close() {
        if (!this._isOpen) return;
        this._isOpen = false;
        this._overlay.classList.remove('cp-overlay--visible');
        this._input.value = '';
        this._currentResults = [];
        this._activeIndex = -1;
    }

    /**
     * Ouvre ou ferme la palette.
     */
    toggle() {
        if (this._isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    // =========================================================
    // Clavier
    // =========================================================

    /**
     * Gère les raccourcis clavier globaux et la navigation dans les résultats.
     *
     * @param {KeyboardEvent} e
     * @private
     */
    _onKeydown(e) {
        const isMod = e.metaKey || e.ctrlKey;

        // Ctrl+K / Cmd+K → toggle
        if (isMod && e.key === 'k') {
            e.preventDefault();
            this.toggle();
            return;
        }

        // Les touches suivantes ne s'appliquent que si la palette est ouverte
        if (!this._isOpen) return;

        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                e.stopPropagation();
                this.close();
                break;

            case 'ArrowDown':
                e.preventDefault();
                this._moveSelection(1);
                break;

            case 'ArrowUp':
                e.preventDefault();
                this._moveSelection(-1);
                break;

            case 'Enter':
                e.preventDefault();
                this._executeActive();
                break;
        }
    }

    /**
     * Déplace la sélection active dans la liste de résultats (avec wrap-around).
     *
     * @param {number} delta - +1 pour descendre, -1 pour monter
     * @private
     */
    _moveSelection(delta) {
        const count = this._currentResults.length;
        if (count === 0) return;

        this._activeIndex = (this._activeIndex + delta + count) % count;
        this._updateActiveHighlight();
    }

    /**
     * Exécute l'action du résultat actuellement sélectionné.
     *
     * @private
     */
    _executeActive() {
        const result = this._currentResults[this._activeIndex];
        if (!result) return;

        this.close();
        result.action();
    }

    // =========================================================
    // Recherche — dispatch par préfixe
    // =========================================================

    /**
     * Appelé à chaque saisie dans l'input.
     * Dispatch vers le bon mode de recherche selon le préfixe.
     *
     * @private
     */
    _onInput() {
        const raw = this._input.value;

        if (raw.startsWith('>')) {
            const query = raw.slice(1).trim();
            this._renderResults(this._getActionResults(query));
        } else if (raw.startsWith('#')) {
            const query = raw.slice(1).trim();
            this._renderResults(this._getTagResults(query));
        } else if (raw.startsWith('@') && !isSoloMode()) {
            const query = raw.slice(1).trim();
            this._renderResults(this._getAssigneeResults(query));
        } else if (raw.startsWith('/')) {
            const query = raw.slice(1).trim();
            this._handleBoardSearch(query);
        } else {
            this._renderResults(this._getCardResults(raw.trim()));
        }
    }

    /**
     * Vérifie si `text` contient `query` (case-insensitive).
     *
     * @param {string} text
     * @param {string} query
     * @returns {boolean}
     * @private
     */
    _matches(text, query) {
        if (!query) return true;
        return text.toLowerCase().includes(query.toLowerCase());
    }

    // =========================================================
    // Index des cartes
    // =========================================================

    /**
     * Reconstruit l'index plat des cartes à partir du board actif.
     * Appelé lors des changements de board/cartes/colonnes.
     *
     * @private
     */
    _buildCardIndex() {
        this._cardIndex = [];
        const board = Application.instance?.currentBoard;
        if (!board) return;

        for (const { card, column } of board.entries()) {
            this._cardIndex.push({ card, column });
        }
    }

    // =========================================================
    // Résultats par mode
    // =========================================================

    /**
     * Recherche de cartes par titre (mode par défaut).
     *
     * @param {string} query
     * @returns {Array<{label: string, description: string, icon: string, action: function}>}
     * @private
     */
    _getCardResults(query) {
        if (!query) return [];

        return this._cardIndex
            .filter(({ card }) => this._matches(card.title, query))
            .slice(0, 20)
            .map(({ card, column }) => ({
                label: card.title,
                description: column.title,
                icon: '📄',
                action: () => {
                    const modal = new ModalCardDetail(card);
                    modal.open();
                },
            }));
    }

    /**
     * Liste statique d'actions (préfixe `>`).
     *
     * @param {string} query
     * @returns {Array<{label: string, description: string, icon: string, action: function}>}
     * @private
     */
    _getActionResults(query) {
        const board = Application.instance?.currentBoard;
        const actions = [];

        if (board) {
            actions.push({
                label: 'Créer une carte',
                description: 'Ouvrir le formulaire de création',
                icon: '➕',
                action: () => {
                    const modal = new ModalAddCard(
                        (cardData) => {
                            if (cardData.columnId) {
                                BoardService.addCard(cardData.columnId, cardData);
                            }
                        },
                        { columns: board.columns },
                    );
                    modal.open();
                },
            });

            actions.push({
                label: 'Ajouter une colonne',
                description: 'Créer une nouvelle colonne',
                icon: '📋',
                action: () => {
                    const modal = new ModalAddColumn((title) => {
                        BoardService.addColumn(title);
                    });
                    modal.open();
                },
            });

            actions.push({
                label: 'Paramètres du board',
                description: 'Ouvrir les paramètres',
                icon: '⚙️',
                action: () => {
                    const modal = new ModalBoardSettings(board);
                    modal.open();
                },
            });

            actions.push({
                label: 'Réinitialiser les filtres',
                description: 'Supprimer tous les filtres actifs',
                icon: '🔄',
                action: () => {
                    FilterStore.reset();
                },
            });
        }

        actions.push({
            label: 'Accueil',
            description: "Retourner à la page d'accueil",
            icon: '🏠',
            action: () => {
                Router.navigate('/');
            },
        });

        if (!query) return actions;
        return actions.filter((a) => this._matches(a.label, query));
    }

    /**
     * Recherche de tags dans toutes les taxonomies (préfixe `#`).
     *
     * @param {string} query
     * @returns {Array<{label: string, description: string, icon: string, action: function}>}
     * @private
     */
    _getTagResults(query) {
        const taxonomies = TaxonomyService.getTaxonomies();
        const results = [];

        for (const [taxonomyId, taxonomy] of Object.entries(taxonomies)) {
            for (const [termId, term] of Object.entries(taxonomy.terms)) {
                if (this._matches(term.label, query)) {
                    results.push({
                        label: term.label,
                        description: taxonomy.label,
                        icon: '🏷️',
                        action: () => {
                            FilterStore.setFilter('tags', {
                                [taxonomyId]: [termId],
                            });
                        },
                    });
                }
            }
        }

        return results.slice(0, 20);
    }

    /**
     * Recherche d'assignees (préfixe `@`).
     *
     * @param {string} query
     * @returns {Array<{label: string, description: string, icon: string, action: function}>}
     * @private
     */
    _getAssigneeResults(query) {
        const users = UserService.getUsers();

        return users
            .filter((u) => this._matches(u.name, query))
            .slice(0, 20)
            .map((user) => ({
                label: user.name,
                description: user.role || 'Utilisateur',
                icon: '👤',
                action: () => {
                    FilterStore.setFilter('assignee', user.id);
                },
            }));
    }

    /**
     * Recherche de boards (préfixe `/`).
     * Async — utilise un compteur pour éviter les résultats stale.
     *
     * @param {string} query
     * @private
     */
    async _handleBoardSearch(query) {
        const requestId = ++this._searchRequestId;

        const registry = await StorageService.getBoardRegistry();
        if (!registry) return;

        // Abandon si une nouvelle recherche a été lancée entre-temps
        if (requestId !== this._searchRequestId) return;

        const boards = registry.boards || [];
        const currentBoardId = Application.instance?.currentBoardId;

        const results = boards
            .filter((b) => b.id !== currentBoardId && this._matches(b.name, query))
            .slice(0, 20)
            .map((board) => ({
                label: board.name,
                description: `${board.cardCount ?? 0} cartes`,
                icon: '📁',
                action: () => {
                    Router.navigate('/board/' + board.id);
                },
            }));

        // Re-vérifier que la requête est toujours la dernière
        if (requestId !== this._searchRequestId) return;

        this._renderResults(results);
    }

    // =========================================================
    // Rendu
    // =========================================================

    /**
     * Affiche les résultats dans le panel.
     *
     * @param {Array<{label: string, description: string, icon: string, action: function}>} results
     * @private
     */
    _renderResults(results) {
        this._resultsList.innerHTML = '';
        this._currentResults = results;

        if (results.length === 0) {
            const query = this._input?.value?.trim();
            if (query) {
                const empty = document.createElement('div');
                empty.className = 'cp-empty';
                empty.textContent = 'Aucun résultat';
                this._resultsList.appendChild(empty);
            }
            this._activeIndex = -1;
            return;
        }

        this._activeIndex = 0;

        results.forEach((result, index) => {
            const el = document.createElement('div');
            el.className = 'cp-result';
            if (index === 0) el.classList.add('cp-result--active');

            const icon = document.createElement('span');
            icon.className = 'cp-result-icon';
            icon.textContent = result.icon;

            const text = document.createElement('div');
            text.className = 'cp-result-text';

            const label = document.createElement('span');
            label.className = 'cp-result-label';
            label.textContent = result.label;

            const desc = document.createElement('span');
            desc.className = 'cp-result-description';
            desc.textContent = result.description;

            text.appendChild(label);
            text.appendChild(desc);

            el.appendChild(icon);
            el.appendChild(text);

            // Clic → exécute l'action
            el.addEventListener('click', () => {
                this.close();
                result.action();
            });

            // Hover → met à jour la sélection active
            el.addEventListener('mouseenter', () => {
                this._activeIndex = index;
                this._updateActiveHighlight();
            });

            this._resultsList.appendChild(el);
        });
    }

    /**
     * Met à jour la classe `.cp-result--active` sur le bon élément
     * et le fait défiler dans la vue si nécessaire.
     *
     * @private
     */
    _updateActiveHighlight() {
        const items = this._resultsList.querySelectorAll('.cp-result');
        items.forEach((item, i) => {
            item.classList.toggle('cp-result--active', i === this._activeIndex);
        });

        const activeEl = items[this._activeIndex];
        if (activeEl) {
            activeEl.scrollIntoView({ block: 'nearest' });
        }
    }
}
