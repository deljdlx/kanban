/**
 * HeaderView — Barre de header de l'application.
 *
 * Affiche le titre du projet, un bouton filtres, un bouton pour
 * ajouter une colonne, et l'avatar de l'utilisateur connecté.
 */
import ModalAddColumn from './ModalAddColumn.js';
import ModalAddCard from './ModalAddCard.js';
import ModalBoardSettings from './ModalBoardSettings.js';
import FilterDropdown from '../components/FilterDropdown.js';
import UserService from '../services/UserService.js';
import PermissionService from '../services/PermissionService.js';
import Router from '../services/Router.js';
import Hooks from '../plugins/HookRegistry.js';

export default class HeaderView {
    /**
     * Callback déclenché quand l'utilisateur valide l'ajout d'une colonne.
     * @type {function(string): void}
     */
    _onAddColumn;

    /**
     * Callback déclenché quand l'utilisateur crée un ticket depuis le header.
     * Reçoit les données de la carte (avec `columnId` indiquant la colonne cible).
     * @type {function(Object): void}
     */
    _onAddCard;

    /**
     * Référence au Board pour lire les colonnes disponibles.
     * @type {import('../models/Board.js').default}
     */
    _board;

    /**
     * Référence au bouton "+ Ticket" pour le désactiver quand le board est vide.
     * @type {HTMLButtonElement|null}
     */
    _addCardBtn;

    /**
     * Handler lié pour Board 'change' (stocké pour off()).
     * @type {Function|null}
     */
    _onBoardChangeBound;

    /**
     * Instance FilterDropdown (stockée pour destroy()).
     * @type {import('../components/FilterDropdown.js').default|null}
     */
    _filterDropdown;

    /**
     * Élément titre (pour mise à jour dynamique).
     * @type {HTMLElement|null}
     */
    _titleElement;

    /**
     * @param {Object} options
     * @param {function(string): void} options.onAddColumn - Reçoit le titre saisi
     * @param {function(Object): void} options.onAddCard   - Reçoit les données du ticket + columnId
     * @param {import('../models/Board.js').default} options.board - Le board (pour lister les colonnes)
     */
    constructor({ onAddColumn, onAddCard, board }) {
        this._onAddColumn = onAddColumn;
        this._onAddCard = onAddCard;
        this._board = board;
        this._addCardBtn = null;
        this._onBoardChangeBound = null;
        this._filterDropdown = null;
        this._titleElement = null;
    }

