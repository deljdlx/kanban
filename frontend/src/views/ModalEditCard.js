/**
 * ModalEditCard — Modale d'édition d'un ticket existant.
 *
 * Étend BaseModal. Même formulaire que ModalAddCard mais avec les
 * champs pré-remplis. À la validation, appelle `onSave`.
 */
import BaseModal from './BaseModal.js';
import ModalConfirmDelete from './ModalConfirmDelete.js';
import Hooks from '../plugins/HookRegistry.js';
import UserService from '../services/UserService.js';
import PermissionService from '../services/PermissionService.js';
import SelectUser from '../components/SelectUser.js';
import { isSoloMode } from '../config/appMode.js';
import { buildTagCheckboxes, readTagCheckboxes } from '../components/TagCheckboxes.js';

export default class ModalEditCard extends BaseModal {
    /**
     * @type {function}
     */
    _onSave;

    /**
     * @type {import('../models/Card.js').default}
     */
    _card;

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
     * Callback appelé si l'utilisateur confirme la suppression.
     * @type {Function|null}
     */
    _onDelete;

    /**
     * @param {import('../models/Card.js').default} card - La carte à éditer
     * @param {function} onSave - Reçoit les données modifiées
     * @param {Object} [options]
     * @param {Function} [options.onClose]   - Callback appelé après fermeture
     * @param {Function} [options.onDelete]  - Callback appelé après confirmation de suppression
     */
    constructor(card, onSave, { onClose = null, onDelete = null } = {}) {
        super({
            title: 'Modifier le ticket',
            confirmLabel: 'Enregistrer',
            onClose,
            variant: 'fullscreen',
        });
        this._card = card;
        this._onSave = onSave;
        this._titleInput = null;
        this._summaryTextarea = null;
        this._descTextarea = null;
        this._selectUser = null;
        this._onDelete = onDelete;
    }

    /** @override */
    open() {
        super.open();
        this._titleInput.focus();

        // Bouton "Supprimer" dans le footer (à gauche, poussé par margin-right: auto)
        if (this._onDelete && PermissionService.can('deleteCard')) {
            const footer = this._overlay.querySelector('.modal-footer');
            if (!footer) return;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn--danger';
            deleteBtn.textContent = 'Supprimer';
            deleteBtn.classList.add('btn--footer-left');
            deleteBtn.addEventListener(
                'click',
                () => {
                    const confirmModal = new ModalConfirmDelete(this._card.title, () => {
                        this._onDelete();
                        this.close();
                    });
                    confirmModal.open();
                },
                { signal: this._abortController.signal },
            );
            footer.insertBefore(deleteBtn, footer.firstChild);
        }

        Hooks.doAction('modal:editCard:opened', {
            cardId: this._card.id,
            card: this._card,
            body: this._overlay.querySelector('.modal-body'),
            pluginsSlot: this._pluginsSlot,
            addTab: (label, options) => this.addTab(label, options),
            onClose: (fn) => this._registerCloseCallback(fn),
        });
    }

    /**
     * Construit les champs du formulaire pré-remplis.
     *
     * @param {HTMLElement} body
     * @override
     */
    _buildBody(body) {
        // Champ titre
        const titleLabel = document.createElement('label');
        titleLabel.textContent = 'Titre';
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.className = 'input';
        titleInput.placeholder = 'Titre du ticket';
        titleInput.required = true;
        titleInput.value = this._card.title;
        this._titleInput = titleInput;

        // Champ description
        const descLabel = document.createElement('label');
        descLabel.textContent = 'Description';
        const descTextarea = document.createElement('textarea');
        descTextarea.className = 'textarea';
        descTextarea.placeholder = 'Description (optionnel)';
        descTextarea.rows = 3;
        descTextarea.value = this._card.description;
        this._descTextarea = descTextarea;

        // Champ résumé
        const summaryLabel = document.createElement('label');
        summaryLabel.textContent = 'Résumé';
        const summaryTextarea = document.createElement('textarea');
        summaryTextarea.className = 'textarea';
        summaryTextarea.placeholder = 'Résumé (optionnel)';
        summaryTextarea.rows = 2;
        summaryTextarea.value = this._card.summary;
        this._summaryTextarea = summaryTextarea;

        body.appendChild(titleLabel);
        body.appendChild(titleInput);
        body.appendChild(summaryLabel);
        body.appendChild(summaryTextarea);
        body.appendChild(descLabel);
        body.appendChild(descTextarea);

        // Champ assignee (caché en solo mode)
        if (!isSoloMode()) {
            const assigneeLabel = document.createElement('label');
            assigneeLabel.textContent = 'Assigné à';

            this._selectUser = new SelectUser({
                users: UserService.getUsers(),
                selected: this._card.assignee,
            });

            body.appendChild(assigneeLabel);
            body.appendChild(this._selectUser.render());
        }

        // Tags par taxonomie (pré-cochés)
        buildTagCheckboxes(body, this._card.tags);
    }

    /** @override */
    _onConfirm() {
        const title = this._titleInput.value.trim();
        if (!title) {
            this._titleInput.focus();
            return;
        }

        const tags = readTagCheckboxes(this._overlay);

        this._onSave({
            title,
            summary: this._summaryTextarea.value.trim(),
            description: this._descTextarea.value.trim(),
            tags,
            assignee: isSoloMode() ? this._card.assignee : this._selectUser.getValue(),
        });
        this.close();
    }
}
