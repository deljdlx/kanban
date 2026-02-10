/**
 * CardLinksPlugin — Liens bidirectionnels entre cartes.
 *
 * Fonctionnalités :
 *   - Badge "🔗 N" sur les cartes ayant des liens
 *   - Survol d'une carte → highlight (box-shadow) de toutes les cartes liées
 *   - Onglet "Liens" dans la modale d'édition pour ajouter/retirer des liens
 *   - Nettoyage automatique des liens quand une carte est supprimée
 *
 * Stockage : board.pluginData['card-links']
 *   Map symétrique { cardId: [linkedIds] }
 *   Si A→B existe, alors B→A existe aussi.
 *
 * Hooks utilisés :
 *   - board:didChange   : charge le linksMap depuis le board
 *   - board:willChange  : cleanup observer + handlers
 *   - board:rendered    : setup MutationObserver + traite les cartes existantes
 *   - modal:editCard:opened : ajoute l'onglet "Liens"
 *   - card:deleted      : nettoie les liens de la carte supprimée
 */
import Application from '../../../Application.js';

/** @type {string} Clé dans board.pluginData */
const PLUGIN_DATA_KEY = 'card-links';

export default {
    // ---------------------------------------------------------------
    // État interne
    // ---------------------------------------------------------------

    /** @type {import('../../../models/Board.js').default|null} */
    _board: null,

    /** @type {Object<string, string[]>} Cache local cardId → [linkedIds] */
    _linksMap: {},

    /** @type {MutationObserver|null} */
    _boardObserver: null,

    /** @type {Array<{ hookName: string, callback: Function }>} Pour uninstall auto */
    _registeredHooks: [],

    // ---------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------

    /**
     * Installe le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        this._registeredHooks = [];

        if (typeof this._injectStyles === 'function') {
            this._injectStyles();
        }

        this._listen(hooks, 'board:didChange', ({ board }) => this._onBoardDidChange(board));
        this._listen(hooks, 'board:willChange', () => this._onBoardWillChange());
        this._listen(hooks, 'board:rendered', ({ element }) => this._onBoardRendered(element));
        this._listen(hooks, 'modal:editCard:opened', (ctx) => this._onModalEditCard(ctx));
        this._listen(hooks, 'card:deleted', ({ card }) => this._onCardDeleted(card));
    },

    /**
     * Désinstalle le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        this._onBoardWillChange();

        for (const { hookName, callback } of this._registeredHooks) {
            hooks.removeAction(hookName, callback);
        }
        this._registeredHooks = [];
        this._board = null;
    },

    /**
     * Enregistre un hook et le track pour uninstall automatique.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     * @param {string} hookName
     * @param {Function} callback
     * @private
     */
    _listen(hooks, hookName, callback) {
        hooks.addAction(hookName, callback);
        this._registeredHooks.push({ hookName, callback });
    },

    // ---------------------------------------------------------------
    // Handlers de hooks
    // ---------------------------------------------------------------

    /**
     * Charge le linksMap depuis le board nouvellement chargé.
     *
     * @param {import('../../../models/Board.js').default} board
     * @private
     */
    _onBoardDidChange(board) {
        this._board = board;
        this._loadLinks();
    },

    /**
     * Cleanup avant switch de board : déconnecte l'observer
     * et retire les flags hover des éléments DOM.
     *
     * @private
     */
    _onBoardWillChange() {
        if (this._boardObserver) {
            this._boardObserver.disconnect();
            this._boardObserver = null;
        }

        // Évite de servir des données obsolètes entre willChange et didChange
        this._linksMap = {};

        // Retire les badges et classes injectés
        document.querySelectorAll('.clp-badge').forEach((el) => el.remove());
        document.querySelectorAll('.clp-highlight').forEach((el) => el.classList.remove('clp-highlight'));
    },

    /**
     * Board rendu : setup le MutationObserver et traite les cartes existantes.
     *
     * @param {HTMLElement} element
     * @private
     */
    _onBoardRendered(element) {
        this._setupBoardObserver(element);
        this._processAllCards();
    },

    /**
     * Carte supprimée : nettoie tous ses liens.
     *
     * @param {import('../../../models/Card.js').default} card
     * @private
     */
    _onCardDeleted(card) {
        this._cleanupCardLinks(card.id);
    },

    /**
     * Modale d'édition ouverte : ajoute l'onglet "Liens".
     *
     * @param {{ cardId: string, card: import('../../../models/Card.js').default, addTab: Function, onClose: Function }} ctx
     * @private
     */
    _onModalEditCard({ cardId, addTab }) {
        const panel = addTab('Liens', { order: 10 });
        this._buildLinksPanel(panel, cardId);
    },

    // ---------------------------------------------------------------
    // Persistance
    // ---------------------------------------------------------------

    /**
     * Charge les liens depuis board.pluginData.
     *
     * @private
     */
    _loadLinks() {
        if (!this._board) {
            this._board = Application.instance?.currentBoard || null;
        }

        if (this._board) {
            this._linksMap = this._board.pluginData[PLUGIN_DATA_KEY] || {};
        } else {
            this._linksMap = {};
        }
    },

    /**
     * Sauvegarde les liens dans board.pluginData et émet 'change'.
     *
     * @private
     */
    _saveLinks() {
        if (!this._board) return;
        this._board.setPluginData(PLUGIN_DATA_KEY, { ...this._linksMap });
    },

    // ---------------------------------------------------------------
    // Gestion des liens (toujours symétrique)
    // ---------------------------------------------------------------

    /**
     * Retourne les IDs des cartes liées à cardId.
     *
     * @param {string} cardId
     * @returns {string[]}
     * @private
     */
    _getLinks(cardId) {
        return this._linksMap[cardId] || [];
    },

    /**
     * Ajoute un lien bidirectionnel entre deux cartes.
     * Vérifie les doublons avant d'ajouter.
     *
     * @param {string} cardIdA
     * @param {string} cardIdB
     * @private
     */
    _addLink(cardIdA, cardIdB) {
        if (cardIdA === cardIdB) return;

        // A → B
        if (!this._linksMap[cardIdA]) {
            this._linksMap[cardIdA] = [];
        }
        if (!this._linksMap[cardIdA].includes(cardIdB)) {
            this._linksMap[cardIdA].push(cardIdB);
        }

        // B → A (symétrique)
        if (!this._linksMap[cardIdB]) {
            this._linksMap[cardIdB] = [];
        }
        if (!this._linksMap[cardIdB].includes(cardIdA)) {
            this._linksMap[cardIdB].push(cardIdA);
        }

        this._saveLinks();
    },

    /**
     * Retire un lien bidirectionnel entre deux cartes.
     *
     * @param {string} cardIdA
     * @param {string} cardIdB
     * @private
     */
    _removeLink(cardIdA, cardIdB) {
        // Retire B de la liste de A
        if (this._linksMap[cardIdA]) {
            this._linksMap[cardIdA] = this._linksMap[cardIdA].filter((id) => id !== cardIdB);
            if (this._linksMap[cardIdA].length === 0) {
                delete this._linksMap[cardIdA];
            }
        }

        // Retire A de la liste de B (symétrique)
        if (this._linksMap[cardIdB]) {
            this._linksMap[cardIdB] = this._linksMap[cardIdB].filter((id) => id !== cardIdA);
            if (this._linksMap[cardIdB].length === 0) {
                delete this._linksMap[cardIdB];
            }
        }

        this._saveLinks();
    },

    /**
     * Retire tous les liens d'une carte (cascade).
     * Utilisé quand une carte est supprimée.
     *
     * @param {string} cardId
     * @private
     */
    _cleanupCardLinks(cardId) {
        const linkedIds = this._getLinks(cardId);
        if (linkedIds.length === 0) return;

        // Retire la référence à cardId dans chaque carte liée
        for (const linkedId of linkedIds) {
            if (this._linksMap[linkedId]) {
                this._linksMap[linkedId] = this._linksMap[linkedId].filter((id) => id !== cardId);
                if (this._linksMap[linkedId].length === 0) {
                    delete this._linksMap[linkedId];
                }
            }
        }

        // Supprime l'entrée de la carte elle-même
        delete this._linksMap[cardId];
        this._saveLinks();
        this._refreshBadges();
    },

    // ---------------------------------------------------------------
    // MutationObserver + injection DOM
    // ---------------------------------------------------------------

    /**
     * Configure le MutationObserver sur le board pour détecter
     * les nouvelles cartes ajoutées au DOM.
     *
     * @param {HTMLElement} boardEl
     * @private
     */
    _setupBoardObserver(boardEl) {
        if (this._boardObserver) {
            this._boardObserver.disconnect();
        }

        this._boardObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;

                    if (node.classList.contains('card') && node.dataset.id) {
                        this._processCard(node);
                    }

                    const nested = node.querySelectorAll('.card[data-id]');
                    nested.forEach((el) => this._processCard(el));
                }
            }
        });

        this._boardObserver.observe(boardEl, { childList: true, subtree: true });
    },

    /**
     * Traite toutes les cartes actuellement dans le DOM.
     *
     * @private
     */
    _processAllCards() {
        document.querySelectorAll('.card[data-id]').forEach((el) => {
            this._processCard(el);
        });
    },

    /**
     * Traite une carte : met à jour le badge et installe les handlers de survol.
     *
     * @param {HTMLElement} cardElement
     * @private
     */
    _processCard(cardElement) {
        const cardId = cardElement.dataset.id;
        const links = this._getLinks(cardId);
        this._updateBadge(cardElement, links.length);
        this._setupHoverHandlers(cardElement, cardId);
    },

    /**
     * Met à jour (ou crée/supprime) le badge "🔗 N" sur une carte.
     *
     * @param {HTMLElement} cardElement
     * @param {number} count - Nombre de liens
     * @private
     */
    _updateBadge(cardElement, count) {
        let badge = cardElement.querySelector('.clp-badge');

        if (count === 0) {
            if (badge) badge.remove();
            return;
        }

        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'clp-badge';
            cardElement.appendChild(badge);
        }

        badge.textContent = `🔗 ${count}`;
    },

    /**
     * Installe les handlers mouseenter/mouseleave pour le highlight.
     * Utilise un flag DOM (_clpHover) pour éviter les doublons.
     *
     * @param {HTMLElement} cardElement
     * @param {string} cardId
     * @private
     */
    _setupHoverHandlers(cardElement, cardId) {
        if (cardElement._clpHover) return;
        cardElement._clpHover = true;

        cardElement.addEventListener('mouseenter', () => this._highlightLinkedCards(cardId, true));
        cardElement.addEventListener('mouseleave', () => this._highlightLinkedCards(cardId, false));
    },

    /**
     * Rafraîchit les badges de toutes les cartes visibles.
     *
     * @private
     */
    _refreshBadges() {
        document.querySelectorAll('.card[data-id]').forEach((el) => {
            const cardId = el.dataset.id;
            const links = this._getLinks(cardId);
            this._updateBadge(el, links.length);
        });
    },

    // ---------------------------------------------------------------
    // Hover / Highlight
    // ---------------------------------------------------------------

    /**
     * Ajoute ou retire le highlight (box-shadow) sur les cartes liées.
     * Lit this._linksMap au moment du hover (pas au moment de l'enregistrement),
     * donc reflète toujours l'état courant des liens.
     *
     * @param {string} cardId
     * @param {boolean} highlight - true = ajouter, false = retirer
     * @private
     */
    _highlightLinkedCards(cardId, highlight) {
        const linkedIds = this._getLinks(cardId);
        if (linkedIds.length === 0) return;

        for (const linkedId of linkedIds) {
            const el = document.querySelector(`.card[data-id="${linkedId}"]`);
            if (el) {
                el.classList.toggle('clp-highlight', highlight);
            }
        }
    },

    // ---------------------------------------------------------------
    // Modal "Liens"
    // ---------------------------------------------------------------

    /**
     * Construit le panneau "Liens" dans la modale d'édition.
     * Contient la liste des liens existants et un champ de recherche
     * pour ajouter de nouveaux liens.
     *
     * @param {HTMLElement} panel
     * @param {string} cardId
     * @private
     */
    _buildLinksPanel(panel, cardId) {
        panel.innerHTML = '';

        // --- Section liens existants ---
        const linksTitle = document.createElement('h4');
        linksTitle.className = 'clp-section-title';
        linksTitle.textContent = 'Liens existants';
        panel.appendChild(linksTitle);

        const linksList = document.createElement('div');
        linksList.className = 'clp-links-list';
        panel.appendChild(linksList);

        this._renderLinksList(linksList, cardId);

        // --- Section ajout ---
        const addTitle = document.createElement('h4');
        addTitle.className = 'clp-section-title';
        addTitle.textContent = 'Ajouter un lien';
        panel.appendChild(addTitle);

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'input clp-search-input';
        searchInput.placeholder = 'Rechercher une carte par titre...';
        panel.appendChild(searchInput);

        const searchResults = document.createElement('div');
        searchResults.className = 'clp-search-results';
        panel.appendChild(searchResults);

        // Recherche en temps réel
        searchInput.addEventListener('input', () => {
            this._renderSearchResults(searchResults, cardId, searchInput.value.trim(), linksList);
        });

        // Affiche tous les résultats au focus si le champ est vide
        searchInput.addEventListener('focus', () => {
            if (!searchInput.value.trim()) {
                this._renderSearchResults(searchResults, cardId, '', linksList);
            }
        });
    },

    /**
     * Rend la liste des liens existants pour une carte.
     *
     * @param {HTMLElement} container
     * @param {string} cardId
     * @private
     */
    _renderLinksList(container, cardId) {
        container.innerHTML = '';
        const linkedIds = this._getLinks(cardId);

        // Purge les liens orphelins en batch (carte supprimée mais lien resté dans les données)
        const orphanIds = linkedIds.filter((id) => !this._findCardById(id));
        if (orphanIds.length > 0) {
            for (const orphanId of orphanIds) {
                // Mutation locale sans sauvegarder à chaque itération
                if (this._linksMap[cardId]) {
                    this._linksMap[cardId] = this._linksMap[cardId].filter((id) => id !== orphanId);
                    if (this._linksMap[cardId].length === 0) delete this._linksMap[cardId];
                }
                if (this._linksMap[orphanId]) {
                    this._linksMap[orphanId] = this._linksMap[orphanId].filter((id) => id !== cardId);
                    if (this._linksMap[orphanId].length === 0) delete this._linksMap[orphanId];
                }
            }
            // Un seul save + re-render pour tout le batch
            this._saveLinks();
            this._refreshBadges();
        }

        const validIds = this._getLinks(cardId);

        if (validIds.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'clp-empty-message';
            empty.textContent = 'Aucun lien pour le moment.';
            container.appendChild(empty);
            return;
        }

        for (const linkedId of validIds) {
            const linkedCard = this._findCardById(linkedId);

            const item = document.createElement('div');
            item.className = 'clp-link-item';

            const title = document.createElement('span');
            title.textContent = linkedCard.title || '(sans titre)';

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'clp-remove-btn';
            removeBtn.textContent = 'Retirer';
            removeBtn.addEventListener('click', () => {
                this._removeLink(cardId, linkedId);
                this._renderLinksList(container, cardId);
                this._refreshBadges();

                // Met à jour les résultats de recherche si visible
                const searchResults = container.parentElement?.querySelector('.clp-search-results');
                const searchInput = container.parentElement?.querySelector('.clp-search-input');
                if (searchResults && searchInput) {
                    this._renderSearchResults(searchResults, cardId, searchInput.value.trim(), container);
                }
            });

            item.appendChild(title);
            item.appendChild(removeBtn);
            container.appendChild(item);
        }
    },

    /**
     * Rend les résultats de recherche pour ajouter un lien.
     * Filtre les cartes du board par titre, en excluant la carte courante
     * et les cartes déjà liées.
     *
     * @param {HTMLElement} container
     * @param {string} cardId
     * @param {string} query
     * @param {HTMLElement} linksList - Container de la liste des liens (pour refresh)
     * @private
     */
    _renderSearchResults(container, cardId, query, linksList) {
        container.innerHTML = '';

        if (!this._board) return;

        const currentLinks = this._getLinks(cardId);
        const excludeIds = new Set([cardId, ...currentLinks]);
        const lowerQuery = query.toLowerCase();

        // Collecte toutes les cartes candidates
        const candidates = [];
        for (const column of this._board.columns) {
            for (const card of column.cards) {
                if (excludeIds.has(card.id)) continue;
                if (card.type !== 'standard') continue;
                if (query && !card.title.toLowerCase().includes(lowerQuery)) continue;
                candidates.push(card);
            }
        }

        if (candidates.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'clp-empty-message';
            empty.textContent = query ? 'Aucune carte trouvée.' : 'Aucune carte disponible.';
            container.appendChild(empty);
            return;
        }

        for (const card of candidates) {
            const item = document.createElement('div');
            item.className = 'clp-search-item';
            item.textContent = card.title || '(sans titre)';

            item.addEventListener('click', () => {
                this._addLink(cardId, card.id);
                this._renderLinksList(linksList, cardId);
                this._refreshBadges();
                // Refresh les résultats (la carte ajoutée disparaît)
                this._renderSearchResults(container, cardId, query, linksList);
            });

            container.appendChild(item);
        }
    },

    /**
     * Cherche une carte par son ID dans toutes les colonnes du board.
     *
     * @param {string} cardId
     * @returns {import('../../../models/Card.js').default|null}
     * @private
     */
    _findCardById(cardId) {
        if (!this._board) return null;
        const result = this._board.getCardById(cardId);
        return result ? result.card : null;
    },
};
