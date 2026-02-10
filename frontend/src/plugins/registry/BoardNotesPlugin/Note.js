/**
 * Note.js — Entité représentant une note du board.
 *
 * Structure de données immutable avec méthodes de mise à jour
 * qui retournent une nouvelle instance.
 */

import { generateId } from '../../../utils/id.js';

export default class Note {
    /**
     * @type {string}
     */
    _id;

    /**
     * @type {string}
     */
    _title;

    /**
     * @type {string}
     */
    _content;

    /**
     * @type {string|null}
     */
    _authorId;

    /**
     * @type {string}
     */
    _authorName;

    /**
     * @type {string}
     */
    _createdAt;

    /**
     * @type {string}
     */
    _updatedAt;

    /**
     * @param {Object} data
     * @param {string} [data.id]
     * @param {string} [data.title]
     * @param {string} [data.content]
     * @param {string|null} [data.authorId]
     * @param {string} [data.authorName]
     * @param {string} [data.createdAt]
     * @param {string} [data.updatedAt]
     */
    constructor({
        id = null,
        title = '',
        content = '',
        authorId = null,
        authorName = 'Anonyme',
        createdAt = null,
        updatedAt = null,
    } = {}) {
        const now = new Date().toISOString();

        this._id = id || generateId('note');
        this._title = title;
        this._content = content;
        this._authorId = authorId;
        this._authorName = authorName;
        this._createdAt = createdAt || now;
        this._updatedAt = updatedAt || now;
    }

    // --- Getters ---

    get id() {
        return this._id;
    }

    get title() {
        return this._title;
    }

    get content() {
        return this._content;
    }

    get authorId() {
        return this._authorId;
    }

    get authorName() {
        return this._authorName;
    }

    get createdAt() {
        return this._createdAt;
    }

    get updatedAt() {
        return this._updatedAt;
    }

    /**
     * Retourne le titre ou un placeholder si vide.
     *
     * @returns {string}
     */
    get displayTitle() {
        return this._title || 'Sans titre';
    }

    // --- Méthodes ---

    /**
     * Crée une copie mise à jour de la note.
     *
     * @param {Object} updates
     * @param {string} [updates.title]
     * @param {string} [updates.content]
     * @returns {Note}
     */
    update({ title, content }) {
        return new Note({
            id: this._id,
            title: title !== undefined ? title : this._title,
            content: content !== undefined ? content : this._content,
            authorId: this._authorId,
            authorName: this._authorName,
            createdAt: this._createdAt,
            updatedAt: new Date().toISOString(),
        });
    }

    /**
     * Sérialise la note en objet plain.
     *
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this._id,
            title: this._title,
            content: this._content,
            authorId: this._authorId,
            authorName: this._authorName,
            createdAt: this._createdAt,
            updatedAt: this._updatedAt,
        };
    }

    /**
     * Crée une Note depuis un objet plain (ex: données persistées).
     *
     * @param {Object} data
     * @returns {Note}
     */
    static fromJSON(data) {
        return new Note(data);
    }
}
