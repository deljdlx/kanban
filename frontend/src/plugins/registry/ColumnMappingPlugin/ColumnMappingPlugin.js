/**
 * ColumnMappingPlugin — Affiche des cartes miroir depuis d'autres boards.
 *
 * Permet de mapper des colonnes d'autres boards dans le board courant.
 * Les cartes importées sont affichées en lecture seule (miroir) sous les cartes
 * locales de chaque colonne, créant un "dashboard" qui agrège plusieurs boards.
 *
 * Cycle de vie :
 *   1. install()       → enregistre les hooks
 *   2. board:displayed → reset du flag prefetch (nouveau board)
 *   3. board:rendered  → charge les boards sources (async), puis re-render
 *   4. column:renderBody → injecte les cartes miroir dans chaque colonne
 *
 * Données persistées dans board.pluginData['column-mapping'] :
 *   { mappings: [{ localColumnId, sourceBoardId, sourceColumnId }] }
 */
import StorageService from '../../../services/StorageService.js';
import BoardService from '../../../services/BoardService.js';
import { buildSettingsPanel } from './settingsPanel.js';
import { parseColor, toRgba } from '../../lib/colorUtils.js';
import pluginManager from '../../PluginManager.js';
import Card from '../../../models/Card.js';
import CardView from '../../../views/CardView.js';
import ModalCardDetail from '../../../views/ModalCardDetail.js';

// ---------------------------------------------------------------
// Clé de stockage dans pluginData
// ---------------------------------------------------------------
const PLUGIN_KEY = 'column-mapping';

/**
 * Correspondance type de carte widget → plugin requis pour son rendu.
 *
 * @type {Object<string, { name: string, label: string }>}
 */
const WIDGET_PLUGIN_MAP = {
    'widget:checklist': { name: 'checklist', label: 'Checklist' },
    'widget:pomodoro': { name: 'pomodoro', label: 'Pomodoro' },
    'widget:counter': { name: 'click-counter', label: 'Compteur de clics' },
    'widget:youtube': { name: 'youtube', label: 'YouTube' },
    'widget:board-stats': { name: 'board-stats', label: 'Statistiques' },
    'widget:image': { name: 'image-drop', label: 'Images' },
};

export default class ColumnMappingPlugin {
    /**
     * Cache mémoire des boards sources chargés depuis IndexedDB.
     *
     * @type {Map<string, Object>}
     */
    _foreignBoards = new Map();

    /**
     * Flag anti-boucle : empêche board:rendered de relancer un re-render infini.
     * Mis à true après le premier prefetch, reset quand un nouveau board est affiché.
     *
     * @type {boolean}
     */
    _prefetchTriggered = false;

    /**
     * Références aux handlers pour cleanup dans uninstall().
     *
     * @type {Object}
     */
    _handlers = {};

    // ---------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------

    /**
     * Installe le plugin : enregistre les hooks.
     *
     * @param {import('../../HookRegistry.js').HookRegistry} hooks
     */
    install(hooks) {
        this._injectStyles?.();

        this._handlers.onColumnRenderBody = (ctx) => this._onColumnRenderBody(ctx);
        this._handlers.onBoardRendered = () => this._onBoardRendered();
        this._handlers.onBoardDisplayed = () => this._onBoardDisplayed();
        this._handlers.onSettingsOpened = (ctx) => this._onSettingsOpened(ctx);

        hooks.addAction('column:renderBody', this._handlers.onColumnRenderBody);
        hooks.addAction('board:rendered', this._handlers.onBoardRendered);
        hooks.addAction('board:displayed', this._handlers.onBoardDisplayed);
        hooks.addAction('modal:boardSettings:opened', this._handlers.onSettingsOpened);
    }

