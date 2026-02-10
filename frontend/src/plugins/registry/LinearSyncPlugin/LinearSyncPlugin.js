/**
 * LinearSyncPlugin — Synchronise les issues Linear dans le board Kanban.
 *
 * Fonctionnement :
 *   1. L'utilisateur configure le token API, l'equipe et le mapping
 *      des workflow states Linear vers les colonnes Kanban.
 *   2. Le plugin fetch les issues correspondantes via l'API GraphQL.
 *   3. Les issues sont converties en cartes et placees dans les
 *      colonnes mappees. Les cartes existantes sont mises a jour.
 *   4. Un polling periodique (configurable) maintient la sync.
 *
 * Hooks utilises :
 *   - board:rendered       : capture le board + demarre le polling
 *   - board:willChange     : arrete le polling avant changement de board
 *   - header:renderActions : injecte le bouton sync dans le header
 *   - modal:boardSettings:opened : enregistre l'onglet de configuration
 *
 * Persistence :
 *   - Global  : token API dans IndexedDB via StorageService
 *   - Board   : board.pluginData['linear-sync'] (team, mapping, issueMap)
 *
 * API publique (utilisee par settingsPanel.js) :
 *   - getToken(), saveToken(), getApiClient()
 *   - getBoardConfig(), saveBoardConfig()
 *   - restartPolling(), sync()
 */
import Container from '../../../Container.js';
import StorageService from '../../../services/StorageService.js';
import { generateId } from '../../../utils/id.js';
import LinearApiClient from './LinearApiClient.js';
import { buildBoardSettingsTab } from './settingsPanel.js';

const PLUGIN_DATA_KEY = 'linear-sync';
const STORAGE_TOKEN_KEY = 'kanban:linearSync:token';

const EMPTY_STATS = Object.freeze({ created: 0, updated: 0, moved: 0 });

/**
 * Mapping priorite Linear → taxonomie priority Kanban.
 *
 *   Linear : 0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low
 *   Kanban : high, medium, low (taxonomie PriorityTaxonomyPlugin)
 */
const PRIORITY_MAP = {
    1: 'high', // Urgent
    2: 'high', // High
    3: 'medium', // Normal
    4: 'low', // Low
};

export default class LinearSyncPlugin {
    /** @type {import('../../../models/Board.js').default|null} */
    _board = null;

    /** @type {import('../../HookRegistry.js').default|null} */
    _hooksRegistry = null;

    /** @type {LinearApiClient} */
    _apiClient = new LinearApiClient();

    /** @type {string|null} */
    _token = null;

    /** @type {number|null} */
    _pollTimer = null;

    /** @type {boolean} */
    _syncing = false;

    /** @type {HTMLElement|null} */
    _syncBtnEl = null;

    /** @type {Object} */
    _handlers = {
        onBoardRendered: null,
        onBoardWillChange: null,
        onHeaderRender: null,
        onSettingsOpened: null,
    };

    // -----------------------------------------------------------------
    //  Lifecycle
    // -----------------------------------------------------------------

    /**
     * Installe le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        this._hooksRegistry = hooks;

        if (typeof this._injectStyles === 'function') {
            this._injectStyles();
        }

        this._initAsync();

        // Capture le board a chaque render et demarre le polling
        this._handlers.onBoardRendered = ({ board }) => {
            const boardChanged = this._board !== board;
            this._board = board;

            if (boardChanged) {
                this.restartPolling();
            }
        };
        hooks.addAction('board:rendered', this._handlers.onBoardRendered);

        // Arrete le polling avant un changement de board
        this._handlers.onBoardWillChange = () => {
            this._stopPolling();
            this._board = null;
        };
        hooks.addAction('board:willChange', this._handlers.onBoardWillChange);

        // Bouton sync dans le header
        this._handlers.onHeaderRender = ({ container }) => {
            this._renderSyncButton(container);
        };
        hooks.addAction('header:renderActions', this._handlers.onHeaderRender);

        // Onglet "Linear" dans les settings du board
        this._handlers.onSettingsOpened = ({ registerTab, board }) => {
            buildBoardSettingsTab(this, registerTab, board);
        };
        hooks.addAction('modal:boardSettings:opened', this._handlers.onSettingsOpened);
    }

    /**
     * Desinstalle le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        this._stopPolling();

        if (this._handlers.onBoardRendered) {
            hooks.removeAction('board:rendered', this._handlers.onBoardRendered);
        }
        if (this._handlers.onBoardWillChange) {
            hooks.removeAction('board:willChange', this._handlers.onBoardWillChange);
        }
        if (this._handlers.onHeaderRender) {
            hooks.removeAction('header:renderActions', this._handlers.onHeaderRender);
        }
        if (this._handlers.onSettingsOpened) {
            hooks.removeAction('modal:boardSettings:opened', this._handlers.onSettingsOpened);
        }

        if (this._syncBtnEl && this._syncBtnEl.parentNode) {
            this._syncBtnEl.remove();
        }

        if (typeof this._removeStyles === 'function') {
            this._removeStyles();
        }

        this._syncBtnEl = null;
        this._board = null;
        this._hooksRegistry = null;
    }

    // -----------------------------------------------------------------
    //  Init async (fire-and-forget depuis install)
    // -----------------------------------------------------------------

    /**
     * Charge le token API depuis IndexedDB.
     * @private
     */
    async _initAsync() {
        this._token = await StorageService.get(STORAGE_TOKEN_KEY, null);
        if (this._token) {
            this._apiClient.setToken(this._token);
        }
    }

