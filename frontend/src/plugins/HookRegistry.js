/**
 * HookRegistry — Registre central des hooks (actions et filters).
 *
 * Deux mécanismes :
 *   - Action (doAction)     : notification fire-and-forget, les callbacks
 *                             reçoivent des arguments mais ne retournent rien.
 *   - Filter (applyFilters) : pipeline de transformation, chaque callback
 *                             reçoit la valeur du précédent et retourne
 *                             la valeur transformée.
 *
 * Métadonnées :
 *   Chaque hook peut porter des métadonnées optionnelles (label, category,
 *   notification, etc.) enregistrées via registerHook(name, meta).
 *   Ces métadonnées sont consultables par n'importe quel plugin via
 *   getHookMeta() et getRegisteredHooks(), ce qui permet la découverte
 *   dynamique (ex : le ToastPlugin découvre les hooks avec notification).
 *
 * Singleton exporté : `import Hooks from './HookRegistry.js'`.
 */
class HookRegistry {
    /**
     * Callbacks d'actions, classés par nom de hook.
     * @type {Map<string, Array<{ callback: Function, priority: number }>>}
     */
    _actions;

    /**
     * Callbacks de filters, classés par nom de hook.
     * @type {Map<string, Array<{ callback: Function, priority: number }>>}
     */
    _filters;

    /**
     * Hooks déclarés avec leurs métadonnées optionnelles.
     * Utilisé pour la validation dev ET la découverte dynamique par les plugins.
     * @type {Map<string, Object>}
     */
    _knownHooks;

    /**
     * Profondeur d'appel courante (protège contre la récursion infinie).
     * Incrémenté à chaque doAction/applyFilters, décrémenté en sortie.
     * @type {number}
     */
    _depth = 0;

    /**
     * Profondeur maximale autorisée avant de couper la chaîne.
     * @type {number}
     */
    _maxDepth = 10;

    /**
     * Contexte d'exécution courant.
     * null = action utilisateur (défaut), 'automation' = workflow, 'sync' = sync multi-onglet.
     * Permet aux plugins de décider s'ils doivent réagir à un hook.
     * @type {string|null}
     */
    _context = null;

    constructor() {
        this._actions = new Map();
        this._filters = new Map();
        this._knownHooks = new Map();
    }

    // ---------------------------------------------------------------
    // Déclaration de hooks
    // ---------------------------------------------------------------

    /**
     * Déclare un hook comme valide, avec des métadonnées optionnelles.
     *
     * En mode dev, addAction/addFilter émettent un warning si le hook
     * n'a pas été déclaré via cette méthode.
     *
     * Les métadonnées sont libres. Convention utilisée par les plugins :
     *   - label    {string}  : nom lisible du hook
     *   - category {string}  : catégorie (Board, Cartes, Notes...)
     *   - notification {Object} : config pour les notifications
     *     - type     {string}  : success, error, warning, info
     *     - duration {number}  : durée en ms (optionnel)
     *     - template {string}  : message avec {variables}
     *     - variables {Object<string, string>} : { varName: 'dot.path' }
     *
     * @param {string} hookName - Nom du hook à enregistrer
     * @param {Object} [meta={}] - Métadonnées associées au hook
     */
    registerHook(hookName, meta = {}) {
        this._knownHooks.set(hookName, meta);
    }

    /**
     * Retourne les métadonnées d'un hook, ou null si le hook n'est pas enregistré.
     *
     * @param {string} hookName
     * @returns {Object|null}
     */
    getHookMeta(hookName) {
        return this._knownHooks.get(hookName) ?? null;
    }

    /**
     * Retourne une copie de tous les hooks enregistrés avec leurs métadonnées.
     * Permet la découverte dynamique par les plugins consommateurs.
     *
     * @returns {Map<string, Object>}
     */
    getRegisteredHooks() {
        return new Map(this._knownHooks);
    }

    /**
     * Émet un warning en mode dev si le hook n'a pas été déclaré.
     * Ne fait rien en production ni si aucun hook n'a été déclaré
     * (rétro-compatible avec les plugins qui n'utilisent pas registerHook).
     *
     * @param {string} hookName
     * @private
     */
    _warnIfUnknown(hookName) {
        if (import.meta.env.DEV && this._knownHooks.size > 0 && !this._knownHooks.has(hookName)) {
            console.warn(
                `HookRegistry : hook "${hookName}" inconnu. Hooks enregistrés :`,
                [...this._knownHooks.keys()].sort(),
            );
        }
    }

    // ---------------------------------------------------------------
    // Contexte d'exécution
    // ---------------------------------------------------------------

    /**
     * Exécute fn dans un contexte nommé.
     * Les plugins peuvent lire getContext() pour décider s'ils doivent réagir.
     *
     * @param {string} context - 'automation' | 'sync' | null
     * @param {Function} fn - Fonction à exécuter dans ce contexte
     * @returns {*} Résultat de fn
     */
    withContext(context, fn) {
        const prev = this._context;
        this._context = context;
        try {
            return fn();
        } finally {
            this._context = prev;
        }
    }

