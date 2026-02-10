/**
 * WorkflowPlugin — Moteur de règles d'automatisation.
 *
 * Permet à l'utilisateur de créer des règles JavaScript qui s'exécutent
 * quand un hook se déclenche (carte déplacée, créée, supprimée, modifiée).
 *
 * Architecture :
 *   - Les règles sont stockées dans board.pluginData['workflow-engine']
 *   - Chaque règle écoute un hook (trigger) et exécute du code utilisateur
 *   - Le code reçoit ctx (payload sanitizé), actions (API mutation), board (read-only)
 *   - L'exécution se fait dans le contexte 'automation' pour éviter les boucles
 *
 * Flux :
 *   install → _loadRules → _compileAll → _subscribeAll
 *   hook fire → _onHookFired → filtre contexte → évalue règles
 *   règle éditée → _saveRules → _unsubscribeAll → _compileAll → _subscribeAll
 *
 * @see RuleEngine.js pour la compilation/exécution
 * @see triggerDefs.js pour les triggers disponibles
 * @see actionFactory.js pour l'API actions
 */
import Container from '../../../Container.js';
import { buildTriggerList, getTriggerDef } from './triggerDefs.js';
import { compileRule, executeRule } from './RuleEngine.js';
import { buildActions } from './actionFactory.js';
import { buildRuleListPanel } from './RuleListPanel.js';
import { generateId } from '../../../utils/id.js';

/** @type {string} Clé dans board.pluginData */
const PLUGIN_DATA_KEY = 'workflow-engine';

export default class WorkflowPlugin {
    /**
     * Référence au HookRegistry.
     * @type {import('../../HookRegistry.js').default|null}
     */
    _hooksRegistry = null;

    /**
     * Référence au Board courant.
     * @type {import('../../../models/Board.js').default|null}
     */
    _board = null;

    /**
     * Liste des règles (données brutes).
     * @type {Array<{ id: string, name: string, enabled: boolean, trigger: string, code: string }>}
     */
    _rules = [];

    /**
     * Map ruleId → Function compilée (uniquement les règles enabled).
     * @type {Map<string, Function>}
     */
    _compiledRules = new Map();

    /**
     * Map hookName → handler bound (pour removeAction à l'unsubscribe).
     * @type {Map<string, Function>}
     */
    _hookHandlers = new Map();

    /**
     * Map ruleId → dernière erreur d'exécution (ou null si OK).
     * @type {Map<string, Error|null>}
     */
    _ruleErrors = new Map();

    /**
     * Handlers pour cleanup à l'uninstall.
     * @type {Object}
     */
    _handlers = {
        onBoardWillChange: null,
        onBoardRendered: null,
        onSettingsOpened: null,
    };

    // ---------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------

    /**
     * Installe le plugin. Appelé par PluginManager.register().
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        this._hooksRegistry = hooks;

        if (typeof this._injectStyles === 'function') {
            this._injectStyles();
        }

        // Cleanup avant switch de board
        this._handlers.onBoardWillChange = () => this._resetBoardState();
        hooks.addAction('board:willChange', this._handlers.onBoardWillChange);

        // Charger les règles au rendu du board
        this._handlers.onBoardRendered = ({ board }) => {
            this._board = board;
            this._loadRules();
            this._compileAll();
            this._subscribeAll();
        };
        hooks.addAction('board:rendered', this._handlers.onBoardRendered);

        // Onglet "Règles" dans les settings du board
        this._handlers.onSettingsOpened = ({ registerTab, board }) => {
            if (!this._board || this._board !== board) {
                this._board = board;
                this._loadRules();
            }
            registerTab('workflow', 'Règles', (panel) => {
                buildRuleListPanel(panel, this);
            });
        };
        hooks.addAction('modal:boardSettings:opened', this._handlers.onSettingsOpened);
    }

    /**
     * Désinstalle le plugin. Appelé par PluginManager.unregister() ou disable().
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        this._resetBoardState();

        if (this._handlers.onBoardWillChange) {
            hooks.removeAction('board:willChange', this._handlers.onBoardWillChange);
        }
        if (this._handlers.onBoardRendered) {
            hooks.removeAction('board:rendered', this._handlers.onBoardRendered);
        }
        if (this._handlers.onSettingsOpened) {
            hooks.removeAction('modal:boardSettings:opened', this._handlers.onSettingsOpened);
        }

        this._hooksRegistry = null;
    }

    /**
     * Remet à zéro l'état lié au board courant.
     * Appelé lors du switch de board et dans uninstall().
     *
     * @private
     */
    _resetBoardState() {
        this._unsubscribeAll();
        this._board = null;
        this._rules = [];
        this._compiledRules.clear();
        this._ruleErrors.clear();
    }

