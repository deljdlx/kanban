/**
 * PluginManager — Gestionnaire de plugins structurés.
 *
 * Chaque plugin est un objet avec :
 *   - name (string)              : identifiant unique
 *   - install(hooks)             : reçoit le HookRegistry, enregistre ses hooks
 *   - uninstall(hooks) (optionnel) : retire ses hooks
 *   - label (string, optionnel)  : nom lisible (fallback : name)
 *   - settingsPanel(container) (optionnel) : remplit un élément avec les réglages
 *
 * Émet l'événement 'change' sur register, unregister, enable et disable.
 *
 * L'état activé/désactivé de chaque plugin est persisté dans IndexedDB.
 *
 * IMPORTANT: Appeler `await PluginManager.init()` avant d'enregistrer des plugins.
 *
 * Singleton exporté : `import PluginManager from './PluginManager.js'`.
 */
import Hooks from './HookRegistry.js';
import StorageService from '../services/StorageService.js';
import EventEmitter from '../lib/EventEmitter.js';

/** @type {string} Clé de stockage pour les plugins désactivés */
const STORAGE_KEY = 'kanban:disabledPlugins';

/** @type {number} Délai (ms) avant warning si plugin.install() n'a pas résolu */
const INSTALL_TIMEOUT = 5_000;

class PluginManager extends EventEmitter {
    /**
     * Plugins enregistrés, indexés par nom.
     * @type {Map<string, { instance: Object, installed: boolean, error: Error|null }>}
     */
    _plugins;

    /**
     * Set des noms de plugins désactivés (persisté dans IndexedDB).
     * @type {Set<string>}
     */
    _disabledPlugins;

    /**
     * Indique si l'initialisation async est terminée.
     * @type {boolean}
     */
    _initialized;

    constructor() {
        super();
        this._plugins = new Map();
        this._disabledPlugins = new Set();
        this._initialized = false;
    }

    /**
     * Initialise le PluginManager (charge l'état depuis IndexedDB).
     * DOIT être appelé avant d'enregistrer des plugins.
     *
     * @returns {Promise<void>}
     */
    async init() {
        if (this._initialized) return;
        this._disabledPlugins = await this._loadDisabledPlugins();
        this._initialized = true;
    }

    // ---------------------------------------------------------------
    // Persistence
    // ---------------------------------------------------------------

    /**
     * Charge la liste des plugins désactivés depuis IndexedDB.
     *
     * @returns {Promise<Set<string>>}
     * @private
     */
    async _loadDisabledPlugins() {
        const stored = await StorageService.get(STORAGE_KEY, []);
        return new Set(stored);
    }

    /**
     * Persiste la liste des plugins désactivés dans IndexedDB.
     *
     * @returns {Promise<void>}
     * @private
     */
    async _saveDisabledPlugins() {
        await StorageService.set(STORAGE_KEY, [...this._disabledPlugins]);
    }

    // ---------------------------------------------------------------
    // Gestion des plugins
    // ---------------------------------------------------------------

