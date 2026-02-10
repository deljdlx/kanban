/**
 * Comment — Entité représentant un commentaire sur une carte.
 *
 * L'ID, l'auteur et la date sont immuables.
 * Le texte peut être modifié via `updateText()`.
 * L'ID est auto-généré si absent (préfixe "comment-" + timestamp).
 *
 * Le champ `files` est optionnel : les anciens commentaires sans fichiers
 * reçoivent un tableau vide (backward-compatible).
 */
import { generateId } from '../utils/id.js';

export default class Comment {
    /**
     * @type {string}
     */
    _id;

    /**
     * @type {string}
     */
    _text;

    /**
     * @type {string|null}
     */
    _authorId;

    /**
     * @type {string}
     */
    _date;

    /**
     * Fichiers joints au commentaire.
     * @type {Array<{ id: string, name: string, size: number, mimeType: string }>}
     */
    _files;

    /**
     * @param {Object} data
     * @param {string}      [data.id]       - Identifiant unique (auto-généré si absent)
     * @param {string}       data.text      - Contenu du commentaire
     * @param {string|null} [data.authorId] - ID de l'auteur
     * @param {string}      [data.date]     - Date ISO (auto-généré si absent)
     * @param {Array}       [data.files]    - Fichiers joints (défaut: [])
     */
    constructor({ id = null, text, authorId = null, date = null, files = null }) {
        this._id = id || generateId('comment');
        this._text = text;
        this._authorId = authorId;
        this._date = date || new Date().toISOString();
        this._files = Array.isArray(files) ? files.map((f) => ({ ...f })) : [];
    }

    /** @returns {string} */
    get id() {
        return this._id;
    }

    /** @returns {string} */
    get text() {
        return this._text;
    }

    /** @returns {string|null} */
    get authorId() {
        return this._authorId;
    }

    /** @returns {string} Date ISO */
    get date() {
        return this._date;
    }

    /**
     * Retourne une copie défensive des fichiers joints.
     *
     * @returns {Array<{ id: string, name: string, size: number, mimeType: string }>}
     */
    get files() {
        return this._files.map((f) => ({ ...f }));
    }

    /**
     * Met à jour le texte du commentaire.
     *
     * @param {string} newText
     */
    updateText(newText) {
        this._text = newText;
    }

    /**
     * Retourne une représentation brute du commentaire,
     * compatible avec le format attendu par le constructeur.
     *
     * @returns {{ id: string, text: string, authorId: string|null, date: string, files: Array }}
     */
    toJSON() {
        return {
            id: this._id,
            text: this._text,
            authorId: this._authorId,
            date: this._date,
            files: this._files.map((f) => ({ ...f })),
        };
    }
}
