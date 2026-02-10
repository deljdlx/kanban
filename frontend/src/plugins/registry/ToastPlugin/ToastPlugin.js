/**
 * ToastPlugin — Affiche des notifications toast.
 *
 * Fonctionnalités :
 *   - Découvre dynamiquement les hooks avec métadonnée `notification`
 *     dans le HookRegistry (core + plugins)
 *   - Affiche des toasts en bas à droite
 *   - Fournit une API via hooks pour les autres plugins
 *
 * Hooks fournis (toujours actifs) :
 *   - toast:show   : { message, type?, duration?, icon? }
 *   - toast:hide   : { id }
 *   - toast:clear  : (pas de payload)
 *
 * Découverte dynamique :
 *   Au install(), le plugin interroge HookRegistry.getRegisteredHooks()
 *   et s'abonne à tous les hooks qui portent une métadonnée `notification`.
 *   Les variables sont extraites du payload via des dot-paths déclarés
 *   dans la métadonnée (ex: "card.title", "note.displayTitle").
 *
 *   Pour qu'un nouveau hook soit automatiquement notifié, il suffit
 *   d'ajouter la métadonnée `notification` dans hookDefinitions.js
 *   ou dans le manifest.json du plugin qui le fournit.
 *
 * Réglages :
 *   Chaque événement découvert peut être activé/désactivé individuellement.
 *   Les messages sont personnalisables via des templates {variable}.
 *   Les réglages sont persistés dans IndexedDB (clé kanban:toast).
 */

import StorageService from '../../../services/StorageService.js';

/** @type {string} Clé de stockage pour les réglages */
const STORAGE_KEY = 'kanban:toast';

export default class ToastPlugin {
    /**
     * Conteneur des toasts.
     * @type {HTMLElement|null}
     */
    _container = null;

    /**
     * Compteur pour générer des IDs uniques.
     * @type {number}
     */
    _idCounter = 0;

    /**
     * Map des toasts actifs (id -> element).
     * @type {Map<string, HTMLElement>}
     */
    _toasts = new Map();

    /**
     * Handlers pour cleanup (clé = nom du hook ou nom interne).
     * @type {Object<string, Function>}
     */
    _handlers = {};

    /**
     * Référence vers le HookRegistry reçu à l'install.
     * @type {Object|null}
     */
    _hooks = null;

    /**
     * Descripteurs des événements découverts (issus du HookRegistry).
     * Construit dynamiquement à l'install.
     * @type {Array<Object>}
     */
    _descriptors = [];

    /**
     * Réglages par défaut, dérivés des descripteurs découverts.
     * @type {Object}
     */
    _defaultSettings = { enabledEvents: {}, messageTemplates: {} };

    /**
     * Réglages utilisateur (merge defaults + localStorage).
     * @type {Object}
     */
    _settings = { enabledEvents: {}, messageTemplates: {} };

    /**
     * Durée par défaut d'affichage (ms).
     * @type {number}
     */
    _defaultDuration = 3000;

