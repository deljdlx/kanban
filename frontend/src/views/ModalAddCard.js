/**
 * ModalAddCard — Modale de création d'un nouveau ticket.
 *
 * Étend BaseModal. Affiche un formulaire avec :
 *   - Un sélecteur de type de ticket (standard, ou types enregistrés par plugins)
 *   - Des panels interchangeables selon le type sélectionné
 *
 * Les plugins peuvent enregistrer leurs propres types de tickets via
 * le hook `modal:addCard:opened` avec la fonction `registerCardType()`.
 */
import BaseModal from './BaseModal.js';
import Hooks from '../plugins/HookRegistry.js';
import UserService from '../services/UserService.js';
import SelectUser from '../components/SelectUser.js';
import { isSoloMode } from '../config/appMode.js';
import { generateId } from '../utils/id.js';
import { buildTagCheckboxes, readTagCheckboxes } from '../components/TagCheckboxes.js';

export default class ModalAddCard extends BaseModal {
    /**
     * Callback appelé avec les données de la carte à créer.
     * @type {function}
     */
    _onSubmit;

    /**
     * @type {HTMLInputElement|null}
     */
    _titleInput;

    /**
     * @type {HTMLTextAreaElement|null}
     */
    _summaryTextarea;

    /**
     * @type {HTMLTextAreaElement|null}
     */
    _descTextarea;

    /**
     * @type {import('../components/SelectUser.js').default|null}
     */
    _selectUser;

    /**
     * Liste des colonnes disponibles (pour le sélecteur de colonne).
     * Null = création depuis une colonne, pas de sélecteur affiché.
     * @type {import('../models/Column.js').default[]|null}
     */
    _columns;

    /**
     * @type {HTMLSelectElement|null}
     */
    _columnSelect;

    /**
     * Sélecteur de type de ticket.
     * @type {HTMLSelectElement|null}
     */
    _typeSelect;

    /**
     * Conteneur des panels (standard + widgets).
     * @type {HTMLElement|null}
     */
    _panelsContainer;

    /**
     * Panel du formulaire standard.
     * @type {HTMLElement|null}
     */
    _standardPanel;

    /**
     * Types de tickets enregistrés par les plugins.
     * Map<typeId, { label, panel, buildPanel }>
     * @type {Map<string, Object>}
     */
    _cardTypes;

    /**
     * Type actuellement sélectionné.
     * @type {string}
     */
    _currentType;

    /**
     * @param {function} onSubmit - Reçoit les données de la carte à créer
     * @param {Object} [options]
     * @param {import('../models/Column.js').default[]} [options.columns] - Si fourni, affiche un sélecteur de colonne
     */
    constructor(onSubmit, { columns = null } = {}) {
        super({
            title: 'Nouveau ticket',
            confirmLabel: 'Créer',
            variant: 'fullscreen',
        });
        this._onSubmit = onSubmit;
        this._titleInput = null;
        this._summaryTextarea = null;
        this._descTextarea = null;
        this._selectUser = null;
        this._columns = columns;
        this._columnSelect = null;
        this._typeSelect = null;
        this._panelsContainer = null;
        this._standardPanel = null;
        this._cardTypes = new Map();
        this._currentType = 'standard';
    }

    /** @override */
    open() {
        super.open();

        // Écoute les événements de création de widget (depuis les plugins)
        this._overlay.addEventListener('widget:create', (e) => {
            this._handleWidgetCreate(e.detail.cardData);
        });

        // Permet aux plugins d'enregistrer leurs types de tickets
        Hooks.doAction('modal:addCard:opened', {
            body: this._overlay.querySelector('.modal-body'),
            pluginsSlot: this._pluginsSlot,
            registerCardType: (typeId, label, buildPanel) => this._registerCardType(typeId, label, buildPanel),
            onClose: (fn) => this._registerCloseCallback(fn),
            // Garde addTab pour rétrocompatibilité (autres usages)
            addTab: (label, options) => this.addTab(label, options),
        });

        // Focus sur le premier champ après l'enregistrement des types
        this._titleInput.focus();
    }

    /**
     * Enregistre un type de ticket personnalisé (widget).
     *
     * @param {string} typeId - Identifiant unique (ex: 'widget:counter')
     * @param {string} label - Libellé affiché dans le select (ex: 'Compteur de click')
     * @param {function(HTMLElement): void} buildPanel - Fonction qui construit le contenu du panel
     * @private
     */
    _registerCardType(typeId, label, buildPanel) {
        // Ajoute l'option au select
        const option = document.createElement('option');
        option.value = typeId;
        option.textContent = label;
        this._typeSelect.appendChild(option);

        // Crée le panel pour ce type
        const panel = document.createElement('div');
        panel.className = 'card-type-panel';
        panel.dataset.type = typeId;
        panel.classList.add('hidden');
        this._panelsContainer.appendChild(panel);

        // Laisse le plugin construire son contenu
        buildPanel(panel);

        // Enregistre le type
        this._cardTypes.set(typeId, { label, panel, buildPanel });
    }

    /**
     * Gère le changement de type de ticket.
     * Affiche/masque les panels appropriés.
     *
     * @private
     */
    _onTypeChange() {
        const selectedType = this._typeSelect.value;
        this._currentType = selectedType;

        // Masque tous les panels
        this._standardPanel.classList.add('hidden');
        for (const { panel } of this._cardTypes.values()) {
            panel.classList.add('hidden');
        }

        // Affiche le panel du type sélectionné
        if (selectedType === 'standard') {
            this._standardPanel.classList.remove('hidden');
        } else {
            const typeConfig = this._cardTypes.get(selectedType);
            if (typeConfig) {
                typeConfig.panel.classList.remove('hidden');
            }
        }
    }

