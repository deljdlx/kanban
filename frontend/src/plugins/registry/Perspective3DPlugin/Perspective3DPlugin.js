/**
 * Perspective3DPlugin — Ajoute un effet de perspective 3D au board.
 *
 * Fonctionnalités :
 *   - Perspective CSS sur le conteneur du board
 *   - Rotation sur les axes X et Y
 *   - Zoom (éloignement/rapprochement)
 *   - Effet de survol sur les cartes (levée + ombre)
 *   - Effet de survol sur les colonnes
 *   - Animation fluide des transitions
 *
 * Les paramètres sont personnalisables via le settings panel et
 * persistés dans IndexedDB via StorageService.
 */

import StorageService from '../../../services/StorageService.js';

/** @type {string} Clé de stockage */
const STORAGE_KEY = 'kanban:perspective3d';

/** @type {Object} Valeurs par défaut */
const DEFAULTS = {
    enabled: true,
    perspective: 1200, // px
    rotateX: 8, // deg (tilt vers l'arrière)
    rotateY: 0, // deg
    zoom: 1, // Échelle (0.5 = éloigné, 1.5 = rapproché)
    cardHoverLift: true, // Effet levée sur les cartes
    columnHoverLift: true, // Effet levée sur les colonnes
    intensity: 1, // Multiplicateur d'intensité (0.5 - 1.5)
};

const Perspective3DPlugin = {
    /** @type {HTMLStyleElement|null} */
    _styleEl: null,

    /** @type {HTMLStyleElement|null} Styles dynamiques pour les valeurs custom */
    _dynamicStyleEl: null,

    /** @type {Object} Paramètres actuels */
    _settings: { ...DEFAULTS },

    /**
     * Références aux callbacks de hooks (pour removeAction à l'uninstall).
     * @type {{ onBoardRendered: Function|null }}
     */
    _handlers: {
        onBoardRendered: null,
    },

    /**
     * Installe le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     * @returns {Promise<void>}
     */
    async install(hooks) {
        await this._loadSettings();
        this._injectStyles();
        this._applyPerspective();

        // Ré-applique après chaque render du board
        this._handlers.onBoardRendered = () => {
            this._applyPerspective();
        };
        hooks.addAction('board:rendered', this._handlers.onBoardRendered);
    },

    /**
     * Désinstalle le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        if (this._handlers.onBoardRendered) {
            hooks.removeAction('board:rendered', this._handlers.onBoardRendered);
            this._handlers.onBoardRendered = null;
        }

        this._removePerspective();

        if (this._styleEl) {
            this._styleEl.remove();
            this._styleEl = null;
        }
        if (this._dynamicStyleEl) {
            this._dynamicStyleEl.remove();
            this._dynamicStyleEl = null;
        }
    },

    // ---------------------------------------------------------------
    // Persistence
    // ---------------------------------------------------------------

    /**
     * Charge les settings depuis IndexedDB.
     * @returns {Promise<void>}
     * @private
     */
    async _loadSettings() {
        const stored = await StorageService.get(STORAGE_KEY, null);
        if (stored) {
            this._settings = { ...DEFAULTS, ...stored };
        }
    },

    /** @type {number|null} Timer du debounce de _saveSettings */
    _saveSettingsTimer: null,

    /**
     * Sauvegarde les settings dans IndexedDB (debounced 300ms).
     * Évite les écritures excessives pendant le drag de sliders.
     * @private
     */
    _saveSettings() {
        clearTimeout(this._saveSettingsTimer);
        this._saveSettingsTimer = setTimeout(async () => {
            await StorageService.set(STORAGE_KEY, this._settings);
        }, 300);
    },

    // ---------------------------------------------------------------
    // Application de la perspective
    // ---------------------------------------------------------------

    /** @private */
    _applyPerspective() {
        const container = document.getElementById('board-container');
        const board = document.querySelector('.board');

        if (!container || !board) return;

        if (!this._settings.enabled) {
            this._removePerspective();
            return;
        }

        const { perspective, rotateX, rotateY, zoom, intensity } = this._settings;

        // Applique la perspective au conteneur
        container.style.perspective = `${perspective}px`;
        container.style.perspectiveOrigin = '50% 50%';

        // Applique les rotations et le zoom au board
        const rx = rotateX * intensity;
        const ry = rotateY * intensity;
        board.style.transformStyle = 'preserve-3d';
        board.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) scale(${zoom})`;
        board.style.transformOrigin = '50% 0%';

        // Ajoute les classes pour les effets hover
        board.classList.toggle('p3d-card-hover', this._settings.cardHoverLift);
        board.classList.toggle('p3d-column-hover', this._settings.columnHoverLift);

        this._updateDynamicStyles();
    },

    /** @private */
    _removePerspective() {
        const container = document.getElementById('board-container');
        const board = document.querySelector('.board');

        if (container) {
            container.style.perspective = '';
            container.style.perspectiveOrigin = '';
        }

        if (board) {
            board.style.transformStyle = '';
            board.style.transform = '';
            board.style.transformOrigin = '';
            board.classList.remove('p3d-card-hover', 'p3d-column-hover');
        }
    },

    /** @private */
    _updateDynamicStyles() {
        const { intensity } = this._settings;
        const shadowBlur = 30 * intensity;

        // Note: On utilise scale + shadow au lieu de translateZ sur les cartes
        // car translateZ interfère avec le hit-testing de SortableJS.
        // L'effet 3D global vient du board (rotateX/Y), pas des éléments individuels.
        const css = `
            .p3d-card-hover .card:hover:not(.sortable-drag):not(.card-ghost) {
                transform: scale(1.02);
                box-shadow: 0 ${shadowBlur}px ${shadowBlur * 1.5}px rgba(0, 0, 0, 0.4);
                z-index: 10;
            }
            .p3d-column-hover .column:hover {
                transform: scale(1.01);
                box-shadow: 0 ${shadowBlur * 0.7}px ${shadowBlur}px rgba(0, 0, 0, 0.3);
            }
            /* Reset transform pendant le drag pour éviter les glitches */
            .p3d-card-hover .card.sortable-drag,
            .p3d-card-hover .card.card-ghost {
                transform: none !important;
            }
        `;

        if (!this._dynamicStyleEl) {
            this._dynamicStyleEl = document.createElement('style');
            document.head.appendChild(this._dynamicStyleEl);
        }
        this._dynamicStyleEl.textContent = css;
    },

    // ---------------------------------------------------------------
    // API pour le settings panel
    // ---------------------------------------------------------------

    /**
     * Retourne les paramètres actuels.
     * @returns {Object}
     */
    getSettings() {
        return { ...this._settings };
    },

    /**
     * Met à jour un paramètre.
     *
     * @param {string} key
     * @param {*} value
     */
    setSetting(key, value) {
        this._settings[key] = value;
        this._saveSettings();
        this._applyPerspective();
    },

    /**
     * Met à jour plusieurs paramètres en une seule opération.
     * Évite les sauvegardes/renders multiples.
     *
     * @param {Object} values - Objet clé/valeur des paramètres à modifier
     */
    setSettings(values) {
        Object.assign(this._settings, values);
        this._saveSettings();
        this._applyPerspective();
    },

    /**
     * Réinitialise les paramètres par défaut.
     */
    resetSettings() {
        this._settings = { ...DEFAULTS };
        this._saveSettings();
        this._applyPerspective();
    },
};

export default Perspective3DPlugin;
