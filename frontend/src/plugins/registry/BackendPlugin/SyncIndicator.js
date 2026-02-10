/**
 * SyncIndicator — Indicateur visuel de statut de synchronisation.
 *
 * Affiche une pastille de couleur dans la toolbar/footer qui indique :
 *   - Gris   : backend non configuré (mode local)
 *   - Vert   : connecté au backend, sync OK
 *   - Orange : ops en attente de push (offline ou erreur temporaire)
 *   - Rouge  : erreur de sync persistante
 *
 * Écoute les hooks :
 *   - sync:pushed → vert
 *   - sync:queued (avec pending > 0) → orange
 *   - sync:pushFailed → rouge
 */

/**
 * États possibles de l'indicateur.
 * @type {Object<string, { color: string, label: string }>}
 */
const STATES = {
    OFFLINE: { color: '#9ca3af', label: 'Mode local' },
    SYNCED: { color: '#10b981', label: 'Synchronisé' },
    PENDING: { color: '#f59e0b', label: 'Synchronisation en attente' },
    ERROR: { color: '#ef4444', label: 'Erreur de synchronisation' },
};

export default class SyncIndicator {
    /**
     * Élément DOM de l'indicateur.
     * @type {HTMLElement|null}
     */
    _element;

    /**
     * Pastille de couleur.
     * @type {HTMLElement|null}
     */
    _dot;

    /**
     * Label textuel.
     * @type {HTMLElement|null}
     */
    _label;

    /**
     * État courant.
     * @type {string}
     */
    _currentState;

    /**
     * Référence au hook registry.
     * @type {import('../../HookRegistry.js').default|null}
     */
    _hooksRegistry;

    /**
     * Handlers pour cleanup.
     * @type {Object<string, Function>}
     */
    _handlers;

    /**
     * Instance du plugin backend.
     * @type {Object}
     */
    _backendPlugin;

    constructor(backendPlugin) {
        this._element = null;
        this._dot = null;
        this._label = null;
        this._currentState = 'OFFLINE';
        this._hooksRegistry = null;
        this._handlers = {};
        this._backendPlugin = backendPlugin;
    }

    // ---------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------

    /**
     * Installe l'indicateur dans le DOM et écoute les hooks.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        this._hooksRegistry = hooks;

        // Crée l'élément DOM
        this._createElement();

        // Écoute les hooks de sync
        this._handlers.onSyncPushed = () => this._setState('SYNCED');
        hooks.addAction('sync:pushed', this._handlers.onSyncPushed);

        this._handlers.onSyncQueued = (ctx) => {
            if (ctx.opsCount > 0) {
                this._setState('PENDING');
            }
        };
        hooks.addAction('sync:queued', this._handlers.onSyncQueued);

        this._handlers.onSyncPushFailed = () => this._setState('ERROR');
        hooks.addAction('sync:pushFailed', this._handlers.onSyncPushFailed);

        // État initial basé sur la config backend
        const config = this._backendPlugin.getConfig();
        if (!config.enabled || !config.backendUrl) {
            this._setState('OFFLINE');
        }
    }

    /**
     * Désinstalle l'indicateur.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        // Retire les hooks
        if (this._handlers.onSyncPushed) {
            hooks.removeAction('sync:pushed', this._handlers.onSyncPushed);
        }
        if (this._handlers.onSyncQueued) {
            hooks.removeAction('sync:queued', this._handlers.onSyncQueued);
        }
        if (this._handlers.onSyncPushFailed) {
            hooks.removeAction('sync:pushFailed', this._handlers.onSyncPushFailed);
        }

        // Retire l'élément DOM
        if (this._element) {
            this._element.remove();
            this._element = null;
            this._dot = null;
            this._label = null;
        }
    }

    // ---------------------------------------------------------------
    // DOM
    // ---------------------------------------------------------------

    /**
     * Crée l'élément DOM de l'indicateur et l'ajoute au footer.
     *
     * @private
     */
    _createElement() {
        this._element = document.createElement('div');
        this._element.className = 'sync-indicator';

        this._dot = document.createElement('span');
        this._dot.className = 'sync-indicator__dot';

        this._label = document.createElement('span');
        this._label.className = 'sync-indicator__label';

        this._element.appendChild(this._dot);
        this._element.appendChild(this._label);

        // Ajoute au footer (ou toolbar si pas de footer)
        const footer = document.querySelector('.app-footer');
        const toolbar = document.querySelector('.toolbar');
        const target = footer || toolbar || document.body;

        target.appendChild(this._element);

        // Applique l'état initial
        this._applyState();
    }

    /**
     * Change l'état de l'indicateur.
     *
     * @param {string} state - Clé de STATES
     * @private
     */
    _setState(state) {
        if (!STATES[state]) {
            console.warn(`SyncIndicator: état inconnu "${state}"`);
            return;
        }

        this._currentState = state;
        this._applyState();
    }

    /**
     * Applique l'état courant au DOM.
     *
     * @private
     */
    _applyState() {
        if (!this._dot || !this._label) return;

        const state = STATES[this._currentState];
        this._dot.style.backgroundColor = state.color;
        this._label.textContent = state.label;

        // Tooltip
        this._element.title = state.label;
    }
}