    /**
     * Désinstalle le plugin : retire les hooks et nettoie le DOM.
     *
     * @param {import('../../HookRegistry.js').HookRegistry} hooks
     */
    uninstall(hooks) {
        hooks.removeAction('column:renderBody', this._handlers.onColumnRenderBody);
        hooks.removeAction('board:rendered', this._handlers.onBoardRendered);
        hooks.removeAction('board:displayed', this._handlers.onBoardDisplayed);
        hooks.removeAction('modal:boardSettings:opened', this._handlers.onSettingsOpened);

        this._foreignBoards.clear();
        this._prefetchTriggered = false;

        // Détruit les CardViews miroir et retire les sections du DOM
        document.querySelectorAll('.mirror-cards-section').forEach((section) => {
            section._mirrorCardViews?.forEach((cv) => cv.destroy());
            section.remove();
        });

        this._removeStyles?.();
    }

    // ---------------------------------------------------------------
    // Hook handlers
    // ---------------------------------------------------------------

    /**
     * Appelé quand un nouveau board est affiché (premier render).
     * Reset le flag prefetch pour que board:rendered recharge les données.
     *
     * @private
     */
    _onBoardDisplayed() {
        this._prefetchTriggered = false;
        this._foreignBoards.clear();
    }

    /**
     * Appelé à chaque render du board.
     * Charge les boards sources manquants en async puis déclenche un re-render.
     *
     * Détecte les boards sources non encore cachés (ajoutés depuis le settings
     * panel ou l'API) même après le prefetch initial.
     *
     * @private
     */
    _onBoardRendered() {
        const board = BoardService.getBoard();
        if (!board) return;

        const mappings = this._getMappings(board);
        if (mappings.length === 0) return;

        // Vérifie si des boards sources ne sont pas encore chargés
        const hasUnloaded = mappings.some((m) => !this._foreignBoards.has(m.sourceBoardId));

        // Skip si le prefetch a déjà eu lieu et que tout est en cache
        if (this._prefetchTriggered && !hasUnloaded) return;
        this._prefetchTriggered = true;

        // Charge les boards sources manquants, puis re-render
        this._loadForeignBoards(mappings).then(() => {
            board.emit('change');
        });
    }

    /**
     * Injecte les cartes miroir dans le body d'une colonne.
     * Appelé après le rendu des cartes locales par CardListRenderer.
     *
     * @param {{ body: HTMLElement, column: Object, board: Object }} ctx
     * @private
     */
    _onColumnRenderBody({ body, column, board }) {
        // Détruit les anciennes CardViews miroir et supprime la section
        const existing = body.querySelector('.mirror-cards-section');
        if (existing) {
            existing._mirrorCardViews?.forEach((cv) => cv.destroy());
            existing.remove();
        }

        const mappings = this._getMappings(board);
        if (mappings.length === 0) return;

        // Filtre les mappings pour cette colonne
        const columnMappings = mappings.filter((m) => m.localColumnId === column.id);
        if (columnMappings.length === 0) return;

        // Si les boards sources ne sont pas encore chargés, on attend le prefetch
        if (this._foreignBoards.size === 0) return;

        const section = document.createElement('div');
        section.className = 'mirror-cards-section';
        section._mirrorCardViews = [];

        for (const mapping of columnMappings) {
            const foreignBoard = this._foreignBoards.get(mapping.sourceBoardId);
            if (!foreignBoard) continue;

            // Trouve la colonne source dans les données brutes du board
            const sourceColumn = (foreignBoard.columns || []).find((col) => col.id === mapping.sourceColumnId);
            if (!sourceColumn) continue;

            const boardName = foreignBoard.name || 'Board inconnu';
            const cards = sourceColumn.cards || [];

            for (const cardData of cards) {
                const { el, cardView } = this._renderMirrorCard(cardData, boardName, foreignBoard);
                section.appendChild(el);
                section._mirrorCardViews.push(cardView);
            }
        }

        // N'ajoute la section que si elle contient des cartes
        if (section.children.length > 0) {
            body.appendChild(section);
        }
    }

    /**
     * Enregistre l'onglet "Column Mapping" dans les Board Settings.
     *
     * @param {{ registerTab: Function, board: Object, onClose: Function }} ctx
     * @private
     */
    _onSettingsOpened({ registerTab, board }) {
        registerTab('column-mapping', 'Column Mapping', (panel) => {
            buildSettingsPanel(panel, board);
        });
    }

    // ---------------------------------------------------------------
    // Données
    // ---------------------------------------------------------------

