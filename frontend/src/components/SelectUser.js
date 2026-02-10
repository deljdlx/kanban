/**
 * SelectUser — Custom dropdown pour choisir un utilisateur.
 *
 * Affiche un bouton-trigger avec l'avatar de l'utilisateur sélectionné
 * (ou un placeholder), et un dropdown avec recherche textuelle.
 *
 * Structure DOM produite :
 *   div.select-user
 *     button.select-user-trigger
 *       [div.select-user-avatar + span] | span.select-user-placeholder
 *     div.select-user-dropdown
 *       input.select-user-search
 *       div.select-user-options
 *         button.select-user-option (×N)
 */
export default class SelectUser {
    /**
     * Liste des utilisateurs affichables.
     * @type {Array<{ id: string, name: string, initials: string, color: string }>}
     */
    _users;

    /**
     * ID de l'utilisateur actuellement sélectionné.
     * @type {string|null}
     */
    _selectedId;

    /**
     * Callback appelé quand la sélection change.
     * @type {function(string|null): void}
     */
    _onChange;

    /**
     * Texte affiché quand aucun utilisateur n'est sélectionné.
     * @type {string}
     */
    _placeholder;

    /**
     * Si true, cliquer sur l'utilisateur déjà sélectionné le désélectionne.
     * @type {boolean}
     */
    _allowDeselect;

    /**
     * Élément racine du composant.
     * @type {HTMLElement|null}
     */
    _element;

    /**
     * Référence au bouton trigger (pour MAJ externe via setValue).
     * @type {HTMLElement|null}
     */
    _triggerElement;

    /**
     * Référence au listener "click extérieur" pour pouvoir le retirer.
     * @type {function|null}
     */
    _outsideClickHandler;

    /**
     * @param {Object} options
     * @param {Array<{ id: string, name: string, initials: string, color: string }>} options.users
     * @param {string|null} [options.selected] - ID de l'utilisateur pré-sélectionné
     * @param {function(string|null): void} [options.onChange] - Callback de changement
     * @param {string} [options.placeholder] - Texte du placeholder
     * @param {boolean} [options.allowDeselect] - Autoriser la désélection au re-clic
     */
    constructor({ users, selected = null, onChange = () => {}, placeholder = 'Assigné à...', allowDeselect = false }) {
        this._users = users;
        this._selectedId = selected;
        this._onChange = onChange;
        this._placeholder = placeholder;
        this._allowDeselect = allowDeselect;
        this._element = null;
        this._triggerElement = null;
        this._outsideClickHandler = null;
    }

    /**
     * Retourne l'ID de l'utilisateur sélectionné (ou null).
     * @returns {string|null}
     */
    getValue() {
        return this._selectedId;
    }

    /**
     * Change la sélection de l'extérieur (sans déclencher onChange).
     * Met à jour le trigger et les options visuellement.
     *
     * @param {string|null} userId
     */
    setValue(userId) {
        this._selectedId = userId;

        if (this._triggerElement) {
            this._renderTriggerContent(this._triggerElement);
        }

        if (this._element) {
            const options = this._element.querySelectorAll('.select-user-option');
            for (const opt of options) {
                opt.classList.toggle('select-user-option--selected', opt.dataset.userId === userId);
            }
        }
    }