    /**
     * Construit le DOM du header et le retourne.
     *
     * Structure produite :
     *   header.app-header
     *     h1.app-header-title
     *     div.app-header-actions
     *       FilterDropdown
     *       button.app-header-add-col
     *       div.app-header-user
     *
     * @returns {HTMLElement}
     */
    render() {
        const header = document.createElement('header');
        header.className = 'app-header';

        // — Zone gauche (home + titre)
        const left = document.createElement('div');
        left.className = 'app-header-left';

        // Bouton retour à l'accueil
        const homeBtn = document.createElement('button');
        homeBtn.className = 'app-header-home';
        homeBtn.title = "Retour à l'accueil";
        homeBtn.textContent = '🏠';
        homeBtn.addEventListener('click', () => {
            Router.navigate('/');
        });
        left.appendChild(homeBtn);

        // Titre (nom du board) — clic pour éditer inline
        const title = document.createElement('h1');
        title.className = 'app-header-title';
        title.textContent = this._board.name;
        title.title = 'Cliquer pour renommer';
        title.addEventListener('click', () => this._startTitleEdit());
        this._titleElement = title;
        left.appendChild(title);

        // — Zone droite (filtres + bouton + user)
        const actions = document.createElement('div');
        actions.className = 'app-header-actions';

        // Filtres
        this._filterDropdown = new FilterDropdown();
        actions.appendChild(this._filterDropdown.render());

        // Bouton Configuration (ouvre la modale de paramètres)
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'app-header-settings';
        settingsBtn.textContent = 'Configuration';
        settingsBtn.addEventListener('click', () => {
            const modal = new ModalBoardSettings(this._board);
            modal.open();
        });
        actions.appendChild(settingsBtn);

        // Bouton ajouter ticket (visible uniquement pour les rôles autorisés)
        // Désactivé tant qu'aucune colonne n'existe dans le board.
        if (PermissionService.can('addCard')) {
            const addCardBtn = document.createElement('button');
            addCardBtn.className = 'app-header-add-card';
            addCardBtn.textContent = '+ Ticket';
            addCardBtn.disabled = this._board.columns.length === 0;
            addCardBtn.addEventListener('click', () => {
                if (addCardBtn.disabled) return;
                const modal = new ModalAddCard(
                    (cardData) => {
                        this._onAddCard(cardData);
                    },
                    { columns: this._board.columns },
                );
                modal.open();
            });
            this._addCardBtn = addCardBtn;
            actions.appendChild(addCardBtn);
        }

        // Réagit aux changements du board (titre, colonnes)
        this._onBoardChangeBound = () => this._updateAddCardState();
        this._board.on('change', this._onBoardChangeBound);

        // Bouton ajouter colonne (visible uniquement pour les rôles autorisés)
        if (PermissionService.can('addColumn')) {
            const addColBtn = document.createElement('button');
            addColBtn.className = 'app-header-add-col';
            addColBtn.textContent = '+ Colonne';
            addColBtn.addEventListener('click', () => {
                const modal = new ModalAddColumn((columnTitle) => {
                    this._onAddColumn(columnTitle);
                });
                modal.open();
            });
            actions.appendChild(addColBtn);
        }

        // — Plugins : injection dans les actions du header
        Hooks.doAction('header:renderActions', { container: actions, board: this._board });

        // — Utilisateur connecté
        const currentUser = UserService.getCurrentUser();
        if (currentUser) {
            const userEl = document.createElement('div');
            userEl.className = 'app-header-user';

            const avatar = document.createElement('div');
            avatar.className = 'app-header-user-avatar';
            avatar.textContent = currentUser.initials;
            avatar.style.backgroundColor = currentUser.color;

            const name = document.createElement('span');
            name.className = 'app-header-user-name';
            name.textContent = currentUser.name;

            userEl.appendChild(avatar);
            userEl.appendChild(name);
            actions.appendChild(userEl);
        }

        header.appendChild(left);
        header.appendChild(actions);

        return header;
    }

    /**
     * Nettoie le listener Board 'change' et les composants enfants.
     * Doit être appelé si la vue est retirée du DOM.
     */
    destroy() {
        if (this._onBoardChangeBound) {
            this._board.off('change', this._onBoardChangeBound);
            this._onBoardChangeBound = null;
        }
        if (this._filterDropdown) {
            this._filterDropdown.destroy();
            this._filterDropdown = null;
        }
    }

    /**
     * Remplace le h1 par un input pour éditer le titre du board.
     * Valide sur Enter ou blur, annule sur Escape.
     *
     * @private
     */
    _startTitleEdit() {
        if (!this._titleElement || this._titleElement.tagName === 'INPUT') return;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'app-header-title-input';
        input.value = this._board.name;

        const commit = () => {
            const newName = input.value.trim();
            if (newName && newName !== this._board.name) {
                this._board.name = newName;
            }
            input.replaceWith(this._titleElement);
            this._titleElement.textContent = this._board.name;
        };

        const cancel = () => {
            input.replaceWith(this._titleElement);
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                commit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
            }
        });

        input.addEventListener('blur', () => commit());

        this._titleElement.replaceWith(input);
        input.focus();
        input.select();
    }

    /**
     * Met à jour l'état du header en fonction du board.
     * - Bouton "+ Ticket" activé/désactivé selon les colonnes
     * - Titre mis à jour avec le nom du board
     *
     * @private
     */
    _updateAddCardState() {
        if (this._addCardBtn) {
            this._addCardBtn.disabled = this._board.columns.length === 0;
        }
        if (this._titleElement) {
            this._titleElement.textContent = this._board.name;
        }
    }
}
