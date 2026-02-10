/**
 * ThemePlugin — Permet de changer le thème visuel du kanban.
 *
 * Le thème par défaut (dark violet) est défini dans _variables.scss via
 * des CSS custom properties (--color-*, --font-family, etc.).
 *
 * Ce plugin override ces propriétés sur :root via style.setProperty().
 * À l'uninstall, les propriétés sont retirées → retour au thème par défaut.
 *
 * Persistance : IndexedDB clé `kanban:theme`.
 */
import { PRESETS } from './presets.js';
import { loadPickr } from '../../lib/PickrLoader.js';
import StorageService from '../../../services/StorageService.js';

/** @type {string} Clé de stockage pour les réglages du thème */
const STORAGE_KEY = 'kanban:theme';

/**
 * Custom properties que le plugin peut écraser.
 * Mêmes noms que dans _variables.scss.
 * @type {string[]}
 */
const THEME_PROPS = [
    '--color-bg',
    '--color-surface',
    '--color-surface-hover',
    '--color-border',
    '--color-text',
    '--color-text-muted',
    '--color-primary',
    '--color-primary-hover',
    '--font-family',
    '--font-family-heading',
];

/**
 * Réglages par défaut (aucun override = thème SCSS d'origine).
 */
export const DEFAULT_SETTINGS = {
    preset: 'default',
    overrides: {},
    fontFamily: null,
    scale: 100,
};

const ThemePlugin = {
    /** @type {HTMLStyleElement|null} */
    _styleEl: null,

    /** @type {Object|null} Instance Pickr du settings panel */
    _settingsPickr: null,

    /** @type {Object} Réglages par défaut (exposé pour settingsPanel.js) */
    _defaultSettings: DEFAULT_SETTINGS,

    /**
     * Réglages courants du thème.
     * @type {{ preset: string, overrides: Object, fontFamily: string|null, scale: number }}
     */
    _settings: { ...DEFAULT_SETTINGS },

    /**
     * @param {import('../../HookRegistry.js').default} hooks
     * @returns {Promise<void>}
     */
    async install(hooks) {
        await this._loadSettings();
        this._applyTheme();
        this._injectStyles();

        loadPickr().catch((err) => console.error(err));
    },

    /**
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        this._removeTheme();
        this._destroySettingsPickr();

        if (this._styleEl) {
            this._styleEl.remove();
            this._styleEl = null;
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
        this._settings = stored ? { ...DEFAULT_SETTINGS, ...stored } : { ...DEFAULT_SETTINGS };
    },

    /**
     * Sauvegarde les settings dans IndexedDB.
     * @returns {Promise<void>}
     * @private
     */
    async _saveSettings() {
        await StorageService.set(STORAGE_KEY, this._settings);
    },

    // ---------------------------------------------------------------
    // Application du thème
    // ---------------------------------------------------------------

    /**
     * Applique le thème courant sur :root.
     * @private
     */
    _applyTheme() {
        const root = document.documentElement;
        const s = this._settings;
        const preset = PRESETS[s.preset] || PRESETS.default;

        this._removeTheme();

        for (const [prop, val] of Object.entries(preset.values)) {
            root.style.setProperty(prop, val);
        }
        for (const [prop, val] of Object.entries(s.overrides)) {
            root.style.setProperty(prop, val);
        }
        if (s.fontFamily) {
            root.style.setProperty('--font-family', s.fontFamily);
        }
        if (s.scale && s.scale !== 100) {
            root.style.fontSize = s.scale + '%';
        }
    },

    /**
     * Retire tous les overrides du thème sur :root.
     * @private
     */
    _removeTheme() {
        const root = document.documentElement;
        for (const prop of THEME_PROPS) {
            root.style.removeProperty(prop);
        }
        root.style.removeProperty('font-size');
    },

    /** @private */
    _destroySettingsPickr() {
        if (this._settingsPickr) {
            this._settingsPickr.destroyAndRemove();
            this._settingsPickr = null;
        }
    },
};

export default ThemePlugin;
