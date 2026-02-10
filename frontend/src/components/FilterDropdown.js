/**
 * FilterDropdown — Bouton + panneau de filtres pour le board.
 *
 * Affiche un bouton "Filtres" dans le header. Au clic, ouvre un
 * panneau dropdown avec des sections :
 *   - Assigné à (SelectUser avec désélection)
 *   - Auteur    (SelectUser avec désélection)
 *   - Une section par taxonomie (badges toggleables)
 *
 * Chaque changement met à jour le FilterStore (qui notifie les vues).
 *
 * Structure DOM :
 *   div.filter-dropdown
 *     button.filter-dropdown-trigger
 *     div.filter-dropdown-panel
 *       div.filter-dropdown-section  (×N)
 *       button.filter-dropdown-reset
 */
import FilterStore from '../services/FilterStore.js';
import UserService from '../services/UserService.js';
import SelectUser from './SelectUser.js';
import TaxonomyService from '../services/TaxonomyService.js';
import { isSoloMode } from '../config/appMode.js';
import { hexToRgba } from '../utils/color.js';

export default class FilterDropdown {
    /**
     * Élément racine du composant.
     * @type {HTMLElement|null}
     */
    _element;

    /**
     * Bouton trigger (pour mettre à jour l'indicateur actif).
     * @type {HTMLElement|null}
     */
    _trigger;

    /**
     * Instance SelectUser pour le filtre assignee.
     * @type {import('./SelectUser.js').default|null}
     */
    _selectAssignee;

    /**
     * Instance SelectUser pour le filtre author.
     * @type {import('./SelectUser.js').default|null}
     */
    _selectAuthor;

    /**
     * Référence au panneau (pour refresh des tags au reset).
     * @type {HTMLElement|null}
     */
    _panel;

    /**
     * Référence au listener de clic extérieur.
     * @type {function|null}
     */
    _outsideClickHandler;

    /**
     * Handler lié pour FilterStore 'change' (stocké pour off()).
     * @type {Function|null}
     */
    _onFilterChangeBound;

    constructor() {
        this._element = null;
        this._trigger = null;
        this._selectAssignee = null;
        this._selectAuthor = null;
        this._panel = null;
        this._outsideClickHandler = null;
        this._onFilterChangeBound = null;
    }

