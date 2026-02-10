/**
 * ModalDeleteColumn — Modale de confirmation avant suppression d'une colonne.
 *
 * Si la colonne contient des cartes, un dropdown permet de choisir
 * la colonne cible vers laquelle migrer les cartes avant suppression.
 * Si la colonne est vide, seul le message de confirmation est affiché.
 *
 * Le bouton "Supprimer" est rouge (style danger) pour signaler
 * l'action destructrice.
 */
import BaseModal from './BaseModal.js';

export default class ModalDeleteColumn extends BaseModal {
    /**
     * Colonne à supprimer.
     * @type {import('../models/Column.js').default}
     */
    _column;

    /**
     * Autres colonnes du board (cibles possibles pour la migration).
     * @type {import('../models/Column.js').default[]}
     */
    _otherColumns;

    /**
     * Callback appelé avec le targetColumnId (ou null) si l'utilisateur confirme.
     * @type {Function}
     */
    _onConfirmCallback;

    /**
     * Référence au <select> de migration (null si colonne vide).
     * @type {HTMLSelectElement|null}
     */
    _selectElement;

    /**
     * True si la suppression est bloquée (cartes sans colonne cible).
     * @type {boolean}
     */
    _blocked;

    /**
     * @param {import('../models/Column.js').default} column - Colonne à supprimer
     * @param {import('../models/Column.js').default[]} otherColumns - Colonnes cibles possibles
     * @param {Function} onConfirm - Callback(targetColumnId|null)
     */
    constructor(column, otherColumns, onConfirm) {
        super({ title: 'Supprimer la colonne', confirmLabel: 'Supprimer' });
        this._column = column;
        this._otherColumns = otherColumns;
        this._onConfirmCallback = onConfirm;
        this._selectElement = null;
        this._blocked = false;
    }

    /**
     * Construit le message de confirmation et le dropdown de migration si nécessaire.
     *
     * @param {HTMLElement} body
     * @override
     */
    _buildBody(body) {
        // Message de confirmation
        const message = document.createElement('p');
        message.className = 'modal-confirm-delete-message';
        message.textContent = `Êtes-vous sûr de vouloir supprimer la colonne « ${this._column.title} » ?`;
        body.appendChild(message);

        // Dropdown de migration si la colonne contient des cartes
        if (this._column.count > 0 && this._otherColumns.length > 0) {
            const migrationLabel = document.createElement('p');
            migrationLabel.className = 'modal-field-label';
            const cardCount = this._column.count;
            migrationLabel.textContent = `Les ${cardCount} carte${cardCount > 1 ? 's' : ''} seront déplacée${cardCount > 1 ? 's' : ''} vers :`;
            body.appendChild(migrationLabel);

            const select = document.createElement('select');
            select.className = 'input';
            for (const col of this._otherColumns) {
                const option = document.createElement('option');
                option.value = col.id;
                option.textContent = col.title;
                select.appendChild(option);
            }
            body.appendChild(select);
            this._selectElement = select;
        }

        // Cas impossible : cartes présentes mais aucune colonne cible.
        // On bloque la suppression pour éviter une perte de données.
        if (this._column.count > 0 && this._otherColumns.length === 0) {
            const warning = document.createElement('p');
            warning.className = 'modal-confirm-delete-message modal-warning-text';
            warning.textContent =
                "Impossible : cette colonne contient des cartes et il n'y a aucune autre colonne pour les accueillir.";
            body.appendChild(warning);
            this._blocked = true;
        }
    }

    /**
     * Après ouverture, désactive le bouton confirmer si la suppression est bloquée.
     * @override
     */
    open() {
        super.open();

        const confirmBtn = this._overlay.querySelector('.btn--primary');
        if (confirmBtn) {
            confirmBtn.classList.remove('btn--primary');
            confirmBtn.classList.add('btn--danger');
        }

        // Désactive le bouton si la suppression est bloquée (cartes sans cible)
        if (this._blocked) {
            const dangerBtn = this._overlay.querySelector('.btn--danger');
            if (dangerBtn) {
                dangerBtn.disabled = true;
            }
        }
    }

    /**
     * Confirme la suppression : récupère la colonne cible si applicable,
     * appelle le callback puis ferme la modale.
     * @override
     */
    _onConfirm() {
        if (this._blocked) return;
        const targetColumnId = this._selectElement ? this._selectElement.value : null;
        if (this._onConfirmCallback) {
            this._onConfirmCallback(targetColumnId);
        }
        this.close();
    }
}
