/**
 * CustomFieldsPlugin — Champs personnalises par board.
 *
 * Permet de definir des champs personnalises (texte, nombre, date,
 * liste, checkbox, URL) au niveau d'un board, puis de remplir ces
 * champs pour chaque carte.
 *
 * Stockage : board.pluginData['custom-fields']
 *   {
 *     fields: [{ id, label, type, config, showOnCard, order }],
 *     values: { cardId: { fieldId: value } }
 *   }
 *
 * Hooks utilises :
 *   - board:didChange            : charge fields + values
 *   - board:willChange           : cleanup observer + state
 *   - board:rendered             : MutationObserver + badges sur cartes
 *   - modal:addCard:opened       : tab "Champs" (formulaire vide)
 *   - modal:editCard:opened      : tab "Champs" (formulaire pre-rempli)
 *   - modal:cardDetail:renderContent : section apres InfoPanel
 *   - card:deleted               : cleanup values
 */

import FieldTypeRegistry from '../../lib/FieldTypeRegistry.js';
import Hooks from '../../HookRegistry.js';
import { generateId } from '../../../utils/id.js';

/** @type {string} Cle dans board.pluginData */
const PLUGIN_DATA_KEY = 'custom-fields';

/**
 * Version du schema de donnees.
 *
 * Incrementer a chaque changement de structure et ajouter un cas
 * dans _migrateData() pour migrer depuis la version precedente.
 *
 * Historique :
 *   1 — Format initial : { version, fields[], values{} }
 *
 * @type {number}
 */
const SCHEMA_VERSION = 1;

/**
 * Genere un identifiant unique pour un champ.
 *
 * @returns {string}
 */
function generateFieldId() {
    return generateId('cf');
}

