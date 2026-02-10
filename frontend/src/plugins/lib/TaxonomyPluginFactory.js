/**
 * TaxonomyPluginFactory — Factory pour creer des plugins de taxonomies.
 *
 * Permet de creer facilement un plugin qui ajoute une nouvelle taxonomie
 * (complexite, categorie, sprint, etc.) sans ecrire de code boilerplate.
 *
 * Le plugin genere :
 *   - Enregistre la taxonomie dans TaxonomyService a l'install
 *   - La retire a l'uninstall
 *   - Persiste les termes personnalises dans localStorage (optionnel)
 *   - Fournit un settingsPanel pour gerer les termes (optionnel)
 *
 * Usage :
 *
 *   import { createTaxonomyPlugin } from '../../lib/TaxonomyPluginFactory.js';
 *
 *   export default createTaxonomyPlugin({
 *       name: 'complexity-taxonomy',
 *       label: 'Complexite',
 *       taxonomyKey: 'complexity',
 *       taxonomyLabel: 'Complexite',
 *       defaultTerms: {
 *           simple:  { label: 'Simple',   color: '#44bb44' },
 *           medium:  { label: 'Moyenne',  color: '#ffaa00' },
 *           complex: { label: 'Complexe', color: '#ff4444' },
 *       },
 *       allowCustomTerms: true,  // Permet d'ajouter/supprimer des termes
 *   });
 */
import TaxonomyService from '../../services/TaxonomyService.js';
import StorageService from '../../services/StorageService.js';
import { TAXONOMY_SETTINGS_STYLES } from './taxonomySettingsStyles.js';

/** @type {HTMLStyleElement|null} Styles partages pour tous les plugins de taxonomie */
let sharedStyleEl = null;

/** @type {number} Nombre de plugins de taxonomie actifs (pour cleanup des styles) */
let activePluginCount = 0;

/**
 * Injecte les styles partages (une seule fois).
 */
function injectSharedStyles() {
    if (sharedStyleEl) return;
    sharedStyleEl = document.createElement('style');
    sharedStyleEl.textContent = TAXONOMY_SETTINGS_STYLES;
    document.head.appendChild(sharedStyleEl);
}

/**
 * Retire les styles partages si plus aucun plugin actif.
 */
function removeSharedStylesIfNeeded() {
    if (activePluginCount === 0 && sharedStyleEl) {
        sharedStyleEl.remove();
        sharedStyleEl = null;
    }
}

/**
 * Cree un plugin de taxonomie.
 *
 * @param {Object} config - Configuration du plugin
 * @param {string} config.name - Identifiant unique du plugin
 * @param {string} config.label - Label affiche dans la liste des plugins
 * @param {string} config.taxonomyKey - Cle de la taxonomie (ex: 'complexity')
 * @param {string} config.taxonomyLabel - Label de la taxonomie (ex: 'Complexite')
 * @param {Object<string, { label: string, color: string }>} config.defaultTerms - Termes par defaut
 * @param {boolean} [config.allowCustomTerms=false] - Autoriser la personnalisation des termes
 * @param {string[]} [config.tags=[]] - Tags pour classifier le plugin
 * @returns {Object} Plugin pret a l'emploi
 */
export function createTaxonomyPlugin(config) {
    const {
        name,
        label,
        taxonomyKey,
        taxonomyLabel,
        defaultTerms,
        allowCustomTerms = false,
        tags = ['taxonomie'],
    } = config;

    const STORAGE_KEY = `kanban:taxonomy:${taxonomyKey}`;

    // Pas de champ `priority` : les taxonomies utilisent la priorité par défaut (10).
    // Le fallback `?? 10` dans PluginManager.registerAll() couvre ce cas.
    return {
        name,
        label,
        tags,

        /** @type {Object<string, { label: string, color: string }>} */
        _terms: { ...defaultTerms },

        /** @type {Object<string, { label: string, color: string }>} */
        _defaultTerms: defaultTerms,

        /**
         * Installe le plugin : enregistre la taxonomie avec les termes par défaut,
         * puis charge les termes personnalisés en async et ré-enregistre.
         *
         * Double appel intentionnel à _registerTaxonomy() :
         *   1. Sync (ici) : enregistre immédiatement avec les defaults
         *      pour que les tags soient rendus dès le premier render.
         *   2. Async (_initAsync) : ré-enregistre avec les termes persistés
         *      une fois IndexedDB chargé.
         */
        install(_hooks) {
            this._registerTaxonomy();
            this._initAsync().catch((err) =>
                console.warn(`TaxonomyPlugin(${name}) : échec du chargement des termes`, err),
            );
            if (allowCustomTerms) {
                injectSharedStyles();
                activePluginCount++;
            }
        },

        /**
         * Charge les termes depuis IndexedDB et ré-enregistre la taxonomie.
         *
         * @returns {Promise<void>}
         * @private
         */
        async _initAsync() {
            await this._loadTerms();
            this._registerTaxonomy();
        },

        /**
         * Desinstalle le plugin : retire la taxonomie.
         */
        uninstall(_hooks) {
            TaxonomyService.unregisterTaxonomy(taxonomyKey);
            if (allowCustomTerms) {
                activePluginCount--;
                removeSharedStylesIfNeeded();
            }
        },

        // -----------------------------------------------------------
        // Persistence
        // -----------------------------------------------------------

        /**
         * Charge les termes depuis IndexedDB.
         * @returns {Promise<void>}
         * @private
         */
        async _loadTerms() {
            if (!allowCustomTerms) {
                this._terms = { ...defaultTerms };
                return;
            }

            this._terms = await StorageService.get(STORAGE_KEY, { ...defaultTerms });
        },

        /**
         * Sauvegarde les termes dans IndexedDB.
         * @returns {Promise<void>}
         * @private
         */
        async _saveTerms() {
            if (!allowCustomTerms) return;
            await StorageService.set(STORAGE_KEY, this._terms);
        },

        /** @private */
        _registerTaxonomy() {
            TaxonomyService.registerTaxonomy(taxonomyKey, {
                label: taxonomyLabel,
                terms: this._terms,
            });
        },

        // -----------------------------------------------------------
        // Gestion des termes (pour settingsPanel)
        // -----------------------------------------------------------

        /**
         * Ajoute un terme a la taxonomie.
         *
         * @param {string} key - Cle du terme
         * @param {string} termLabel - Label affiche
         * @param {string} color - Couleur hex
         */
        addTerm(key, termLabel, color) {
            if (!allowCustomTerms) return;
            this._terms[key] = { label: termLabel, color };
            this._saveTerms();
            this._registerTaxonomy();
        },

        /**
         * Modifie un terme existant.
         *
         * @param {string} key - Cle du terme
         * @param {string} termLabel - Nouveau label
         * @param {string} color - Nouvelle couleur
         */
        updateTerm(key, termLabel, color) {
            if (!allowCustomTerms || !this._terms[key]) return;
            this._terms[key] = { label: termLabel, color };
            this._saveTerms();
            this._registerTaxonomy();
        },

        /**
         * Supprime un terme.
         *
         * @param {string} key - Cle du terme a supprimer
         */
        removeTerm(key) {
            if (!allowCustomTerms || !this._terms[key]) return;
            delete this._terms[key];
            this._saveTerms();
            this._registerTaxonomy();
        },

        /**
         * Reinitialise les termes aux valeurs par defaut.
         */
        resetTerms() {
            if (!allowCustomTerms) return;
            this._terms = { ...defaultTerms };
            this._saveTerms();
            this._registerTaxonomy();
        },

        /**
         * Retourne les termes actuels.
         *
         * @returns {Object<string, { label: string, color: string }>}
         */
        getTerms() {
            return { ...this._terms };
        },

        // -----------------------------------------------------------
        // Settings Panel (si allowCustomTerms)
        // -----------------------------------------------------------

        ...(allowCustomTerms
            ? {
                  settingsPanel(container) {
                      buildTaxonomySettingsPanel(this, container, taxonomyLabel);
                  },
              }
            : {}),
    };
}

