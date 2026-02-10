/**
 * ModalAddColumn — Modale de création d'une nouvelle colonne.
 *
 * Étend BaseModal. Formulaire simple avec un seul champ (titre).
 * À la validation, appelle `onSubmit` avec le titre saisi.
 */
import BaseModal from './BaseModal.js';

export default class ModalAddColumn extends BaseModal {
    /**
     * @type {function(string): void}
     */
    _onSubmit;

    /**
     * @type {HTMLInputElement|null}
     */
    _titleInput;

    /**
     * @param {function(string): void} onSubmit - Reçoit le titre de la colonne
     */
    constructor(onSubmit) {
        super({ title: 'Nouvelle colonne', confirmLabel: 'Créer' });
        this._onSubmit = onSubmit;
        this._titleInput = null;
    }

    /** @override */
    open() {
        super.open();
        this._titleInput.focus();
    }

    /**
     * Construit le champ titre dans le body.
     *
     * @param {HTMLElement} body
     * @override
     */
    _buildBody(body) {
        const titleLabel = document.createElement('label');
        titleLabel.textContent = 'Nom de la colonne';

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.className = 'input';
        titleInput.placeholder = 'Ex : En cours, À valider...';
        titleInput.required = true;
        this._titleInput = titleInput;

        body.appendChild(titleLabel);
        body.appendChild(titleInput);
    }

    /** @override */
    _onConfirm() {
        const title = this._titleInput.value.trim();
        if (!title) {
            this._titleInput.focus();
            return;
        }
        this._onSubmit(title);
        this.close();
    }
}
