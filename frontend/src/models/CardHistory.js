/**
 * CardHistory — Gestion de l'historique des actions sur une carte.
 *
 * Encapsule le tableau d'HistoryEntry et fournit les méthodes
 * pour enregistrer les différentes actions (création, modification,
 * commentaire, déplacement, etc.).
 */
import HistoryEntry from './HistoryEntry.js';

export default class CardHistory {
    /**
     * @type {HistoryEntry[]}
     */
    _entries;

    /**
     * @param {Array} [rawEntries] - Entrées brutes depuis l'API
     * @param {string} [createdAt] - Date de création de la carte
     * @param {string|null} [authorId] - Auteur de la carte
     */
    constructor(rawEntries = null, createdAt = null, authorId = null) {
        if (rawEntries && rawEntries.length > 0) {
            this._entries = rawEntries.map((raw) => new HistoryEntry(raw));
        } else {
            this._entries = [
                new HistoryEntry({
                    action: 'created',
                    date: createdAt || new Date().toISOString(),
                    userId: authorId,
                }),
            ];
        }
    }

    /**
     * Retourne une copie du tableau d'entrées.
     *
     * @returns {HistoryEntry[]}
     */
    getAll() {
        return [...this._entries];
    }

    /**
     * Enregistre une action dans l'historique.
     *
     * @param {string} action - Type d'action
     * @param {string|null} userId - Auteur de l'action
     * @param {Object|null} changes - Détail des modifications
     * @param {string|null} [date] - Date ISO (auto-générée si absente)
     */
    record(action, userId, changes, date = null) {
        this._entries.push(new HistoryEntry({ action, userId, changes, date }));
    }

    /**
     * Enregistre une mise à jour avec le diff des champs modifiés.
     *
     * @param {Object} changes - Ex: { title: { from: "A", to: "B" } }
     * @param {string|null} userId
     */
    recordUpdate(changes, userId) {
        if (Object.keys(changes).length > 0) {
            this.record('updated', userId, changes);
        }
    }

    /**
     * Enregistre l'ajout d'un commentaire.
     *
     * @param {string|null} authorId
     * @param {string} date - Date ISO du commentaire
     */
    recordComment(authorId, date) {
        this.record('commented', authorId, null, date);
    }

    /**
     * Enregistre la modification d'un commentaire.
     *
     * @param {string} oldText
     * @param {string} newText
     * @param {string|null} userId
     */
    recordCommentEdit(oldText, newText, userId) {
        this.record('comment_edited', userId, {
            comment: { from: oldText, to: newText },
        });
    }

    /**
     * Enregistre un déplacement entre colonnes.
     *
     * @param {string} fromColumnTitle
     * @param {string} toColumnTitle
     * @param {string|null} userId
     */
    recordMove(fromColumnTitle, toColumnTitle, userId) {
        this.record('moved', userId, {
            column: { from: fromColumnTitle, to: toColumnTitle },
        });
    }

    /**
     * Enregistre un réordonnancement dans la même colonne.
     *
     * @param {string} columnTitle
     * @param {number} fromIndex - Position 0-based
     * @param {number} toIndex - Position 0-based
     * @param {string|null} userId
     */
    recordReorder(columnTitle, fromIndex, toIndex, userId) {
        this.record('reordered', userId, {
            position: { from: fromIndex + 1, to: toIndex + 1 },
            column: { from: columnTitle, to: columnTitle },
        });
    }

    /**
     * Sérialise l'historique pour la persistance.
     *
     * @returns {Array}
     */
    toJSON() {
        return this._entries.map((entry) => entry.toJSON());
    }
}