/**
 * Construit le panneau de settings pour gerer les termes d'une taxonomie.
 *
 * @param {Object} plugin - Instance du plugin de taxonomie
 * @param {HTMLElement} container - Conteneur du panneau
 * @param {string} taxonomyLabel - Label de la taxonomie
 */
function buildTaxonomySettingsPanel(plugin, container, taxonomyLabel) {
    const wrapper = document.createElement('div');
    wrapper.className = 'taxonomy-settings';

    const title = document.createElement('div');
    title.className = 'taxonomy-settings-title';
    title.textContent = `Termes de "${taxonomyLabel}"`;
    wrapper.appendChild(title);

    const termsList = document.createElement('div');
    termsList.className = 'taxonomy-settings-terms';
    wrapper.appendChild(termsList);

    /**
     * Rend la liste des termes.
     */
    function renderTerms() {
        termsList.innerHTML = '';
        const terms = plugin.getTerms();

        for (const [key, term] of Object.entries(terms)) {
            const row = document.createElement('div');
            row.className = 'taxonomy-settings-term';

            const colorDot = document.createElement('span');
            colorDot.className = 'taxonomy-settings-color';
            colorDot.style.background = term.color;

            const label = document.createElement('span');
            label.className = 'taxonomy-settings-label';
            label.textContent = term.label;

            const keySpan = document.createElement('span');
            keySpan.className = 'taxonomy-settings-key';
            keySpan.textContent = `(${key})`;

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'taxonomy-settings-remove';
            removeBtn.textContent = '×';
            removeBtn.title = 'Supprimer';
            removeBtn.addEventListener('click', () => {
                plugin.removeTerm(key);
                renderTerms();
            });

            row.appendChild(colorDot);
            row.appendChild(label);
            row.appendChild(keySpan);
            row.appendChild(removeBtn);
            termsList.appendChild(row);
        }
    }

    renderTerms();

    // Formulaire pour ajouter un terme
    const addForm = document.createElement('div');
    addForm.className = 'taxonomy-settings-add';

    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.placeholder = 'Cle (ex: urgent)';
    keyInput.className = 'input taxonomy-settings-input';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.placeholder = 'Label (ex: Urgent)';
    labelInput.className = 'input taxonomy-settings-input';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = '#6c63ff';
    colorInput.className = 'taxonomy-settings-color-input';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn--primary';
    addBtn.textContent = 'Ajouter';
    addBtn.addEventListener('click', () => {
        const key = keyInput.value.trim().toLowerCase().replace(/\s+/g, '-');
        const termLabel = labelInput.value.trim();
        const color = colorInput.value;

        if (!key || !termLabel) return;

        plugin.addTerm(key, termLabel, color);
        keyInput.value = '';
        labelInput.value = '';
        renderTerms();
    });

    addForm.appendChild(keyInput);
    addForm.appendChild(labelInput);
    addForm.appendChild(colorInput);
    addForm.appendChild(addBtn);
    wrapper.appendChild(addForm);

    // Bouton reset
    const resetGroup = document.createElement('div');
    resetGroup.className = 'form-group';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn--cancel';
    resetBtn.textContent = 'Reinitialiser';
    resetBtn.addEventListener('click', () => {
        plugin.resetTerms();
        renderTerms();
    });
    resetGroup.appendChild(resetBtn);
    wrapper.appendChild(resetGroup);

    container.appendChild(wrapper);
}