    /**
     * Icônes par type de toast.
     * @type {Object<string, string>}
     */
    _icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ',
    };

    /**
     * Installe le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     * @returns {Promise<void>}
     */
    async install(hooks) {
        if (typeof this._injectStyles === 'function') {
            this._injectStyles();
        }

        this._hooks = hooks;
        this._createContainer();

        // --- Découverte dynamique des hooks avec notification ---
        this._descriptors = this._discoverHooks();
        this._defaultSettings = this._buildDefaultSettings();

        // --- Charge les settings depuis IndexedDB ---
        await this._loadSettings();

        // --- API publique via hooks (toujours actifs) ---
        this._handlers.onShow = (payload) => this.show(payload);
        this._handlers.onHide = ({ id }) => this.hide(id);
        this._handlers.onClear = () => this.clear();

        hooks.addAction('toast:show', this._handlers.onShow);
        hooks.addAction('toast:hide', this._handlers.onHide);
        hooks.addAction('toast:clear', this._handlers.onClear);

        // --- Abonnement aux hooks découverts ---
        this._subscribeAll();
    }

    /**
     * Désinstalle le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        // API
        hooks.removeAction('toast:show', this._handlers.onShow);
        hooks.removeAction('toast:hide', this._handlers.onHide);
        hooks.removeAction('toast:clear', this._handlers.onClear);

        // Hooks découverts
        for (const desc of this._descriptors) {
            hooks.removeAction(desc.hook, this._handlers[desc.hook]);
        }

        this.clear();
        this._removeContainer();
        this._hooks = null;
    }

    // ---------------------------------------------------------------
    // API publique
    // ---------------------------------------------------------------

    /**
     * Affiche un toast.
     *
     * @param {Object} options
     * @param {string} options.message - Message à afficher
     * @param {string} [options.type='info'] - Type : success, error, warning, info
     * @param {number} [options.duration] - Durée en ms (0 = permanent)
     * @param {string} [options.icon] - Icône custom (remplace celle du type)
     * @returns {string} ID du toast créé
     */
    show({ message, type = 'info', duration = this._defaultDuration, icon = null }) {
        const id = `toast-${++this._idCounter}`;

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.dataset.id = id;

        const iconEl = document.createElement('span');
        iconEl.className = 'toast__icon';
        iconEl.textContent = icon || this._icons[type] || this._icons.info;

        const messageEl = document.createElement('span');
        messageEl.className = 'toast__message';
        messageEl.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast__close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => this.hide(id));

        toast.appendChild(iconEl);
        toast.appendChild(messageEl);
        toast.appendChild(closeBtn);

        this._container.appendChild(toast);
        this._toasts.set(id, toast);

        // Animation d'entrée
        requestAnimationFrame(() => {
            toast.classList.add('toast--visible');
        });

        // Auto-hide si duration > 0
        if (duration > 0) {
            setTimeout(() => this.hide(id), duration);
        }

        return id;
    }

    /**
     * Cache un toast par son ID.
     *
     * @param {string} id
     */
    hide(id) {
        const toast = this._toasts.get(id);
        if (!toast) return;

        toast.classList.remove('toast--visible');
        toast.classList.add('toast--hiding');

        // Retire après animation
        setTimeout(() => {
            toast.remove();
            this._toasts.delete(id);
        }, 200);
    }

    /**
     * Supprime tous les toasts.
     */
    clear() {
        for (const [id] of this._toasts) {
            this.hide(id);
        }
    }

    // ---------------------------------------------------------------
    // Découverte dynamique
    // ---------------------------------------------------------------

    /**
     * Interroge le HookRegistry et collecte tous les hooks
     * qui portent une métadonnée `notification`.
     *
     * @returns {Array<Object>} Descripteurs exploitables par le plugin
     * @private
     */
    _discoverHooks() {
        const descriptors = [];

        for (const [hookName, meta] of this._hooks.getRegisteredHooks()) {
            if (!meta.notification) continue;

            descriptors.push({
                hook: hookName,
                label: meta.label || hookName,
                category: meta.category || 'Autres',
                type: meta.notification.type || 'info',
                duration: meta.notification.duration,
                template: meta.notification.template || hookName,
                variables: meta.notification.variables || {},
            });
        }

        return descriptors;
    }

    /**
     * Construit les réglages par défaut depuis les descripteurs découverts.
     *
     * @returns {Object}
     * @private
     */
    _buildDefaultSettings() {
        const enabledEvents = {};
        const messageTemplates = {};

        for (const desc of this._descriptors) {
            enabledEvents[desc.hook] = true;
            messageTemplates[desc.hook] = desc.template;
        }

        return { enabledEvents, messageTemplates };
    }

    /**
     * Crée un handler et s'abonne à chaque hook découvert.
     *
     * @private
     */
    _subscribeAll() {
        for (const desc of this._descriptors) {
            this._handlers[desc.hook] = (payload) => {
                if (!this._isEventEnabled(desc.hook)) return;
                const vars = this._extractVars(payload, desc.variables);
                const message = this._getMessage(desc.hook, vars);
                this.show({ message, type: desc.type, duration: desc.duration });
            };
            this._hooks.addAction(desc.hook, this._handlers[desc.hook]);
        }
    }

    // ---------------------------------------------------------------
    // Extraction de variables
    // ---------------------------------------------------------------

    /**
     * Extrait les variables du payload en utilisant les dot-paths
     * déclarés dans la métadonnée du hook.
     *
     * @param {Object} payload - Payload brut du hook (ex: { card, toColumn })
     * @param {Object<string, string>} variableMap - Map { varName: 'dot.path' }
     * @returns {Object<string, string>}
     * @private
     */
    _extractVars(payload, variableMap) {
        const vars = {};
        for (const [varName, dotPath] of Object.entries(variableMap)) {
            const raw = this._resolveDotPath(payload, dotPath);
            // eslint-disable-next-line eqeqeq -- != null couvre null ET undefined volontairement
            vars[varName] = this._truncate(raw != null ? String(raw) : '');
        }
        return vars;
    }

    /**
     * Résout un chemin pointé dans un objet.
     * Ex: _resolveDotPath({ card: { title: 'Foo' } }, 'card.title') → 'Foo'
     *
     * @param {Object} obj
     * @param {string} path - Chemin pointé (ex: 'note.displayTitle')
     * @returns {*}
     * @private
     */
    _resolveDotPath(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    // ---------------------------------------------------------------
    // Persistence
    // ---------------------------------------------------------------

    /**
     * Crée le conteneur des toasts.
     *
     * @private
     */
    _createContainer() {
        if (this._container) return;

        this._container = document.createElement('div');
        this._container.className = 'toast-container';
        document.body.appendChild(this._container);
    }

    /**
     * Supprime le conteneur des toasts.
     *
     * @private
     */
    _removeContainer() {
        if (this._container) {
            this._container.remove();
            this._container = null;
        }
    }

    /**
     * Charge les réglages depuis IndexedDB, merge avec les defaults.
     * Forward-compatible : si un nouveau hook apparaît, il sera activé
     * par défaut avec son template par défaut.
     *
     * @returns {Promise<void>}
     * @private
     */
    async _loadSettings() {
        const stored = await StorageService.get(STORAGE_KEY, null);
        if (stored) {
            this._settings = {
                enabledEvents: {
                    ...this._defaultSettings.enabledEvents,
                    ...(stored.enabledEvents || {}),
                },
                messageTemplates: {
                    ...this._defaultSettings.messageTemplates,
                    ...(stored.messageTemplates || {}),
                },
            };
        } else {
            this._settings = {
                enabledEvents: { ...this._defaultSettings.enabledEvents },
                messageTemplates: { ...this._defaultSettings.messageTemplates },
            };
        }
    }

    /**
     * Persiste les réglages via StorageService.
     *
     * @returns {Promise<void>}
     * @private
     */
    async _saveSettings() {
        await StorageService.set(STORAGE_KEY, this._settings);
    }

    /**
     * Vérifie si un événement est activé dans les réglages.
     *
     * @param {string} eventName
     * @returns {boolean}
     * @private
     */
    _isEventEnabled(eventName) {
        return this._settings.enabledEvents[eventName] !== false;
    }

    /**
     * Résout un template en remplaçant les {variables} par leurs valeurs.
     *
     * @param {string} template - Ex: 'Carte "{title}" créée'
     * @param {Object<string, string>} vars - Ex: { title: 'Ma carte' }
     * @returns {string}
     * @private
     */
    _resolveTemplate(template, vars = {}) {
        return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
    }

    /**
     * Retourne le message résolu pour un événement donné.
     *
     * @param {string} eventName
     * @param {Object<string, string>} vars
     * @returns {string}
     * @private
     */
    _getMessage(eventName, vars = {}) {
        const template =
            this._settings.messageTemplates[eventName] ||
            this._defaultSettings.messageTemplates[eventName] ||
            eventName;
        return this._resolveTemplate(template, vars);
    }

    /**
     * Tronque un texte.
     *
     * @param {string} text
     * @param {number} max
     * @returns {string}
     * @private
     */
    _truncate(text, max = 30) {
        if (!text) return '';
        return text.length > max ? text.slice(0, max) + '...' : text;
    }
}