    // -----------------------------------------------------------------
    //  Sync
    // -----------------------------------------------------------------

    /**
     * Lance une synchronisation des issues Linear vers le board.
     *
     * Algorithme :
     *   1. Lire la config du board (teamId, stateMapping)
     *   2. Fetch les issues Linear filtrees par team + states mappes
     *   3. Pour chaque issue : creer, mettre a jour ou deplacer la carte
     *   4. Persister les changements
     *
     * @returns {Promise<{ created: number, updated: number, moved: number }>}
     */
    async sync() {
        if (this._syncing || !this._board) return { ...EMPTY_STATS };

        const config = this.getBoardConfig();
        const mappedStateIds = Object.keys(config.stateMapping || {});
        if (!config.teamId || mappedStateIds.length === 0) {
            return { ...EMPTY_STATS };
        }

        this._syncing = true;
        this._updateSyncButtonState();

        const stats = { ...EMPTY_STATS };
        const boardService = Container.get('BoardService');

        try {
            const issues = await this._apiClient.fetchIssues(config.teamId, mappedStateIds);

            boardService.pauseAutoSave();

            const issueMap = config.issueMap || {};

            for (const issue of issues) {
                const targetColumnId = config.stateMapping[issue.state.id];
                if (!targetColumnId || !this._board.getColumnById(targetColumnId)) continue;

                const existing = issueMap[issue.id];

                if (!existing || !this._board.getCardById(existing.cardId)) {
                    // --- Nouvelle carte (ou carte supprimee manuellement) ---
                    this._createCardForIssue(boardService, issueMap, issue, targetColumnId);
                    stats.created++;
                    continue;
                }

                // --- Carte existante ---
                const { card, column: currentColumn } = this._board.getCardById(existing.cardId);

                // Deplacement si la colonne a change
                if (currentColumn.id !== targetColumnId) {
                    boardService.moveCard(card.id, currentColumn.id, targetColumnId, 0);
                    issueMap[issue.id].columnId = targetColumnId;
                    stats.moved++;
                }

                // Mise a jour si updatedAt a change
                if (existing.updatedAt !== issue.updatedAt) {
                    card.update({
                        title: `[${issue.identifier}] ${issue.title}`,
                        description: issue.description || '',
                        summary: card.summary,
                        tags: this._issueTags(issue),
                        assignee: card.assignee,
                    });
                    issueMap[issue.id].updatedAt = issue.updatedAt;
                    stats.updated++;
                }
            }

            // Persiste la config avec le issueMap mis a jour
            config.issueMap = issueMap;
            config.lastSyncAt = new Date().toISOString();
            this._setBoardConfig(config);

            if (this._hooksRegistry) {
                this._hooksRegistry.doAction('linearSync:synced', stats);
            }
        } catch (err) {
            if (this._hooksRegistry) {
                this._hooksRegistry.doAction('linearSync:error', { error: err.message });
            }
        } finally {
            boardService.resumeAutoSave();
            await boardService.save();
            this._syncing = false;
            this._updateSyncButtonState();
        }

        return stats;
    }

    /**
     * Cree une carte a partir d'une issue Linear et enregistre le lien
     * dans issueMap.
     *
     * @param {import('../../../services/BoardService.js').default} boardService
     * @param {Object} issueMap - Map issue.id → { cardId, columnId, updatedAt }
     * @param {Object} issue - Issue Linear
     * @param {string} targetColumnId
     * @private
     */
    _createCardForIssue(boardService, issueMap, issue, targetColumnId) {
        const cardData = this._issueToCardData(issue);
        const card = boardService.addCard(targetColumnId, cardData, 0);
        if (card) {
            issueMap[issue.id] = {
                cardId: card.id,
                columnId: targetColumnId,
                updatedAt: issue.updatedAt,
            };
        }
    }

    // -----------------------------------------------------------------
    //  Polling
    // -----------------------------------------------------------------

    /**
     * Demarre le polling si la config du board l'active.
     * @private
     */
    _startPolling() {
        this._stopPolling();

        const config = this.getBoardConfig();
        if (!config.autoSync || !config.teamId || !config.stateMapping) return;

        const interval = config.syncInterval || 60000;
        this._pollTimer = setInterval(() => this.sync(), interval);
    }