    /**
     * Gère la création d'une carte widget depuis un plugin.
     *
     * @param {Object} cardData - Données de la carte (déjà complètes)
     * @private
     */
    _handleWidgetCreate(cardData) {
        // Ajoute columnId si un sélecteur est présent
        if (this._columnSelect) {
            cardData.columnId = this._columnSelect.value;
        }

        this._onSubmit(cardData);
        this.close();
    }

    /**
     * Construit les champs du formulaire dans le body.
     *
     * @param {HTMLElement} body
     * @override
     */
    _buildBody(body) {
        // Sélecteur de colonne (uniquement si la liste est fournie)
        if (this._columns && this._columns.length > 0) {
            const colGroup = this._createFormGroup('Colonne');
            const colSelect = document.createElement('select');
            colSelect.className = 'input';

            for (const col of this._columns) {
                const option = document.createElement('option');
                option.value = col.id;
                option.textContent = col.title;
                colSelect.appendChild(option);
            }
            this._columnSelect = colSelect;
            colGroup.appendChild(colSelect);
            body.appendChild(colGroup);
        }

        // Sélecteur de type de ticket
        const typeGroup = this._createFormGroup('Type de ticket');
        const typeSelect = document.createElement('select');
        typeSelect.className = 'input';

        const standardOption = document.createElement('option');
        standardOption.value = 'standard';
        standardOption.textContent = 'Ticket standard';
        typeSelect.appendChild(standardOption);

        typeSelect.addEventListener('change', () => this._onTypeChange());
        this._typeSelect = typeSelect;
        typeGroup.appendChild(typeSelect);
        body.appendChild(typeGroup);

        // Conteneur des panels
        const panelsContainer = document.createElement('div');
        panelsContainer.className = 'card-type-panels';
        this._panelsContainer = panelsContainer;

        // Panel standard (formulaire classique)
        const standardPanel = document.createElement('div');
        standardPanel.className = 'card-type-panel';
        standardPanel.dataset.type = 'standard';
        this._standardPanel = standardPanel;

        this._buildStandardPanel(standardPanel);
        panelsContainer.appendChild(standardPanel);

        body.appendChild(panelsContainer);
    }

    /**
     * Construit le formulaire standard (titre, description, assignee, tags).
     *
     * @param {HTMLElement} panel
     * @private
     */
    _buildStandardPanel(panel) {
        // Champ titre
        const titleGroup = this._createFormGroup('Titre');
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.className = 'input';
        titleInput.placeholder = 'Titre du ticket';
        titleInput.required = true;
        this._titleInput = titleInput;
        titleGroup.appendChild(titleInput);
        panel.appendChild(titleGroup);

        // Champ résumé
        const summaryGroup = this._createFormGroup('Résumé');
        const summaryTextarea = document.createElement('textarea');
        summaryTextarea.className = 'textarea';
        summaryTextarea.placeholder = 'Résumé (optionnel)';
        summaryTextarea.rows = 2;
        this._summaryTextarea = summaryTextarea;
        summaryGroup.appendChild(summaryTextarea);
        panel.appendChild(summaryGroup);

        // Champ description
        const descGroup = this._createFormGroup('Description');
        const descTextarea = document.createElement('textarea');
        descTextarea.className = 'textarea';
        descTextarea.placeholder = 'Description (optionnel)';
        descTextarea.rows = 3;
        this._descTextarea = descTextarea;
        descGroup.appendChild(descTextarea);
        panel.appendChild(descGroup);

        // Champ assignee (caché en solo mode — auto-assign)
        if (!isSoloMode()) {
            const assigneeGroup = this._createFormGroup('Assigné à');
            this._selectUser = new SelectUser({
                users: UserService.getUsers(),
            });
            assigneeGroup.appendChild(this._selectUser.render());
            panel.appendChild(assigneeGroup);
        }

        // Tags par taxonomie
        buildTagCheckboxes(panel);
    }

    /**
     * Crée un groupe de formulaire avec label.
     *
     * @param {string} labelText
     * @returns {HTMLElement}
     * @private
     */
    _createFormGroup(labelText) {
        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = labelText;
        group.appendChild(label);

        return group;
    }

    /** @override */
    _onConfirm() {
        // Si un type widget est sélectionné, le plugin gère la création via widget:create
        if (this._currentType !== 'standard') {
            // Le plugin doit déclencher l'événement widget:create
            // On ne fait rien ici, le bouton "Créer" ne s'applique qu'au type standard
            return;
        }

        const title = this._titleInput.value.trim();
        if (!title) {
            this._titleInput.focus();
            return;
        }

        const tags = readTagCheckboxes(this._overlay);
        const currentUser = UserService.getCurrentUser();

        const cardData = {
            id: generateId('card'),
            title,
            summary: this._summaryTextarea.value.trim(),
            description: this._descTextarea.value.trim(),
            tags,
            assignee: isSoloMode() ? (currentUser ? currentUser.id : null) : this._selectUser.getValue(),
            author: currentUser ? currentUser.id : null,
        };

        // Si un sélecteur de colonne est présent, on transmet l'ID choisi
        if (this._columnSelect) {
            cardData.columnId = this._columnSelect.value;
        }

        this._onSubmit(cardData);
        this.close();
    }
}