    /**
     * Retourne les mappings du board courant.
     *
     * @param {Object} board
     * @returns {Array<{ localColumnId: string, sourceBoardId: string, sourceColumnId: string }>}
     * @private
     */
    _getMappings(board) {
        const data = board.pluginData[PLUGIN_KEY];
        return data?.mappings || [];
    }

    /**
     * Charge les boards sources depuis IndexedDB.
     * Ne recharge pas les boards déjà en cache.
     *
     * @param {Array} mappings
     * @returns {Promise<void>}
     * @private
     */
    async _loadForeignBoards(mappings) {
        const boardIds = [...new Set(mappings.map((m) => m.sourceBoardId))];

        const promises = boardIds
            .filter((id) => !this._foreignBoards.has(id))
            .map(async (id) => {
                const data = await StorageService.loadBoard(id);
                if (data) {
                    this._foreignBoards.set(id, data);
                }
            });

        await Promise.all(promises);
    }

    // ---------------------------------------------------------------
    // Rendu miroir
    // ---------------------------------------------------------------

    /**
     * Crée un élément DOM pour une carte miroir via le pipeline standard CardView.
     *
     * Utilise CardView.render() pour passer par tous les hooks du rendu normal :
     *   - card:renderBody → widgets (checklist, pomodoro, etc.)
     *   - card:beforeRender → filtres de transformation des données
     *   - render:description → MarkdownPlugin (rendu HTML si activé)
     *
     * Après le rendu standard, applique les données spécifiques au board source
     * (couleurs CardColor, custom fields) qui ne sont pas accessibles aux plugins
     * locaux, puis ajoute les éléments miroir (hint plugins manquants, badge source).
     *
     * @param {Object} cardData - Données brutes de la carte (depuis IndexedDB)
     * @param {string} sourceBoardName - Nom du board source
     * @param {Object} foreignBoard - Board source complet (pour pluginData)
     * @returns {{ el: HTMLElement, cardView: CardView }}
     * @private
     */
    _renderMirrorCard(cardData, sourceBoardName, foreignBoard) {
        const card = new Card(cardData);

        // Pipeline standard : les hooks transforment le contenu (markdown, widgets…)
        const cardView = new CardView(card, {
            onCardClick: () => {
                const modal = new ModalCardDetail(card, {
                    mirrorSource: sourceBoardName,
                });
                modal.open();
            },
        });
        const el = cardView.render();

        // Marque comme miroir (lecture seule, style atténué)
        el.classList.add('card--mirror');
        el.dataset.mirrorId = cardData.id || '';

        // Supprime le bouton éditer (miroir = lecture seule)
        el.querySelector('.card-edit-btn')?.remove();

        // — Badge board source (en haut de la carte, premier enfant)
        const badge = document.createElement('div');
        badge.className = 'mirror-badge';
        badge.textContent = sourceBoardName;
        el.insertBefore(badge, el.firstChild);

        // — Couleur CardColor (depuis le board source, pas le board local)
        const colors = foreignBoard.pluginData?.['card-colors'];
        const color = colors?.[cardData.id];
        if (color) {
            const { r, g, b, a } = parseColor(color);
            el.style.borderLeft = `4px solid ${toRgba(r, g, b, 1)}`;
            el.style.background = toRgba(r, g, b, a);
        }

        // — Custom fields (depuis le board source)
        const cfData = foreignBoard.pluginData?.['custom-fields'];
        if (cfData?.fields && cfData?.values?.[cardData.id]) {
            const cardValues = cfData.values[cardData.id];
            const visibleFields = cfData.fields.filter((f) => f.showOnCard && cardValues[f.id]);
            if (visibleFields.length > 0) {
                const badgesContainer = document.createElement('div');
                badgesContainer.className = 'mirror-cf-badges';
                for (const field of visibleFields) {
                    const cfBadge = document.createElement('span');
                    cfBadge.className = 'mirror-cf-badge';
                    cfBadge.textContent = `${field.label}: ${cardValues[field.id]}`;
                    badgesContainer.appendChild(cfBadge);
                }
                el.appendChild(badgesContainer);
            }
        }

        // — Hint par carte : plugins manquants qui amélioreraient le rendu
        const missing = this._detectMissingPluginsForCard(cardData);
        if (missing.length > 0) {
            const hint = document.createElement('div');
            hint.className = 'mirror-plugin-hint';
            hint.textContent = `Activer : ${missing.map((p) => p.label).join(', ')}`;
            el.appendChild(hint);
        }

        return { el, cardView };
    }