    // ---------------------------------------------------------------
    // Rules management
    // ---------------------------------------------------------------

    /**
     * Charge les règles depuis board.pluginData.
     * @private
     */
    _loadRules() {
        const data = this._board.pluginData[PLUGIN_DATA_KEY];
        this._rules = data && Array.isArray(data.rules) ? data.rules : [];
    }

    /**
     * Sauvegarde les règles dans board.pluginData et déclenche une persistence.
     * @private
     */
    async _saveRules() {
        this._board.setPluginData(PLUGIN_DATA_KEY, { rules: this._rules });

        // Force un save immédiat (pas seulement via auto-save debounced)
        await Container.get('BoardService').save();
    }

    /**
     * Compile toutes les règles enabled en Functions exécutables.
     * Les erreurs de syntaxe sont stockées dans _ruleErrors.
     * @private
     */
    _compileAll() {
        this._compiledRules.clear();

        for (const rule of this._rules) {
            if (!rule.enabled) continue;

            try {
                const fn = compileRule(rule);
                this._compiledRules.set(rule.id, fn);
                this._ruleErrors.set(rule.id, null);
            } catch (err) {
                console.warn(`Workflow : erreur de compilation dans "${rule.name}"`, err);
                this._ruleErrors.set(rule.id, err);
            }
        }
    }

    /**
     * Enregistre un handler pour chaque trigger utilisé par au moins une règle.
     * @private
     */
    _subscribeAll() {
        // Collecter les triggers uniques des règles enabled
        const triggersUsed = new Set();
        for (const rule of this._rules) {
            if (rule.enabled) {
                triggersUsed.add(rule.trigger);
            }
        }

        for (const hookName of triggersUsed) {
            const handler = (payload) => this._onHookFired(hookName, payload);
            this._hookHandlers.set(hookName, handler);
            this._hooksRegistry.addAction(hookName, handler);
        }
    }

    /**
     * Retire tous les handlers de hooks enregistrés par _subscribeAll.
     * @private
     */
    _unsubscribeAll() {
        if (!this._hooksRegistry) return;

        for (const [hookName, handler] of this._hookHandlers) {
            this._hooksRegistry.removeAction(hookName, handler);
        }
        this._hookHandlers.clear();
    }

    // ---------------------------------------------------------------
    // Hook handler
    // ---------------------------------------------------------------

    /**
     * Appelé quand un hook écouté fire.
     * Filtre le contexte (skip si pas user), sanitize le payload,
     * puis évalue toutes les règles qui matchent ce trigger.
     *
     * @param {string} hookName - Nom du hook qui a fire
     * @param {Object} payload - Payload brut du hook (instances model)
     * @private
     */
    _onHookFired(hookName, payload) {
        // Pas de board chargé → rien à faire (peut arriver entre install et board:rendered)
        if (!this._board) return;

        // Ne réagir qu'aux actions utilisateur (pas automation ni sync)
        if (this._hooksRegistry.getContext() !== null) return;

        const triggerDef = getTriggerDef(hookName);

        // Sanitize le payload en plain objects
        const ctx = triggerDef.sanitize(payload);
        const actions = this._buildActions();
        const boardInfo = this._buildBoardInfo();

        // Évaluer chaque règle qui matche ce trigger
        for (const rule of this._rules) {
            if (!rule.enabled || rule.trigger !== hookName) continue;

            const compiledFn = this._compiledRules.get(rule.id);
            if (!compiledFn) continue;

            // Exécuter dans le contexte 'automation' pour éviter les re-triggers
            this._hooksRegistry.withContext('automation', () => {
                const result = executeRule(compiledFn, ctx, actions, boardInfo);

                if (result.ok) {
                    this._ruleErrors.set(rule.id, null);
                    this._hooksRegistry.doAction('workflow:ruleTriggered', { rule, trigger: hookName });
                } else {
                    console.warn(`Workflow : erreur dans "${rule.name}"`, result.error);
                    this._ruleErrors.set(rule.id, result.error);
                    this._hooksRegistry.doAction('workflow:ruleError', {
                        rule,
                        error: result.error,
                        trigger: hookName,
                    });
                }
            });
        }
    }