    /**
     * Enregistre une liste de plugins, triés par priorité croissante.
     * (plus petit = enregistré plus tôt, défaut = 10).
     *
     * @param {Object[]} plugins - Tableau de plugins à enregistrer
     * @returns {Promise<void>}
     */
    async registerAll(plugins) {
        const active = plugins.filter((p) => !p.disabled);
        const sorted = active.sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10));
        for (const plugin of sorted) {
            await this.register(plugin);
        }
    }

    /**
     * Enregistre un plugin. L'installe sauf s'il était précédemment désactivé.
     * Appelle `plugin.install(hooks)` pour que le plugin
     * s'accroche aux hooks qu'il souhaite.
     *
     * @param {Object} plugin - Objet plugin (doit avoir `.name` et `.install()`)
     * @returns {Promise<void>}
     */
    async register(plugin) {
        if (!plugin.name) {
            throw new Error('PluginManager : le plugin doit avoir une propriété "name".');
        }
        if (this._plugins.has(plugin.name)) {
            throw new Error(`PluginManager : le plugin "${plugin.name}" est déjà enregistré.`);
        }

        // Enregistre les hooks fournis par le plugin (toujours, même si désactivé)
        this._registerPluginHooks(plugin);

        // Si le plugin était désactivé, on l'enregistre sans l'installer
        if (this._disabledPlugins.has(plugin.name)) {
            this._plugins.set(plugin.name, { instance: plugin, installed: false, error: null });
            this.emit('change');
            return;
        }

        try {
            await this._installWithTimeout(plugin);
        } catch (error) {
            console.error(`PluginManager : échec de l'install du plugin "${plugin.name}"`, error);
            this._plugins.set(plugin.name, { instance: plugin, installed: false, error });
            this.emit('change');
            return;
        }
        this._plugins.set(plugin.name, { instance: plugin, installed: true, error: null });
        this.emit('change');
    }

    /**
     * Enregistre les hooks fournis par un plugin dans le HookRegistry.
     * Permet aux autres plugins d'écouter ces hooks sans warning.
     *
     * Supporte deux formats dans provides :
     *   - string : nom du hook (pas de métadonnées)
     *   - { name, ...meta } : nom + métadonnées (label, category, notification...)
     *
     * @param {Object} plugin
     * @private
     */
    _registerPluginHooks(plugin) {
        const providedHooks = plugin.hooks?.provides;
        if (!Array.isArray(providedHooks)) return;

        for (const entry of providedHooks) {
            if (typeof entry === 'string') {
                Hooks.registerHook(entry);
            } else if (entry?.name) {
                Hooks.registerHook(entry.name, entry);
            }
        }
    }

    /**
     * Appelle plugin.install() avec un warning console si la Promise
     * ne résout pas dans les INSTALL_TIMEOUT ms.
     * Pas de rejet — juste un avertissement pour aider au debug.
     *
     * @param {Object} plugin
     * @returns {Promise<void>}
     * @private
     */
    async _installWithTimeout(plugin) {
        const result = plugin.install(Hooks);
        if (!(result instanceof Promise)) return;

        const timer = setTimeout(() => {
            console.warn(
                `PluginManager : l'install du plugin "${plugin.name}" prend plus de ${INSTALL_TIMEOUT / 1000}s.`,
            );
        }, INSTALL_TIMEOUT);

        try {
            await result;
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * Désinstalle et retire un plugin du registre.
     * Appelle `plugin.uninstall(hooks)` si la méthode existe.
     * Supporte les uninstall async (cleanup IndexedDB, etc.).
     * Nettoie aussi l'état persisté.
     *
     * @param {string} name - Identifiant du plugin à retirer
     * @returns {Promise<void>}
     */
    async unregister(name) {
        const entry = this._plugins.get(name);
        if (!entry) return;

        if (entry.installed && typeof entry.instance.uninstall === 'function') {
            try {
                const result = entry.instance.uninstall(Hooks);
                if (result instanceof Promise) {
                    await result;
                }
            } catch (error) {
                console.error(`PluginManager : échec de l'uninstall du plugin "${name}"`, error);
            }
        }

        // Retire les styles injectés par PluginAssembler
        if (typeof entry.instance._removeStyles === 'function') {
            entry.instance._removeStyles();
        }

        this._plugins.delete(name);

        // Nettoie l'état persisté si le plugin était désactivé
        if (this._disabledPlugins.has(name)) {
            this._disabledPlugins.delete(name);
            await this._saveDisabledPlugins();
        }

        this.emit('change');
    }

    /**
     * Désactive un plugin sans le retirer du registre.
     * Appelle `plugin.uninstall(hooks)` et met installed à false.
     * Supporte les uninstall async.
     * L'état est persisté dans IndexedDB.
     *
     * @param {string} name - Identifiant du plugin à désactiver
     * @returns {Promise<void>}
     */
    async disable(name) {
        const entry = this._plugins.get(name);
        if (!entry || !entry.installed) return;

        if (typeof entry.instance.uninstall === 'function') {
            try {
                const result = entry.instance.uninstall(Hooks);
                if (result instanceof Promise) {
                    await result;
                }
            } catch (error) {
                console.error(`PluginManager : échec de l'uninstall du plugin "${name}"`, error);
            }
        }

        // Retire les styles injectés par PluginAssembler
        if (typeof entry.instance._removeStyles === 'function') {
            entry.instance._removeStyles();
        }

        entry.installed = false;

        // Persiste l'état désactivé
        this._disabledPlugins.add(name);
        await this._saveDisabledPlugins();

        this.emit('change');
    }

    /**
     * Réactive un plugin précédemment désactivé.
     * Appelle `plugin.install(hooks)` et met installed à true.
     * Supporte les install async.
     * L'état est persisté dans IndexedDB.
     *
     * @param {string} name - Identifiant du plugin à réactiver
     * @returns {Promise<void>}
     */
    async enable(name) {
        const entry = this._plugins.get(name);
        if (!entry || entry.installed) return;

        try {
            await this._installWithTimeout(entry.instance);
        } catch (error) {
            console.error(`PluginManager : échec de l'activation du plugin "${name}"`, error);
            entry.error = error;
            this.emit('change');
            return;
        }
        entry.installed = true;
        entry.error = null;

        // Retire de la liste des désactivés
        this._disabledPlugins.delete(name);
        await this._saveDisabledPlugins();

        this.emit('change');
    }

    /**
     * Indique si un plugin est actuellement activé.
     *
     * @param {string} name
     * @returns {boolean}
     */
    isEnabled(name) {
        const entry = this._plugins.get(name);
        return entry ? entry.installed : false;
    }

    /**
     * Retourne l'instance d'un plugin par son nom.
     *
     * @param {string} name
     * @returns {Object|undefined}
     */
    getPlugin(name) {
        const entry = this._plugins.get(name);
        return entry ? entry.instance : undefined;
    }

    /**
     * Retourne tous les plugins enregistrés avec leur état.
     *
     * @returns {{ instance: Object, installed: boolean }[]}
     */
    getAll() {
        return Array.from(this._plugins.values());
    }
}

import Container from '../Container.js';

const pluginManager = new PluginManager();
Container.set('PluginManager', pluginManager);

export { PluginManager };
export default pluginManager;