    /**
     * Construit et retourne l'élément DOM du composant.
     * @returns {HTMLElement}
     */
    render() {
        const root = document.createElement('div');
        root.className = 'filter-dropdown';

        // — Bouton trigger
        const trigger = document.createElement('button');
        trigger.className = 'filter-dropdown-trigger';
        trigger.textContent = 'Filtres';
        this._trigger = trigger;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggle(root);
        });

        // — Panneau (caché par défaut)
        const panel = document.createElement('div');
        panel.className = 'filter-dropdown-panel';
        panel.addEventListener('click', (e) => e.stopPropagation());
        this._panel = panel;

        if (!isSoloMode()) {
            this._buildAssigneeSection(panel);
            this._buildAuthorSection(panel);
        }
        this._buildTagSections(panel);
        this._buildResetButton(panel);

        root.appendChild(trigger);
        root.appendChild(panel);

        // Met à jour l'indicateur quand les filtres changent
        this._onFilterChangeBound = () => this._updateTrigger();
        FilterStore.on('change', this._onFilterChangeBound);
        this._updateTrigger();

        this._element = root;
        return root;
    }

    /**
     * Nettoie les listeners (FilterStore + document + enfants SelectUser).
     * Doit être appelé si le composant est retiré du DOM.
     */
    destroy() {
        if (this._onFilterChangeBound) {
            FilterStore.off('change', this._onFilterChangeBound);
            this._onFilterChangeBound = null;
        }
        if (this._outsideClickHandler) {
            document.removeEventListener('click', this._outsideClickHandler);
            this._outsideClickHandler = null;
        }
        if (this._selectAssignee) {
            this._selectAssignee.destroy();
        }
        if (this._selectAuthor) {
            this._selectAuthor.destroy();
        }
    }

    // ---------------------------------------------------------------
    // Construction des sections
    // ---------------------------------------------------------------

    /**
     * Section "Assigné à" — réutilise SelectUser avec désélection.
     * @param {HTMLElement} panel
     * @private
     */
    _buildAssigneeSection(panel) {
        const section = this._createSection('Assigné à');
        const options = section.querySelector('.filter-dropdown-section-options');

        this._selectAssignee = new SelectUser({
            users: UserService.getUsers(),
            placeholder: 'Tous',
            allowDeselect: true,
            onChange: (userId) => {
                FilterStore.setFilter('assignee', userId);
            },
        });

        options.appendChild(this._selectAssignee.render());
        panel.appendChild(section);
    }

    /**
     * Section "Auteur" — réutilise SelectUser avec désélection.
     * @param {HTMLElement} panel
     * @private
     */
    _buildAuthorSection(panel) {
        const section = this._createSection('Auteur');
        const options = section.querySelector('.filter-dropdown-section-options');

        this._selectAuthor = new SelectUser({
            users: UserService.getUsers(),
            placeholder: 'Tous',
            allowDeselect: true,
            onChange: (userId) => {
                FilterStore.setFilter('author', userId);
            },
        });

        options.appendChild(this._selectAuthor.render());
        panel.appendChild(section);
    }

    /**
     * Sections par taxonomie (type, priorité, etc.) — badges toggleables.
     * @param {HTMLElement} panel
     * @private
     */
    _buildTagSections(panel) {
        for (const [taxonomyKey, taxonomy] of Object.entries(TaxonomyService.getTaxonomies())) {
            const section = this._createSection(taxonomy.label);
            const options = section.querySelector('.filter-dropdown-section-options');

            for (const [termKey, termConfig] of Object.entries(taxonomy.terms)) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'filter-dropdown-option filter-dropdown-tag-option';
                btn.dataset.taxonomy = taxonomyKey;
                btn.dataset.term = termKey;

                // Badge coloré comme dans les cartes
                btn.style.background = hexToRgba(termConfig.color, 0.2);
                btn.style.color = termConfig.color;
                btn.textContent = termConfig.label;

                btn.addEventListener('click', () => {
                    this._toggleTagTerm(taxonomyKey, termKey);
                    this._refreshTagOptions(options, taxonomyKey);
                });

                options.appendChild(btn);
            }

            panel.appendChild(section);
        }
    }

    /**
     * Bouton "Réinitialiser" en bas du panneau.
     * @param {HTMLElement} panel
     * @private
     */
    _buildResetButton(panel) {
        const btn = document.createElement('button');
        btn.className = 'filter-dropdown-reset';
        btn.textContent = 'Réinitialiser';
        btn.addEventListener('click', () => {
            FilterStore.reset();
            this._resetAll();
        });
        panel.appendChild(btn);
    }

    // ---------------------------------------------------------------
    // Helpers de création DOM
    // ---------------------------------------------------------------

    /**
     * Crée un bloc de section (titre + container options).
     * @param {string} title
     * @returns {HTMLElement}
     * @private
     */
    _createSection(title) {
        const section = document.createElement('div');
        section.className = 'filter-dropdown-section';

        const label = document.createElement('label');
        label.className = 'filter-dropdown-section-title';
        label.textContent = title;

        const options = document.createElement('div');
        options.className = 'filter-dropdown-section-options';

        section.appendChild(label);
        section.appendChild(options);
        return section;
    }

    // ---------------------------------------------------------------
    // Logique de toggle / refresh
    // ---------------------------------------------------------------

    /**
     * Toggle un terme dans le filtre tags.
     * @param {string} taxonomy
     * @param {string} term
     * @private
     */
    _toggleTagTerm(taxonomy, term) {
        const filters = FilterStore.getFilters();
        const current = filters.tags[taxonomy] || [];

        if (current.includes(term)) {
            filters.tags[taxonomy] = current.filter((t) => t !== term);
        } else {
            filters.tags[taxonomy] = [...current, term];
        }

        FilterStore.setFilter('tags', filters.tags);
    }

    /**
     * Met à jour la classe --active sur les options tag d'une section.
     * @param {HTMLElement} container
     * @param {string} taxonomy
     * @private
     */
    _refreshTagOptions(container, taxonomy) {
        const activeTerms = FilterStore.getFilters().tags[taxonomy] || [];
        const options = container.querySelectorAll('.filter-dropdown-tag-option');
        for (const opt of options) {
            opt.classList.toggle('filter-dropdown-option--active', activeTerms.includes(opt.dataset.term));
        }
    }

    /**
     * Réinitialise tous les composants visuellement après un reset du store.
     * @private
     */
    _resetAll() {
        // Reset les SelectUser
        if (this._selectAssignee) {
            this._selectAssignee.setValue(null);
        }
        if (this._selectAuthor) {
            this._selectAuthor.setValue(null);
        }

        // Reset les badges tags
        if (this._panel) {
            const tagOptions = this._panel.querySelectorAll('.filter-dropdown-tag-option');
            for (const opt of tagOptions) {
                opt.classList.remove('filter-dropdown-option--active');
            }
        }
    }

    // ---------------------------------------------------------------
    // Ouverture / fermeture
    // ---------------------------------------------------------------

    /**
     * @param {HTMLElement} root
     * @private
     */
    _toggle(root) {
        if (root.classList.contains('filter-dropdown--open')) {
            this._close(root);
        } else {
            this._open(root);
        }
    }

    /**
     * @param {HTMLElement} root
     * @private
     */
    _open(root) {
        root.classList.add('filter-dropdown--open');
        this._outsideClickHandler = () => this._close(root);
        document.addEventListener('click', this._outsideClickHandler);
    }

    /**
     * @param {HTMLElement} root
     * @private
     */
    _close(root) {
        root.classList.remove('filter-dropdown--open');
        if (this._outsideClickHandler) {
            document.removeEventListener('click', this._outsideClickHandler);
            this._outsideClickHandler = null;
        }
    }

    /**
     * Met à jour le texte/style du trigger selon l'état des filtres.
     * @private
     */
    _updateTrigger() {
        if (!this._trigger) {
            return;
        }
        const active = FilterStore.hasActiveFilters();
        this._trigger.classList.toggle('filter-dropdown-trigger--active', active);
        this._trigger.textContent = active ? 'Filtres actifs' : 'Filtres';
    }
}
