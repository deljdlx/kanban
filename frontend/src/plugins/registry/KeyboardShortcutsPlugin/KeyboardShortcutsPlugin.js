/**
 * KeyboardShortcutsPlugin.js — Raccourcis clavier centralisés et paramétrables.
 *
 * Écoute les événements `keydown` sur `document` et dispatch les raccourcis
 * vers les actions correspondantes. Les raccourcis sont personnalisables
 * via le panneau de réglages (click-to-record).
 *
 * Les raccourcis par défaut sont définis dans `defaultShortcuts.js`.
 * Ce fichier ne contient que la mécanique : listener, parsing, matching,
 * guards et persistence IndexedDB.
 *
 * Guards :
 *   - Les raccourcis sans modificateur (sauf Escape) sont ignorés
 *     quand le focus est dans un champ de saisie.
 *   - Chaque raccourci peut définir son propre guard dans defaultShortcuts.js.
 *
 * Coexistence avec CommandPalettePlugin :
 *   - La palette garde son propre Ctrl+K.
 *   - Escape : le guard de `closeModal` skip si `.cp-overlay--visible` existe.
 */
import StorageService from '../../../services/StorageService.js';
import { DEFAULT_SHORTCUTS } from './defaultShortcuts.js';

/**
 * Clé IndexedDB pour stocker les overrides utilisateur.
 * @type {string}
 */
const STORAGE_KEY = 'kanban:keyboard-shortcuts';

export default class KeyboardShortcutsPlugin {
    // =========================================================
    // Champs privés
    // =========================================================

    /** @type {import('../../HookRegistry.js').default|null} */
    _hooks = null;

    /** @type {Function|null} Référence au listener keydown pour cleanup */
    _boundKeydown = null;

    /**
     * Map des raccourcis enregistrés.
     * @type {Map<string, ShortcutDef>}
     *
     * ShortcutDef = {
     *   id:         string,
     *   label:      string,
     *   defaultKey: string,
     *   currentKey: string,
     *   action:     () => void,
     *   guard:      (() => boolean)|undefined
     * }
     */
    _shortcuts = new Map();

    /**
     * Overrides utilisateur : { [shortcutId]: "key string" }.
     * @type {Object<string, string>}
     */
    _settings = {};

    // =========================================================
    // Lifecycle
    // =========================================================

    /**
     * Installe le plugin : styles, raccourcis par défaut, listener clavier.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        this._hooks = hooks;

        if (typeof this._injectStyles === 'function') {
            this._injectStyles();
        }

        this._registerDefaults();

        // Charger les settings (fire-and-forget avec catch)
        this._initAsync().catch((err) =>
            console.warn('KeyboardShortcutsPlugin : échec du chargement des settings', err),
        );

        // Listener clavier global
        this._boundKeydown = (e) => this._onKeydown(e);
        document.addEventListener('keydown', this._boundKeydown);
    }

    /**
     * Désinstalle le plugin : retire le listener et les styles.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(_hooks) {
        if (this._boundKeydown) {
            document.removeEventListener('keydown', this._boundKeydown);
            this._boundKeydown = null;
        }

        if (typeof this._removeStyles === 'function') {
            this._removeStyles();
        }

        this._hooks = null;
    }

    // =========================================================
    // Raccourcis par défaut
    // =========================================================

    /**
     * Peuple `_shortcuts` à partir du tableau déclaratif `DEFAULT_SHORTCUTS`.
     *
     * @private
     */
    _registerDefaults() {
        for (const def of DEFAULT_SHORTCUTS) {
            this._shortcuts.set(def.id, {
                ...def,
                currentKey: def.defaultKey,
            });
        }
    }

    // =========================================================
    // Listener clavier
    // =========================================================

    /**
     * Handler global `keydown`. Parse l'événement, cherche un raccourci
     * correspondant, vérifie les guards, et exécute l'action.
     *
     * @param {KeyboardEvent} e
     * @private
     */
    _onKeydown(e) {
        // Ignorer les saisies texte (sauf Escape et combos avec modificateur)
        if (this._isTyping(e)) {
            const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
            if (e.key !== 'Escape' && !hasModifier) return;
        }

        const eventParsed = this._parseEvent(e);

        for (const shortcut of this._shortcuts.values()) {
            const keyParsed = this._parseKey(shortcut.currentKey);
            if (!this._matchParsed(eventParsed, keyParsed)) continue;

            // Guard check
            if (shortcut.guard && !shortcut.guard()) continue;

            e.preventDefault();
            shortcut.action();
            return;
        }
    }

