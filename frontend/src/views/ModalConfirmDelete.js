/**
 * ModalConfirmDelete — Modale de confirmation avant suppression.
 *
 * Utilisable pour :
 *   - Supprimer un ticket : new ModalConfirmDelete(cardTitle, onConfirm)
 *   - Supprimer autre chose : new ModalConfirmDelete({ title, message, onConfirm })
 *
 * Le bouton "Supprimer" est rouge pour signaler l'action destructrice.
 */
import BaseModal from './BaseModal.js';

export default class ModalConfirmDelete extends BaseModal {
    /**
     * Callback appele si l'utilisateur confirme la suppression.
     * @type {Function}
     */
    _onConfirmCallback;

    /**
     * Message a afficher dans la modale.
     * @type {string}
     */
    _message;

    /**
     * Constructeur flexible.
     *
     * Usage 1 (legacy, pour les cartes) :
     *   new ModalConfirmDelete(cardTitle, onConfirm)
     *
     * Usage 2 (generique) :
     *   new ModalConfirmDelete({ title, message, onConfirm })
     *
     * @param {string|Object} titleOrOptions
     * @param {Function} [onConfirm]
     */
    constructor(titleOrOptions, onConfirm) {
        // Usage 1 : legacy (cardTitle, onConfirm)
        if (typeof titleOrOptions === 'string') {
            super({ title: 'Supprimer le ticket', confirmLabel: 'Supprimer' });
            this._message = `Êtes-vous sûr de vouloir supprimer « ${titleOrOptions} » ?`;
            this._onConfirmCallback = onConfirm;
        }
        // Usage 2 : objet options
        else {
            const {
                title = 'Confirmer la suppression',
                message,
                confirmLabel: label = 'Supprimer',
                onConfirm: callback,
            } = titleOrOptions;
            super({ title, confirmLabel: label });
            this._message = message;
            this._onConfirmCallback = callback;
        }
    }

    /**
     * Apres ouverture, applique le style danger sur le bouton de confirmation.
     * @override
     */
    open() {
        super.open();

        // Remplace le style primary par danger sur le bouton confirmer
        const confirmBtn = this._overlay.querySelector('.btn--primary');
        if (confirmBtn) {
            confirmBtn.classList.remove('btn--primary');
            confirmBtn.classList.add('btn--danger');
        }
    }

    /**
     * Construit le message de confirmation dans le body.
     *
     * @param {HTMLElement} body
     * @override
     */
    _buildBody(body) {
        const message = document.createElement('p');
        message.className = 'modal-confirm-delete-message';
        message.textContent = this._message;
        body.appendChild(message);
    }

    /**
     * Confirme la suppression : appelle le callback puis ferme la modale.
     * @override
     */
    _onConfirm() {
        if (this._onConfirmCallback) {
            this._onConfirmCallback();
        }
        this.close();
    }
}