export default {
    // ---------------------------------------------------------------
    // Etat interne
    // ---------------------------------------------------------------

    /** @type {import('../../../models/Board.js').default|null} */
    _board: null,

    /** @type {Array<{ id: string, label: string, type: string, config: Object, showOnCard: boolean, order: number }>} */
    _fields: [],

    /** @type {Object<string, Object<string, *>>} cardId → { fieldId: value } */
    _values: {},

    /** @type {MutationObserver|null} */
    _boardObserver: null,

    /** @type {Array<{ hookName: string, callback: Function }>} Pour uninstall auto */
    _registeredHooks: [],

    // ---------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------

    /**
     * Installe le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        this._registeredHooks = [];

        if (typeof this._injectStyles === 'function') {
            this._injectStyles();
        }

        this._listen(hooks, 'board:didChange', ({ board }) => this._onBoardDidChange(board));
        this._listen(hooks, 'board:willChange', () => this._onBoardWillChange());
        this._listen(hooks, 'board:rendered', ({ element }) => this._onBoardRendered(element));
        this._listen(hooks, 'modal:addCard:opened', (ctx) => this._onModalAddCard(ctx));
        this._listen(hooks, 'modal:editCard:opened', (ctx) => this._onModalEditCard(ctx));
        this._listen(hooks, 'modal:cardDetail:renderContent', (ctx) => this._onCardDetailRender(ctx));
        this._listen(hooks, 'card:deleted', ({ card }) => this._onCardDeleted(card));
    },

    /**
     * Desinstalle le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        this._onBoardWillChange();

        for (const { hookName, callback } of this._registeredHooks) {
            hooks.removeAction(hookName, callback);
        }
        this._registeredHooks = [];
        this._board = null;
    },

    /**
     * Enregistre un hook et le track pour uninstall automatique.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     * @param {string} hookName
     * @param {Function} callback
     * @private
     */
    _listen(hooks, hookName, callback) {
        hooks.addAction(hookName, callback);
        this._registeredHooks.push({ hookName, callback });
    },

    // ---------------------------------------------------------------
    // Handlers de hooks
    // ---------------------------------------------------------------

    /**
     * Board charge : lire les donnees du plugin.
     *
     * @param {import('../../../models/Board.js').default} board
     * @private
     */
    _onBoardDidChange(board) {
        this._board = board;
        this._loadData();
    },

    /**
     * Avant switch de board : cleanup observer et state.
     *
     * @private
     */
    _onBoardWillChange() {
        if (this._boardObserver) {
            this._boardObserver.disconnect();
            this._boardObserver = null;
        }

        this._fields = [];
        this._values = {};

        document.querySelectorAll('.cfp-badges').forEach((el) => el.remove());
    },

    /**
     * Board rendu dans le DOM : setup observer + badges.
     *
     * @param {HTMLElement} element
     * @private
     */
    _onBoardRendered(element) {
        this._setupBoardObserver(element);
        this._processAllCards();
    },

    /**
     * Carte supprimee : nettoie ses values.
     *
     * @param {import('../../../models/Card.js').default} card
     * @private
     */
    _onCardDeleted(card) {
        if (this._values[card.id]) {
            delete this._values[card.id];
            this._saveData();
        }
    },

    // ---------------------------------------------------------------
    // Persistance
    // ---------------------------------------------------------------

    /**
     * Charge les fields et values depuis board.pluginData.
     * Migre les donnees si la version stockee est inferieure a SCHEMA_VERSION.
     *
     * @private
     */
    _loadData() {
        if (!this._board) {
            this._fields = [];
            this._values = {};
            return;
        }

        const raw = this._board.pluginData[PLUGIN_DATA_KEY] || {};
        const data = this._migrateData(raw);

        this._fields = data.fields || [];
        this._values = data.values || {};
    },

    /**
     * Migre les donnees depuis un ancien format vers SCHEMA_VERSION.
     *
     * Chaque version ajoute un `case` qui transforme le format
     * de la version N vers N+1, puis tombe dans le case suivant
     * (fall-through) jusqu'a atteindre la version courante.
     *
     * @param {Object} data - Donnees brutes lues depuis pluginData
     * @returns {Object} Donnees au format SCHEMA_VERSION
     * @private
     */
    _migrateData(data) {
        const version = data.version || 0;

        if (version >= SCHEMA_VERSION) return data;

        // Copie pour ne pas muter l'original dans pluginData
        const migrated = { ...data };

        switch (version) {
            case 0:
                // v0 → v1 : ajout du champ version (format inchange)
                migrated.version = 1;
            // falls through (pour les futures migrations v1→v2, etc.)

            // case 1:
            //     migrated.version = 2;
            //     ... transformer le format ...
            // falls through
        }

        // Persiste la migration
        if (this._board) {
            this._board.setPluginData(PLUGIN_DATA_KEY, migrated);
        }

        return migrated;
    },

    /**
     * Sauvegarde les fields et values dans board.pluginData.
     *
     * @private
     */
    _saveData() {
        if (!this._board) return;

        this._board.setPluginData(PLUGIN_DATA_KEY, {
            version: SCHEMA_VERSION,
            fields: [...this._fields],
            values: { ...this._values },
        });
    },

    // ---------------------------------------------------------------
    // API publique (utilisee par settingsPanel)
    // ---------------------------------------------------------------

    /**
     * Retourne la liste des champs definis.
     *
     * @returns {Array<{ id: string, label: string, type: string, config: Object, showOnCard: boolean, order: number }>}
     */
    getFields() {
        return this._fields;
    },

    /**
     * Ajoute un nouveau champ.
     *
     * @param {string} label - Nom du champ
     * @param {string} type - Type (text, number, date, select, checkbox, url)
     * @param {Object} [config={}] - Configuration specifique au type
     * @returns {Object} Le champ cree
     */
    addField(label, type, config = {}) {
        const field = {
            id: generateFieldId(),
            label,
            type,
            config,
            showOnCard: true,
            order: this._fields.length,
        };
        this._fields.push(field);
        this._saveData();
        this._refreshAllBadges();
        return field;
    },

    /**
     * Met a jour un champ existant.
     *
     * Si c'est un champ select et que les options changent, les valeurs
     * des cartes qui referencent des options supprimees sont purgees.
     *
     * @param {string} id - ID du champ
     * @param {Object} updates - Proprietes a mettre a jour
     */
    updateField(id, updates) {
        const field = this._fields.find((f) => f.id === id);
        if (!field) return;

        // Purge des valeurs orphelines pour les champs select
        if (field.type === 'select' && updates.config?.options) {
            const newOptions = new Set(updates.config.options);
            this._purgeOrphanedSelectValues(id, newOptions);
        }

        Object.assign(field, updates);
        this._saveData();
        this._refreshAllBadges();
    },

    /**
     * Supprime un champ. Les values orphelines restent (ignorees).
     *
     * @param {string} id - ID du champ
     */
    removeField(id) {
        this._fields = this._fields.filter((f) => f.id !== id);
        this._saveData();
        this._refreshAllBadges();
    },

    /**
     * Purge les valeurs des cartes qui referencent des options supprimees
     * d'un champ select. Appele lors de la mise a jour des options.
     *
     * @param {string} fieldId - ID du champ select
     * @param {Set<string>} validOptions - Ensemble des options encore valides
     * @private
     */
    _purgeOrphanedSelectValues(fieldId, validOptions) {
        for (const cardId of Object.keys(this._values)) {
            const cardValues = this._values[cardId];
            if (cardValues[fieldId] !== undefined && cardValues[fieldId] !== null) {
                if (!validOptions.has(cardValues[fieldId])) {
                    delete cardValues[fieldId];

                    // Supprime l'entree carte si plus aucune valeur
                    if (Object.keys(cardValues).length === 0) {
                        delete this._values[cardId];
                    }
                }
            }
        }
        // Pas de _saveData ni _refreshAllBadges ici :
        // updateField() s'en charge juste apres l'appel.
    },

    // ---------------------------------------------------------------
    // MutationObserver + badges sur cartes
    // ---------------------------------------------------------------

    /**
     * Configure le MutationObserver pour detecter les nouvelles cartes.
     *
     * @param {HTMLElement} boardEl
     * @private
     */
    _setupBoardObserver(boardEl) {
        if (this._boardObserver) {
            this._boardObserver.disconnect();
        }

        this._boardObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;

                    if (node.classList.contains('card') && node.dataset.id) {
                        this._processCard(node);
                    }

                    const nested = node.querySelectorAll('.card[data-id]');
                    nested.forEach((el) => this._processCard(el));
                }
            }
        });

        this._boardObserver.observe(boardEl, { childList: true, subtree: true });
    },

    /**
     * Traite toutes les cartes actuellement dans le DOM.
     *
     * @private
     */
    _processAllCards() {
        document.querySelectorAll('.card[data-id]').forEach((el) => {
            this._processCard(el);
        });
    },

    /**
     * Traite une carte : met a jour ou cree les badges.
     *
     * @param {HTMLElement} cardElement
     * @private
     */
    _processCard(cardElement) {
        const cardId = cardElement.dataset.id;
        this._updateBadges(cardElement, cardId);
    },

    /**
     * Met a jour les badges de champs personnalises sur une carte.
     *
     * @param {HTMLElement} cardElement
     * @param {string} cardId
     * @private
     */
    _updateBadges(cardElement, cardId) {
        // Retire les badges existants
        const existing = cardElement.querySelector('.cfp-badges');
        if (existing) existing.remove();

        // Champs a afficher
        const visibleFields = this._fields.filter((f) => f.showOnCard);
        if (visibleFields.length === 0) return;

        const cardValues = this._values[cardId] || {};

        // Ne cree le container que s'il y a au moins une valeur non vide
        const badgeData = [];
        for (const field of visibleFields) {
            const value = cardValues[field.id];
            if (value === undefined || value === null || value === '') continue;

            const typeDef = FieldTypeRegistry.get(field.type);
            if (!typeDef) continue;

            const formatted = typeDef.format ? typeDef.format(value, field.config) : String(value);
            if (!formatted) continue;

            badgeData.push({ label: field.label, value: formatted });
        }

        if (badgeData.length === 0) return;

        const container = document.createElement('div');
        container.className = 'cfp-badges';

        for (const { label, value } of badgeData) {
            const badge = document.createElement('span');
            badge.className = 'cfp-badge';

            const labelEl = document.createElement('span');
            labelEl.className = 'cfp-badge-label';
            labelEl.textContent = label;

            const valueEl = document.createElement('span');
            valueEl.className = 'cfp-badge-value';
            valueEl.textContent = value;

            badge.append(labelEl, valueEl);
            container.appendChild(badge);
        }

        cardElement.appendChild(container);
    },

    /**
     * Rafraichit les badges de toutes les cartes.
     *
     * @private
     */
    _refreshAllBadges() {
        this._processAllCards();
    },

    // ---------------------------------------------------------------
    // Modal : ajouter une carte
    // ---------------------------------------------------------------

    /**
     * Hook modal:addCard:opened — ajoute l'onglet "Champs".
     * Enregistre un hook temporaire card:created pour sauver les values.
     *
     * @param {{ addTab: Function, onClose: Function }} ctx
     * @private
     */
    _onModalAddCard({ addTab, onClose }) {
        if (this._fields.length === 0) return;

        const panel = addTab('Champs', { order: 5 });
        const editors = this._buildFieldsForm(panel, {});

        // Hook temporaire pour sauver les values a la creation
        const onCardCreated = ({ card }) => {
            const { values, hasValues } = this._collectEditorValues(editors);
            if (hasValues) {
                this._values[card.id] = values;
                this._saveData();
            }
        };

        Hooks.addAction('card:created', onCardCreated);

        if (onClose) {
            onClose(() => {
                // Cleanup editors
                for (const editor of editors) {
                    if (editor.destroy) editor.destroy();
                }
                // Retire le hook temporaire
                Hooks.removeAction('card:created', onCardCreated);
            });
        }
    },

    // ---------------------------------------------------------------
    // Modal : editer une carte
    // ---------------------------------------------------------------

    /**
     * Hook modal:editCard:opened — ajoute l'onglet "Champs" pre-rempli.
     *
     * @param {{ cardId: string, addTab: Function, onClose: Function }} ctx
     * @private
     */
    _onModalEditCard({ cardId, addTab, onClose }) {
        if (this._fields.length === 0) return;

        const panel = addTab('Champs', { order: 5 });
        const currentValues = this._values[cardId] || {};
        const editors = this._buildFieldsForm(panel, currentValues);

        if (onClose) {
            onClose(() => {
                // Collecte les nouvelles valeurs
                const { values: newValues, hasValues } = this._collectEditorValues(editors);

                // Compare avec les valeurs precedentes
                const prevJson = JSON.stringify(currentValues);
                const newJson = JSON.stringify(hasValues ? newValues : {});

                if (prevJson !== newJson) {
                    if (hasValues) {
                        this._values[cardId] = newValues;
                    } else {
                        delete this._values[cardId];
                    }
                    this._saveData();
                    this._refreshAllBadges();
                }

                // Cleanup editors
                for (const editor of editors) {
                    if (editor.destroy) editor.destroy();
                }
            });
        }
    },

    // ---------------------------------------------------------------
    // Card Detail
    // ---------------------------------------------------------------

    /**
     * Hook modal:cardDetail:renderContent — section champs apres InfoPanel.
     * Utilise Promise.resolve().then() pour injecter APRES le contenu standard
     * (le hook fire avant InfoPanel.build, mais celui-ci est synchrone).
     *
     * @param {{ card: import('../../../models/Card.js').default, panel: HTMLElement }} ctx
     * @private
     */
    _onCardDetailRender({ card, panel }) {
        if (this._fields.length === 0) return;

        // Microtask pour injecter APRES le contenu standard (InfoPanel.build est synchrone)
        Promise.resolve().then(() => {
            const cardValues = this._values[card.id] || {};

            // Verifie qu'il y a au moins une valeur a afficher
            const hasAnyValue = this._fields.some((f) => {
                const v = cardValues[f.id];
                return v !== undefined && v !== null && v !== '';
            });

            if (!hasAnyValue) return;

            // Separateur
            const separator = document.createElement('hr');
            separator.className = 'cfp-detail-separator';
            panel.appendChild(separator);

            // Titre
            const title = document.createElement('h4');
            title.className = 'cfp-detail-title';
            title.textContent = 'Champs personnalises';
            panel.appendChild(title);

            // Champs
            for (const field of this._fields) {
                const value = cardValues[field.id];
                if (value === undefined || value === null || value === '') continue;

                const typeDef = FieldTypeRegistry.get(field.type);
                if (!typeDef) continue;

                const fieldDiv = document.createElement('div');
                fieldDiv.className = 'cfp-detail-field';

                const labelEl = document.createElement('div');
                labelEl.className = 'cfp-detail-field-label';
                labelEl.textContent = field.label;

                const valueEl = document.createElement('div');
                valueEl.className = 'cfp-detail-field-value';

                // Utilise renderDisplay si disponible (ex: URL = lien cliquable)
                if (typeDef.renderDisplay) {
                    typeDef.renderDisplay(valueEl, value, field.config);
                } else {
                    valueEl.textContent = typeDef.format ? typeDef.format(value, field.config) : String(value);
                }

                fieldDiv.append(labelEl, valueEl);
                panel.appendChild(fieldDiv);
            }
        });
    },

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    /**
     * Collecte les valeurs non-default depuis les editeurs.
     * Ignore les valeurs egal au default du type, vides, null ou undefined.
     *
     * @param {Array<{ fieldId: string, type: string, getValue: Function }>} editors
     * @returns {{ values: Object<string, *>, hasValues: boolean }}
     * @private
     */
    _collectEditorValues(editors) {
        const values = {};
        let hasValues = false;
        for (const editor of editors) {
            const val = editor.getValue();
            const typeDef = FieldTypeRegistry.get(editor.type);
            const defaultVal = typeDef ? typeDef.defaultValue : null;
            if (val !== defaultVal && val !== '' && val !== null && val !== undefined) {
                values[editor.fieldId] = val;
                hasValues = true;
            }
        }
        return { values, hasValues };
    },

    /**
     * Construit le formulaire de champs dans un container (modale add/edit).
     * Retourne un tableau d'editeurs avec getValue/destroy.
     *
     * @param {HTMLElement} container
     * @param {Object<string, *>} currentValues - fieldId → value
     * @returns {Array<{ fieldId: string, type: string, getValue: Function, destroy: Function }>}
     * @private
     */
    _buildFieldsForm(container, currentValues) {
        const form = document.createElement('div');
        form.className = 'cfp-fields-form';

        const editors = [];

        for (const field of this._fields) {
            const typeDef = FieldTypeRegistry.get(field.type);
            if (!typeDef) continue;

            const group = document.createElement('div');
            group.className = 'cfp-field-group';

            // Label avec icone
            const label = document.createElement('div');
            label.className = 'cfp-field-label';

            const icon = document.createElement('span');
            icon.className = 'cfp-field-label-icon';
            icon.textContent = typeDef.icon;

            const labelText = document.createElement('span');
            labelText.textContent = field.label;

            label.append(icon, labelText);
            group.appendChild(label);

            // Zone de saisie
            const inputContainer = document.createElement('div');
            group.appendChild(inputContainer);

            const currentValue = currentValues[field.id] ?? typeDef.defaultValue;

            const editor = typeDef.renderEdit(inputContainer, currentValue, field.config, () => {
                /* onChange — valeur lue via editor.getValue() */
            });

            editors.push({
                fieldId: field.id,
                type: field.type,
                getValue: () => editor.getValue(),
                destroy: editor.destroy || (() => {}),
            });

            form.appendChild(group);
        }

        container.appendChild(form);
        return editors;
    },
};
