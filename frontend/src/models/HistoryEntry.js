/**
 * HistoryEntry — Entité représentant une entrée dans l'historique d'une carte.
 *
 * Données immuables : action, date, auteur et changements associés.
 * Chaque changement suit le format { field: { from, to } } sauf exception
 * documentée dans historyActions.js.
 */
export default class HistoryEntry {
    /**
     * Type d'action (ex: 'created', 'updated', 'moved', …).
     * @type {string}
     */
    _action;

    /**
     * Date ISO de l'événement.
     * @type {string}
     */
    _date;

    /**
     * ID de l'utilisateur qui a effectué l'action.
     * @type {string|null}
     */
    _userId;

    /**
     * Détail des modifications, ou null si pas de détail.
     * Format standard : { field: { from, to } }
     * @type {Object|null}
     */
    _changes;

    /**
     * @param {Object} data
     * @param {string}      data.action  - Type d'action
     * @param {string}      [data.date]  - Date ISO (auto-générée si absente)
     * @param {string|null} [data.userId] - ID de l'auteur
     * @param {Object|null} [data.changes] - Détail des modifications
     */
    constructor({ action, date = null, userId = null, changes = null }) {
        this._action = action;
        this._date = date || new Date().toISOString();
        this._userId = userId;
        this._changes = changes;
    }

    /** @returns {string} */
    get action() {
        return this._action;
    }

    /** @returns {string} */
    get date() {
        return this._date;
    }

    /** @returns {string|null} */
    get userId() {
        return this._userId;
    }

    /** @returns {Object|null} */
    get changes() {
        return this._changes;
    }

    /**
     * Retourne une représentation brute de l'entrée d'historique,
     * compatible avec le format attendu par le constructeur.
     *
     * @returns {{ action: string, date: string, userId: string|null, changes: Object|null }}
     */
    toJSON() {
        return {
            action: this._action,
            date: this._date,
            userId: this._userId,
            changes: this._changes,
        };
    }
}