    /**
     * Construit le DOM du composant et retourne l'élément racine.
     * @returns {HTMLElement}
     */
    render() {
        const root = document.createElement('div');
        root.className = 'select-user';

        // — Trigger (bouton principal)
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'select-user-trigger';
        this._renderTriggerContent(trigger);
        this._triggerElement = trigger;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggleDropdown(root);
        });

        // — Dropdown (caché par défaut)
        const dropdown = document.createElement('div');
        dropdown.className = 'select-user-dropdown';

        // Champ de recherche
        const search = document.createElement('input');
        search.type = 'text';
        search.className = 'select-user-search';
        search.placeholder = 'Rechercher...';
        search.addEventListener('input', () => {
            this._filterOptions(optionsContainer, search.value);
        });
        // Empêche la fermeture quand on clique dans le champ
        search.addEventListener('click', (e) => e.stopPropagation());

        // Container des options
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'select-user-options';

        for (const user of this._users) {
            const option = this._createOption(user, root, trigger);
            optionsContainer.appendChild(option);
        }

        dropdown.appendChild(search);
        dropdown.appendChild(optionsContainer);

        root.appendChild(trigger);
        root.appendChild(dropdown);

        this._element = root;
        return root;
    }

    /**
     * Nettoie le listener document (clic extérieur) si le dropdown est ouvert.
     * Doit être appelé si le composant est retiré du DOM.
     */
    destroy() {
        if (this._outsideClickHandler) {
            document.removeEventListener('click', this._outsideClickHandler);
            this._outsideClickHandler = null;
        }
    }

    // ---------------------------------------------------------------
    // Méthodes privées
    // ---------------------------------------------------------------

    /**
     * Crée un bouton d'option pour un utilisateur donné.
     *
     * @param {{ id: string, name: string, initials: string, color: string }} user
     * @param {HTMLElement} root - Élément racine (pour toggle open)
     * @param {HTMLElement} trigger - Bouton trigger (pour MAJ du contenu)
     * @returns {HTMLElement}
     */
    _createOption(user, root, trigger) {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'select-user-option';
        if (user.id === this._selectedId) {
            option.classList.add('select-user-option--selected');
        }
        option.dataset.userId = user.id;
        option.dataset.userName = user.name.toLowerCase();

        const avatar = this._createAvatar(user);
        const nameSpan = document.createElement('span');
        nameSpan.textContent = user.name;

        option.appendChild(avatar);
        option.appendChild(nameSpan);

        option.addEventListener('click', (e) => {
            e.stopPropagation();
            this._select(user.id, root, trigger);
        });

        return option;
    }

    /**
     * Crée un élément avatar rond (initiales + couleur de fond).
     *
     * @param {{ initials: string, color: string }} user
     * @returns {HTMLElement}
     */
    _createAvatar(user) {
        const avatar = document.createElement('div');
        avatar.className = 'select-user-avatar';
        avatar.textContent = user.initials;
        avatar.style.backgroundColor = user.color;
        return avatar;
    }

    /**
     * Met à jour le contenu du trigger selon la sélection courante.
     *
     * @param {HTMLElement} trigger
     */
    _renderTriggerContent(trigger) {
        trigger.innerHTML = '';

        const selected = this._users.find((u) => u.id === this._selectedId);
        if (selected) {
            const avatar = this._createAvatar(selected);
            const nameSpan = document.createElement('span');
            nameSpan.textContent = selected.name;
            trigger.appendChild(avatar);
            trigger.appendChild(nameSpan);
        } else {
            const placeholder = document.createElement('span');
            placeholder.className = 'select-user-placeholder';
            placeholder.textContent = this._placeholder;
            trigger.appendChild(placeholder);
        }
    }

    /**
     * Sélectionne un utilisateur, met à jour le DOM et appelle onChange.
     *
     * @param {string} userId
     * @param {HTMLElement} root
     * @param {HTMLElement} trigger
     */
    _select(userId, root, trigger) {
        // Toggle : si allowDeselect et on re-clique sur le même → null
        if (this._allowDeselect && this._selectedId === userId) {
            this._selectedId = null;
        } else {
            this._selectedId = userId;
        }

        // Met à jour le trigger
        this._renderTriggerContent(trigger);

        // Met à jour la classe --selected sur les options
        const options = root.querySelectorAll('.select-user-option');
        for (const opt of options) {
            opt.classList.toggle('select-user-option--selected', opt.dataset.userId === this._selectedId);
        }

        // Ferme le dropdown
        this._closeDropdown(root);

        this._onChange(this._selectedId);
    }

    /**
     * Ouvre ou ferme le dropdown.
     *
     * @param {HTMLElement} root
     */
    _toggleDropdown(root) {
        const isOpen = root.classList.contains('select-user--open');
        if (isOpen) {
            this._closeDropdown(root);
        } else {
            this._openDropdown(root);
        }
    }

    /**
     * Ouvre le dropdown et installe le listener de fermeture externe.
     *
     * @param {HTMLElement} root
     */
    _openDropdown(root) {
        root.classList.add('select-user--open');

        // Reset la recherche à l'ouverture et focus sur le champ
        const search = root.querySelector('.select-user-search');
        if (search) {
            search.value = '';
            this._filterOptions(root.querySelector('.select-user-options'), '');
            search.focus();
        }

        // Ferme si on clique n'importe où en dehors du composant
        this._outsideClickHandler = (e) => {
            if (!root.contains(e.target)) {
                this._closeDropdown(root);
            }
        };
        document.addEventListener('click', this._outsideClickHandler);
    }

    /**
     * Ferme le dropdown et retire le listener externe.
     *
     * @param {HTMLElement} root
     */
    _closeDropdown(root) {
        root.classList.remove('select-user--open');

        if (this._outsideClickHandler) {
            document.removeEventListener('click', this._outsideClickHandler);
            this._outsideClickHandler = null;
        }
    }

    /**
     * Filtre les options affichées selon le texte saisi.
     *
     * @param {HTMLElement} optionsContainer
     * @param {string} query
     */
    _filterOptions(optionsContainer, query) {
        const normalized = query.toLowerCase().trim();
        const options = optionsContainer.querySelectorAll('.select-user-option');

        for (const option of options) {
            const name = option.dataset.userName;
            option.classList.toggle('hidden', !name.includes(normalized));
        }
    }
}