    /**
     * Détecte les plugins locaux manquants qui amélioreraient le rendu
     * de cette carte miroir spécifique.
     *
     * Ne signale que les plugins qui changent visiblement le rendu :
     *   - Markdown : la description s'affiche en texte brut au lieu de HTML
     *   - Widgets : la carte s'affiche en mode standard au lieu du widget dédié
     *
     * Les données manuellement appliquées (CardColor, custom fields)
     * ne sont pas signalées car elles sont toujours rendues.
     *
     * @param {Object} cardData - Données brutes de la carte
     * @returns {Array<{ name: string, label: string }>}
     * @private
     */
    _detectMissingPluginsForCard(cardData) {
        const missing = [];

        // Markdown : description contient de la syntaxe markdown
        if (cardData.description && !pluginManager.isEnabled('markdown')) {
            if (/[*#`~[>]/.test(cardData.description)) {
                missing.push({ name: 'markdown', label: 'Markdown' });
            }
        }

        // Widget : le type de carte nécessite un plugin spécifique
        const widgetPlugin = WIDGET_PLUGIN_MAP[cardData.type];
        if (widgetPlugin && !pluginManager.isEnabled(widgetPlugin.name)) {
            missing.push(widgetPlugin);
        }

        return missing;
    }

    // ---------------------------------------------------------------
    // API publique (pour DevToolsPlugin)
    // ---------------------------------------------------------------

    /**
     * Retourne la liste des mappings du board courant.
     *
     * @returns {Array<{ localColumnId: string, sourceBoardId: string, sourceColumnId: string }>}
     */
    listMappings() {
        const board = BoardService.getBoard();
        if (!board) return [];
        return this._getMappings(board);
    }

    /**
     * Ajoute un mapping.
     * Charge le board source si nécessaire avant de déclencher le re-render.
     *
     * @param {string} localColId - ID de la colonne locale
     * @param {string} sourceBoardId - ID du board source
     * @param {string} sourceColId - ID de la colonne source
     * @returns {Promise<void>}
     */
    async addMapping(localColId, sourceBoardId, sourceColId) {
        const board = BoardService.getBoard();
        if (!board) return;

        const data = board.pluginData[PLUGIN_KEY] || { mappings: [] };
        data.mappings.push({
            localColumnId: localColId,
            sourceBoardId: sourceBoardId,
            sourceColumnId: sourceColId,
        });
        board.setPluginData(PLUGIN_KEY, data);

        // Charge le board source s'il n'est pas en cache
        if (!this._foreignBoards.has(sourceBoardId)) {
            const foreignData = await StorageService.loadBoard(sourceBoardId);
            if (foreignData) {
                this._foreignBoards.set(sourceBoardId, foreignData);
            }
        }
    }

    /**
     * Supprime un mapping par index.
     *
     * @param {number} index
     */
    removeMapping(index) {
        const board = BoardService.getBoard();
        if (!board) return;

        const data = board.pluginData[PLUGIN_KEY];
        if (!data?.mappings || index < 0 || index >= data.mappings.length) return;

        data.mappings.splice(index, 1);
        board.setPluginData(PLUGIN_KEY, data);
    }

    /**
     * Supprime tous les mappings.
     */
    clearMappings() {
        const board = BoardService.getBoard();
        if (!board) return;

        board.setPluginData(PLUGIN_KEY, { mappings: [] });
        board.emit('change');
    }

    /**
     * Recharge les boards sources depuis IndexedDB.
     *
     * @returns {Promise<void>}
     */
    async refresh() {
        this._foreignBoards.clear();
        this._prefetchTriggered = false;

        const board = BoardService.getBoard();
        if (!board) return;

        const mappings = this._getMappings(board);
        if (mappings.length === 0) return;

        await this._loadForeignBoards(mappings);
        board.emit('change');
    }
}