    // ---------------------------------------------------------------
    // Actions factory
    // ---------------------------------------------------------------

    /**
     * Construit l'objet actions injecté dans le code utilisateur.
     *
     * @returns {Object} API de mutation
     * @private
     */
    _buildActions() {
        return buildActions(this._hooksRegistry, this._board);
    }

    // ---------------------------------------------------------------
    // Board info (read-only)
    // ---------------------------------------------------------------

    /**
     * Construit un snapshot read-only du board pour le code utilisateur.
     *
     * @returns {{ name: string, columns: Array<{ id: string, title: string, cardCount: number }> }}
     * @private
     */
    _buildBoardInfo() {
        return {
            name: this._board.name,
            columns: this._board.columns.map((col) => ({
                id: col.id,
                title: col.title,
                cardCount: col.count,
            })),
        };
    }

    // ---------------------------------------------------------------
    // API publique (utilisée par RuleListPanel / RuleEditor)
    // ---------------------------------------------------------------

    /** @returns {Array} Copie des règles */
    getRules() {
        return [...this._rules];
    }

    /** @returns {Array} Définitions de triggers disponibles (découverte dynamique) */
    getTriggers() {
        return buildTriggerList(this._hooksRegistry);
    }

    /**
     * Retourne la dernière erreur d'exécution d'une règle.
     *
     * @param {string} ruleId
     * @returns {Error|null}
     */
    getRuleError(ruleId) {
        return this._ruleErrors.get(ruleId) || null;
    }

    /**
     * Ajoute ou met à jour une règle, puis recompile et ré-enregistre les handlers.
     *
     * @param {Object} ruleData - Données de la règle
     * @param {string} ruleData.id
     * @param {string} ruleData.name
     * @param {boolean} ruleData.enabled
     * @param {string} ruleData.trigger
     * @param {string} ruleData.code
     */
    saveRule(ruleData) {
        const idx = this._rules.findIndex((r) => r.id === ruleData.id);
        if (idx !== -1) {
            this._rules[idx] = { ...ruleData };
        } else {
            this._rules.push({ ...ruleData });
        }

        this._saveRules();
        this._refresh();
    }

    /**
     * Supprime une règle par son id.
     *
     * @param {string} ruleId
     */
    deleteRule(ruleId) {
        this._rules = this._rules.filter((r) => r.id !== ruleId);
        this._ruleErrors.delete(ruleId);

        this._saveRules();
        this._refresh();
    }

    /**
     * Active ou désactive une règle.
     *
     * @param {string} ruleId
     * @param {boolean} enabled
     */
    toggleRule(ruleId, enabled) {
        const rule = this._rules.find((r) => r.id === ruleId);
        if (!rule) return;

        rule.enabled = enabled;
        this._saveRules();
        this._refresh();
    }

    /**
     * Recompile toutes les règles et ré-enregistre les handlers.
     * Appelé après toute modification de règle.
     * @private
     */
    _refresh() {
        this._unsubscribeAll();
        this._compileAll();
        this._subscribeAll();
    }

    /**
     * Génère un identifiant unique pour une nouvelle règle.
     *
     * @returns {string} Ex: "rule-a1b2c3d4"
     */
    generateRuleId() {
        return generateId('rule');
    }
}
