/**
 * BoardStatsPlugin — Widget statistiques du board.
 *
 * Carte affichant les statistiques en temps réel :
 *   - Nombre total de cartes
 *   - Répartition par colonne
 *   - Pourcentage de completion (dernière colonne = "done")
 *
 * Ce plugin est un "stress test" car il :
 *   - Accède au Board complet depuis une carte
 *   - Écoute tous les événements de modification
 *   - Met à jour toutes les cartes stats en temps réel
 */
import BoardService from '../../../services/BoardService.js';
import CardTypeRegistry from '../../../services/CardTypeRegistry.js';
import { generateId } from '../../../utils/id.js';

export default class BoardStatsPlugin {
    /**
     * @type {string}
     */
    static CARD_TYPE = 'widget:board-stats';

    /**
     * Map des cartes stats rendues (cardId -> { container, updateFn }).
     * Permet de mettre à jour toutes les cartes quand le board change.
     * @type {Map<string, Object>}
     */
    _renderedCards = new Map();

    /**
     * Installe le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        if (typeof this._injectStyles === 'function') {
            this._injectStyles();
        }

        // Enregistre le type de carte pour qu'il reste visible
        CardTypeRegistry.register(BoardStatsPlugin.CARD_TYPE);

        // Stocke les références pour pouvoir les retirer dans uninstall()
        this._handlers = {
            onBoardWillChange: () => this._resetBoardState(),
            onModalOpened: (ctx) => this._onModalOpened(ctx),
            onRenderBody: (ctx) => this._onRenderBody(ctx),
            onRefreshStats: () => this._refreshAllStats(),
            onTypeActivated: (ctx) => this._onTypeActivated(ctx),
            onDetailRender: (ctx) => this._onDetailRender(ctx),
        };

        hooks.addAction('board:willChange', this._handlers.onBoardWillChange);
        hooks.addAction('modal:addCard:opened', this._handlers.onModalOpened);
        hooks.addAction('card:renderBody', this._handlers.onRenderBody);
        hooks.addAction('card:created', this._handlers.onRefreshStats);
        hooks.addAction('card:deleted', this._handlers.onRefreshStats);
        hooks.addAction('card:updated', this._handlers.onRefreshStats);
        hooks.addAction('card:moved', this._handlers.onRefreshStats);
        hooks.addAction('card:typeActivated', this._handlers.onTypeActivated);
        hooks.addAction('modal:cardDetail:renderContent', this._handlers.onDetailRender);
    }

    /**
     * Prend le contrôle du rendu dans la modal de détail.
     *
     * @param {Object} ctx
     * @param {import('../../../models/Card.js').default} ctx.card
     * @param {HTMLElement} ctx.panel
     * @private
     */
    _onDetailRender(ctx) {
        const { card, panel } = ctx;

        if (card.type !== BoardStatsPlugin.CARD_TYPE) {
            return;
        }

        ctx.handled = true;
        panel.classList.add('card-detail-panel--widget');

        const container = document.createElement('div');
        container.className = 'boardstats-widget boardstats-widget--detail';
        panel.appendChild(container);

        this._renderStats(container);
    }

    /**
     * Appelé par CardTypeRegistry quand le type est (ré)activé.
     * Permet de se ré-attacher aux cartes existantes dans le DOM.
     *
     * @param {Object} ctx
     * @param {string} ctx.cardType
     * @param {string} ctx.cardId
     * @param {HTMLElement} ctx.element
     * @private
     */
    _onTypeActivated({ cardType, cardId, element }) {
        if (cardType !== BoardStatsPlugin.CARD_TYPE) {
            return;
        }

        // Skip si déjà enregistré
        if (this._renderedCards.has(cardId)) {
            return;
        }

        // Trouve ou crée le container
        let container = element.querySelector('.boardstats-widget');
        if (!container) {
            container = document.createElement('div');
            container.className = 'boardstats-widget';
            element.appendChild(container);
        }

        // Fonction de mise à jour
        const updateFn = () => this._renderStats(container);

        // Enregistre
        this._renderedCards.set(cardId, { container, updateFn });

        // Render initial
        updateFn();
    }

    /**
     * Désinstalle le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        hooks.removeAction('board:willChange', this._handlers.onBoardWillChange);
        hooks.removeAction('modal:addCard:opened', this._handlers.onModalOpened);
        hooks.removeAction('card:renderBody', this._handlers.onRenderBody);
        hooks.removeAction('card:created', this._handlers.onRefreshStats);
        hooks.removeAction('card:deleted', this._handlers.onRefreshStats);
        hooks.removeAction('card:updated', this._handlers.onRefreshStats);
        hooks.removeAction('card:moved', this._handlers.onRefreshStats);
        hooks.removeAction('card:typeActivated', this._handlers.onTypeActivated);
        hooks.removeAction('modal:cardDetail:renderContent', this._handlers.onDetailRender);
        this._handlers = null;

        this._resetBoardState();
        CardTypeRegistry.unregister(BoardStatsPlugin.CARD_TYPE);
    }

    /**
     * Remet à zéro l'état lié au board courant.
     * Appelé lors du switch de board et dans uninstall().
     *
     * @private
     */
    _resetBoardState() {
        this._renderedCards.clear();
    }

    // -------------------------------------------------------------------
    // Modal
    // -------------------------------------------------------------------