    /**
     * Arrete le polling.
     * @private
     */
    _stopPolling() {
        if (this._pollTimer) {
            clearInterval(this._pollTimer);
            this._pollTimer = null;
        }
    }

    /**
     * Redemarre le polling (appele apres changement de board ou de config).
     * Utilise par settingsPanel.js quand l'intervalle ou l'auto-sync change.
     */
    restartPolling() {
        this._stopPolling();
        this._startPolling();
    }

    // -----------------------------------------------------------------
    //  Board config (pluginData)
    // -----------------------------------------------------------------

    /**
     * Lit la config Linear du board courant.
     * Utilise par settingsPanel.js pour lire la configuration.
     *
     * @returns {Object} Config ou objet vide
     */
    getBoardConfig() {
        if (!this._board) return {};
        return this._board.pluginData[PLUGIN_DATA_KEY] || {};
    }

    /**
     * Ecrit la config Linear et persiste le board.
     * Utilise par settingsPanel.js pour sauvegarder les changements.
     *
     * @param {Object} config
     */
    async saveBoardConfig(config) {
        this._setBoardConfig(config);
        await Container.get('BoardService').save();
    }

    /**
     * Ecrit la config dans pluginData (sans save explicite).
     * Utilise en interne par sync() qui gere son propre save.
     *
     * @param {Object} config
     * @private
     */
    _setBoardConfig(config) {
        if (!this._board) return;
        this._board.setPluginData(PLUGIN_DATA_KEY, config);
    }

    // -----------------------------------------------------------------
    //  Global settings (token)
    // -----------------------------------------------------------------

    /**
     * Retourne le token API stocke.
     *
     * @returns {string|null}
     */
    getToken() {
        return this._token;
    }

    /**
     * Sauvegarde le token API dans IndexedDB et configure le client.
     *
     * @param {string|null} token
     */
    async saveToken(token) {
        this._token = token;
        this._apiClient.setToken(token);
        await StorageService.set(STORAGE_TOKEN_KEY, token);
    }

    /**
     * Retourne le client API (utilise par settingsPanel pour fetch teams/states).
     *
     * @returns {LinearApiClient}
     */
    getApiClient() {
        return this._apiClient;
    }

    // -----------------------------------------------------------------
    //  Conversion issue → card
    // -----------------------------------------------------------------

    /**
     * Convertit une issue Linear en donnees pour Card constructor.
     *
     * @param {Object} issue - Issue Linear
     * @returns {Object} Donnees compatibles avec Card constructor
     * @private
     */
    _issueToCardData(issue) {
        return {
            id: generateId('card'),
            title: `[${issue.identifier}] ${issue.title}`,
            description: issue.description || '',
            summary: '',
            tags: this._issueTags(issue),
            createdAt: new Date().toISOString(),
            data: {
                linearMeta: {
                    issueId: issue.id,
                    identifier: issue.identifier,
                    url: issue.url,
                },
            },
        };
    }

    /**
     * Extrait les tags depuis une issue Linear.
     * Mappe la priorite et les labels.
     *
     * @param {Object} issue
     * @returns {Object<string, string[]>}
     * @private
     */
    _issueTags(issue) {
        const tags = {};

        // Priorite → taxonomie 'priority'
        const prio = PRIORITY_MAP[issue.priority];
        if (prio) {
            tags.priority = [prio];
        }

        // Labels Linear → taxonomie 'linear'
        if (issue.labels?.nodes?.length > 0) {
            tags.linear = issue.labels.nodes.map((l) => l.name);
        }

        return tags;
    }

    // -----------------------------------------------------------------
    //  DOM — Bouton sync dans le header
    // -----------------------------------------------------------------

    /**
     * Injecte le bouton de sync dans le header.
     *
     * @param {HTMLElement} container - div.app-header-actions
     * @private
     */
    _renderSyncButton(container) {
        // Nettoie le precedent si re-render
        if (this._syncBtnEl && this._syncBtnEl.parentNode) {
            this._syncBtnEl.remove();
        }

        const btn = document.createElement('button');
        btn.className = 'lsync-btn';
        btn.title = 'Synchroniser Linear';
        btn.innerHTML = '&#x21bb;'; // ↻ fleche rotation
        btn.addEventListener('click', () => this.sync());

        // Inserer avant .app-header-settings si present
        const settingsBtn = container.querySelector('.app-header-settings');
        if (settingsBtn) {
            container.insertBefore(btn, settingsBtn);
        } else {
            container.appendChild(btn);
        }

        this._syncBtnEl = btn;
        this._updateSyncButtonState();
    }

    /**
     * Met a jour l'etat visuel du bouton sync (animation pendant la sync).
     * @private
     */
    _updateSyncButtonState() {
        if (!this._syncBtnEl) return;
        this._syncBtnEl.classList.toggle('lsync-btn--syncing', this._syncing);
        this._syncBtnEl.disabled = this._syncing;
    }
}