    /**
     * Vérifie si le focus est dans un champ de saisie.
     *
     * @param {KeyboardEvent} e
     * @returns {boolean}
     * @private
     */
    _isTyping(e) {
        const tag = e.target.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
    }

    // =========================================================
    // Parsing et matching
    // =========================================================

    /**
     * Parse une chaîne de raccourci en objet structuré.
     * Ex: `"ctrl+shift+n"` → `{ ctrl: true, alt: false, shift: true, key: "n" }`
     *
     * @param {string} str - Chaîne normalisée (ex: "ctrl+n", "escape", "alt+,")
     * @returns {{ ctrl: boolean, alt: boolean, shift: boolean, key: string }}
     */
    _parseKey(str) {
        const parts = str.toLowerCase().split('+');
        const result = { ctrl: false, alt: false, shift: false, key: '' };

        for (const part of parts) {
            if (part === 'ctrl' || part === 'cmd' || part === 'meta') {
                result.ctrl = true;
            } else if (part === 'alt') {
                result.alt = true;
            } else if (part === 'shift') {
                result.shift = true;
            } else {
                result.key = part;
            }
        }

        return result;
    }

    /**
     * Parse un KeyboardEvent en objet structuré.
     *
     * @param {KeyboardEvent} e
     * @returns {{ ctrl: boolean, alt: boolean, shift: boolean, key: string }}
     * @private
     */
    _parseEvent(e) {
        return {
            ctrl: e.ctrlKey || e.metaKey,
            alt: e.altKey,
            shift: e.shiftKey,
            key: e.key.toLowerCase(),
        };
    }

    /**
     * Compare deux objets de touches parsés.
     *
     * @param {{ ctrl: boolean, alt: boolean, shift: boolean, key: string }} event
     * @param {{ ctrl: boolean, alt: boolean, shift: boolean, key: string }} shortcut
     * @returns {boolean}
     * @private
     */
    _matchParsed(event, shortcut) {
        return (
            event.ctrl === shortcut.ctrl &&
            event.alt === shortcut.alt &&
            event.shift === shortcut.shift &&
            event.key === shortcut.key
        );
    }

    /**
     * Formate un objet parsé en chaîne normalisée.
     * Ex: `{ ctrl: true, shift: false, alt: false, key: "n" }` → `"ctrl+n"`
     *
     * @param {{ ctrl: boolean, alt: boolean, shift: boolean, key: string }} parsed
     * @returns {string}
     */
    _formatKey(parsed) {
        const parts = [];
        if (parsed.ctrl) parts.push('ctrl');
        if (parsed.alt) parts.push('alt');
        if (parsed.shift) parts.push('shift');
        parts.push(parsed.key);
        return parts.join('+');
    }

    // =========================================================
    // Persistence IndexedDB
    // =========================================================

    /**
     * Charge les settings depuis IndexedDB et applique les overrides.
     *
     * @private
     */
    async _initAsync() {
        await this._loadSettings();
    }

    /**
     * Charge les overrides utilisateur et les applique sur `currentKey`.
     *
     * @private
     */
    async _loadSettings() {
        const stored = await StorageService.get(STORAGE_KEY, {});
        this._settings = stored;

        for (const [id, keyStr] of Object.entries(stored)) {
            const shortcut = this._shortcuts.get(id);
            if (shortcut) shortcut.currentKey = keyStr;
        }
    }

    /**
     * Sauvegarde les overrides utilisateur dans IndexedDB.
     *
     * @private
     */
    async _saveSettings() {
        await StorageService.set(STORAGE_KEY, this._settings);
    }

    // =========================================================
    // API publique (utilisée par settingsPanel)
    // =========================================================

    /**
     * Retourne la Map des raccourcis (pour le settings panel).
     *
     * @returns {Map<string, ShortcutDef>}
     */
    getShortcuts() {
        return this._shortcuts;
    }

    /**
     * Met à jour le raccourci d'un shortcut et persiste.
     *
     * @param {string} id - L'identifiant du raccourci
     * @param {string} newKey - La nouvelle touche normalisée
     */
    async updateShortcut(id, newKey) {
        const shortcut = this._shortcuts.get(id);
        if (!shortcut) return;

        shortcut.currentKey = newKey;
        this._settings[id] = newKey;
        await this._saveSettings();
    }

    /**
     * Réinitialise tous les raccourcis à leurs valeurs par défaut.
     */
    async resetAll() {
        for (const shortcut of this._shortcuts.values()) {
            shortcut.currentKey = shortcut.defaultKey;
        }
        this._settings = {};
        await this._saveSettings();
    }
}