    /**
     * Enregistre le type dans la modal.
     *
     * @param {Object} ctx
     * @param {Function} ctx.registerCardType
     * @private
     */
    _onModalOpened({ registerCardType }) {
        registerCardType(BoardStatsPlugin.CARD_TYPE, 'Statistiques du Board', (panel) => this._buildPanel(panel));
    }

    /**
     * Construit le formulaire (très simple, pas de config).
     *
     * @param {HTMLElement} panel
     * @private
     */
    _buildPanel(panel) {
        panel.innerHTML = `
            <div class="boardstats-form">
                <p class="boardstats-form__intro">
                    Ajoute une carte affichant les statistiques du board en temps réel.
                </p>
                <div class="form-group">
                    <label>Titre</label>
                    <input type="text" class="input boardstats-form__title"
                           value="Stats du Board" />
                </div>
                <button type="button" class="btn btn--primary boardstats-form__submit">
                    Ajouter les stats
                </button>
            </div>
        `;

        const titleInput = panel.querySelector('.boardstats-form__title');
        const createBtn = panel.querySelector('.boardstats-form__submit');

        createBtn.addEventListener('click', () => {
            const title = titleInput.value.trim() || 'Stats du Board';

            const cardData = {
                id: generateId('card'),
                title,
                description: '',
                tags: {},
                type: BoardStatsPlugin.CARD_TYPE,
                data: {},
            };

            panel.dispatchEvent(
                new CustomEvent('widget:create', {
                    bubbles: true,
                    detail: { cardData },
                }),
            );
        });
    }

    // -------------------------------------------------------------------
    // Rendu
    // -------------------------------------------------------------------

    /**
     * Prend le contrôle du rendu pour les cartes stats.
     *
     * @param {Object} ctx
     * @param {import('../../../models/Card.js').default} ctx.card
     * @param {HTMLElement} ctx.cardElement
     * @private
     */
    _onRenderBody(ctx) {
        const { card, cardElement } = ctx;

        if (card.type !== BoardStatsPlugin.CARD_TYPE) {
            return;
        }

        ctx.handled = true;
        cardElement.classList.add('card--widget', 'card--boardstats');

        const container = document.createElement('div');
        container.className = 'boardstats-widget';
        cardElement.appendChild(container);

        // Fonction de mise à jour
        const updateFn = () => this._renderStats(container);

        // Enregistre pour les mises à jour futures
        this._renderedCards.set(card.id, { container, updateFn });

        // Render initial
        updateFn();
    }

    /**
     * Rend les statistiques dans le container.
     *
     * @param {HTMLElement} container
     * @private
     */
    _renderStats(container) {
        const stats = this._calculateStats();

        if (!stats) {
            container.innerHTML = '<p class="boardstats-widget__error">Board non disponible</p>';
            return;
        }

        const { total, totalStandard, byColumn, doneCount, donePercent } = stats;

        // Header avec total
        let html = `
            <div class="boardstats-widget__header">
                <span class="boardstats-widget__total">${totalStandard}</span>
                <span class="boardstats-widget__label">cartes</span>
            </div>
        `;

        // Barre de progression
        html += `
            <div class="boardstats-widget__progress">
                <div class="boardstats-widget__progress-bar" style="width: ${donePercent}%"></div>
                <span class="boardstats-widget__progress-label">${donePercent}% terminé</span>
            </div>
        `;

        // Répartition par colonne
        html += '<div class="boardstats-widget__columns">';
        for (const col of byColumn) {
            const barWidth = total > 0 ? Math.round((col.count / total) * 100) : 0;
            html += `
                <div class="boardstats-widget__column">
                    <span class="boardstats-widget__column-name">${col.title}</span>
                    <span class="boardstats-widget__column-count">${col.count}</span>
                    <div class="boardstats-widget__column-bar">
                        <div class="boardstats-widget__column-bar-fill" style="width: ${barWidth}%"></div>
                    </div>
                </div>
            `;
        }
        html += '</div>';

        container.innerHTML = html;
    }

    /**
     * Calcule les statistiques du board.
     *
     * @returns {Object|null}
     * @private
     */
    _calculateStats() {
        const board = BoardService.getBoard();

        if (!board) {
            return null;
        }

        const columns = board.columns || [];
        let total = 0;
        let totalStandard = 0; // Exclut les cartes widget stats elles-mêmes
        const byColumn = [];

        for (const column of columns) {
            const cards = column.cards || [];
            const standardCards = cards.filter((c) => c.type !== BoardStatsPlugin.CARD_TYPE);
            const count = standardCards.length;

            total += cards.length;
            totalStandard += count;

            byColumn.push({
                id: column.id,
                title: column.title,
                count,
            });
        }

        // Dernière colonne = "done"
        const lastColumn = byColumn[byColumn.length - 1];
        const doneCount = lastColumn ? lastColumn.count : 0;
        const donePercent = totalStandard > 0 ? Math.round((doneCount / totalStandard) * 100) : 0;

        return {
            total,
            totalStandard,
            byColumn,
            doneCount,
            donePercent,
        };
    }

    /**
     * Rafraîchit toutes les cartes stats rendues.
     *
     * @private
     */
    _refreshAllStats() {
        for (const [cardId, { container, updateFn }] of this._renderedCards.entries()) {
            // Vérifie que le container est toujours dans le DOM
            if (container.isConnected) {
                updateFn();
            } else {
                // Nettoie les entrées obsolètes
                this._renderedCards.delete(cardId);
            }
        }
    }
}