    /**
     * Retourne le contexte d'exécution courant.
     * null = action utilisateur, 'automation' = workflow, 'sync' = sync.
     *
     * @returns {string|null}
     */
    getContext() {
        return this._context;
    }

    // ---------------------------------------------------------------
    // Actions
    // ---------------------------------------------------------------

    /**
     * Enregistre un callback sur une action.
     *
     * @param {string}   hookName - Nom du hook (ex: 'card:created')
     * @param {Function} callback - Fonction appelée lors du doAction
     * @param {number}   priority - Priorité d'exécution (1 = prioritaire, 10 = défaut)
     */
    addAction(hookName, callback, priority = 10) {
        this._warnIfUnknown(hookName);
        if (!this._actions.has(hookName)) {
            this._actions.set(hookName, []);
        }
        this._actions.get(hookName).push({ callback, priority });
        this._actions.get(hookName).sort((a, b) => a.priority - b.priority);
    }

    /**
     * Retire un callback précédemment enregistré sur une action.
     *
     * @param {string}   hookName - Nom du hook
     * @param {Function} callback - Référence exacte du callback à retirer
     */
    removeAction(hookName, callback) {
        const list = this._actions.get(hookName);
        if (!list) return;
        this._actions.set(
            hookName,
            list.filter((entry) => entry.callback !== callback),
        );
    }

    /**
     * Déclenche une action : appelle tous les callbacks enregistrés
     * dans l'ordre de priorité croissante.
     *
     * Protégé contre la récursion infinie : si la profondeur d'appel
     * dépasse _maxDepth, le hook est ignoré et une erreur est loguée.
     *
     * @param {string} hookName - Nom du hook
     * @param {...*}   args     - Arguments transmis aux callbacks
     */
    doAction(hookName, ...args) {
        this._depth++;
        if (this._depth > this._maxDepth) {
            const error = new Error(
                `HookRegistry : récursion infinie détectée ! ` +
                    `Profondeur max (${this._maxDepth}) atteinte pour "${hookName}". ` +
                    `Un plugin déclenche probablement ce hook dans son propre callback.`,
            );
            console.error(error);
            this._depth--;
            return;
        }
        try {
            const list = this._actions.get(hookName);
            if (!list) return;
            for (const entry of list) {
                try {
                    entry.callback(...args);
                } catch (err) {
                    console.error(`HookRegistry : un callback de l'action "${hookName}" a planté.`, err);
                }
            }
        } finally {
            this._depth--;
        }
    }

    // ---------------------------------------------------------------
    // Filters
    // ---------------------------------------------------------------

    /**
     * Enregistre un callback sur un filter.
     *
     * @param {string}   hookName - Nom du hook (ex: 'card:beforeRender')
     * @param {Function} callback - Reçoit (value, ...args), doit retourner la valeur transformée
     * @param {number}   priority - Priorité d'exécution (1 = prioritaire, 10 = défaut)
     */
    addFilter(hookName, callback, priority = 10) {
        this._warnIfUnknown(hookName);
        if (!this._filters.has(hookName)) {
            this._filters.set(hookName, []);
        }
        this._filters.get(hookName).push({ callback, priority });
        this._filters.get(hookName).sort((a, b) => a.priority - b.priority);
    }

    /**
     * Retire un callback précédemment enregistré sur un filter.
     *
     * @param {string}   hookName - Nom du hook
     * @param {Function} callback - Référence exacte du callback à retirer
     */
    removeFilter(hookName, callback) {
        const list = this._filters.get(hookName);
        if (!list) return;
        this._filters.set(
            hookName,
            list.filter((entry) => entry.callback !== callback),
        );
    }

    /**
     * Applique un pipeline de filters : chaque callback reçoit la valeur
     * retournée par le précédent, plus les arguments supplémentaires.
     *
     * Protégé contre la récursion infinie : si la profondeur d'appel
     * dépasse _maxDepth, le filter est ignoré et une erreur est loguée.
     *
     * @param {string} hookName - Nom du hook
     * @param {*}      value    - Valeur initiale à transformer
     * @param {...*}   args     - Arguments supplémentaires transmis à chaque callback
     * @returns {*} La valeur finale après passage dans tous les callbacks
     */
    applyFilters(hookName, value, ...args) {
        this._depth++;
        if (this._depth > this._maxDepth) {
            const error = new Error(
                `HookRegistry : récursion infinie détectée ! ` +
                    `Profondeur max (${this._maxDepth}) atteinte pour "${hookName}". ` +
                    `Un plugin déclenche probablement ce hook dans son propre callback.`,
            );
            console.error(error);
            this._depth--;
            return value;
        }
        try {
            const list = this._filters.get(hookName);
            if (!list) return value;
            let result = value;
            for (const entry of list) {
                try {
                    result = entry.callback(result, ...args);
                } catch (err) {
                    console.error(
                        `HookRegistry : un callback du filtre "${hookName}" a planté. La valeur courante est conservée.`,
                        err,
                    );
                }
            }
            return result;
        } finally {
            this._depth--;
        }
    }
}

import Container from '../Container.js';

const hookRegistry = new HookRegistry();
Container.set('HookRegistry', hookRegistry);

export { HookRegistry };
export default hookRegistry;
