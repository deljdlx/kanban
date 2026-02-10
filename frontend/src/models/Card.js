/**
 * Card — Modèle d'une carte du Kanban.
 *
 * Objet de données représentant une tâche avec un titre,
 * une description et des tags multi-taxonomie.
 *
 * Format des tags : { taxonomy: [term, ...], ... }
 * Exemple : { type: ['feature', 'ux'], priority: ['high'] }
 *
 * Types de cartes :
 *   - 'standard' : carte classique (titre, description, tags)
 *   - 'widget:*' : carte spéciale gérée par un plugin (ex: 'widget:counter')
 *
 * Composants extraits :
 *   - CardHistory : gestion de l'historique
 *   - CardComments : gestion des commentaires
 */
import CardHistory from './CardHistory.js';
import CardComments from './CardComments.js';

export default class Card {
    /** @type {string} */
    _id;

    /** @type {string} */
    _title;

    /** @type {string} */
    _description;

    /** @type {string} */
    _summary;

    /** @type {Object<string, string[]>} */
    _tags;

    /** @type {string|null} */
    _assignee;

    /** @type {string|null} */
    _author;

    /** @type {string} */
    _createdAt;

    /** @type {CardHistory} */
    _history;

    /** @type {CardComments} */
    _comments;

    /** @type {{ id: string, url?: string }|null} */
    _image;

    /** @type {string} */
    _type;

    /** @type {Object} */
    _data;

    /**
     * @param {Object} data
     */
    constructor({
        id,
        title,
        description,
        summary = '',
        tags,
        assignee = null,
        author = null,
        createdAt = null,
        history = null,
        comments = null,
        image = null,
        type = 'standard',
        data = null,
    }) {
        this._id = id;
        this._title = title;
        this._description = description;
        this._summary = summary || '';
        this._assignee = assignee;
        this._author = author;
        this._createdAt = createdAt || new Date().toISOString();
        this._tags = this._cloneTags(tags);
        this._history = new CardHistory(history, this._createdAt, this._author);
        this._comments = new CardComments(comments);
        this._image = image ? { ...image } : null;
        this._type = type;
        this._data = data ? { ...data } : {};
    }

    // ---------------------------------------------------------------
    // Getters
    // ---------------------------------------------------------------

    get id() {
        return this._id;
    }
    get title() {
        return this._title;
    }
    get description() {
        return this._description;
    }
    get summary() {
        return this._summary;
    }
    get assignee() {
        return this._assignee;
    }
    get author() {
        return this._author;
    }
    get createdAt() {
        return this._createdAt;
    }
    get type() {
        return this._type;
    }

    get history() {
        return this._history.getAll();
    }
    get comments() {
        return this._comments.getAll();
    }
    get tags() {
        return this._cloneTags(this._tags);
    }
    get data() {
        return { ...this._data };
    }

    get image() {
        return this._image ? { ...this._image } : null;
    }
    set image(image) {
        this._image = image ? { ...image } : null;
    }

    get imageId() {
        return this._image?.id || null;
    }

    // ---------------------------------------------------------------
    // Actions
    // ---------------------------------------------------------------

    /**
     * Met à jour les champs modifiables de la carte.
     *
     * @param {Object} data
     */
    update({ title, description, summary, tags, assignee = null, userId = null }) {
        const changes = this._buildDiff({ title, description, summary, tags, assignee });

        this._title = title;
        this._description = description;
        this._summary = summary || '';
        this._assignee = assignee;
        this._tags = this._cloneTags(tags);

        this._history.recordUpdate(changes, userId);
    }

    /**
     * Ajoute un commentaire à la carte.
     *
     * @param {import('./Comment.js').default} comment
     */
    addComment(comment) {
        this._comments.add(comment);
        this._history.recordComment(comment.authorId, comment.date);
    }

    /**
     * Met à jour le texte d'un commentaire existant.
     *
     * @param {string} commentId
     * @param {string} newText
     * @param {string|null} userId
     */
    updateComment(commentId, newText, userId = null) {
        const result = this._comments.updateText(commentId, newText);
        if (result) {
            this._history.recordCommentEdit(result.oldText, newText, userId);
        }
    }

    /**
     * Enregistre un déplacement entre colonnes.
     *
     * @param {string} fromColumnTitle
     * @param {string} toColumnTitle
     * @param {string|null} userId
     */
    recordMove(fromColumnTitle, toColumnTitle, userId = null) {
        this._history.recordMove(fromColumnTitle, toColumnTitle, userId);
    }

    /**
     * Enregistre un réordonnancement dans la même colonne.
     *
     * @param {string} columnTitle
     * @param {number} fromIndex
     * @param {number} toIndex
     * @param {string|null} userId
     */
    recordReorder(columnTitle, fromIndex, toIndex, userId = null) {
        this._history.recordReorder(columnTitle, fromIndex, toIndex, userId);
    }

    /**
     * Met à jour les données libres (widgets).
     *
     * @param {Object} newData
     */
    updateData(newData) {
        this._data = { ...this._data, ...newData };
    }

    /**
     * Retourne une représentation brute de la carte.
     *
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this._id,
            title: this._title,
            description: this._description,
            summary: this._summary,
            tags: this._cloneTags(this._tags),
            assignee: this._assignee,
            author: this._author,
            createdAt: this._createdAt,
            history: this._history.toJSON(),
            comments: this._comments.toJSON(),
            image: this._image ? { ...this._image } : null,
            type: this._type,
            data: { ...this._data },
        };
    }

    // ---------------------------------------------------------------
    // Privé
    // ---------------------------------------------------------------

    /**
     * Copie profonde d'un objet tags.
     *
     * @param {Object<string, string[]>} tags
     * @returns {Object<string, string[]>}
     * @private
     */
    _cloneTags(tags) {
        if (!tags) return {};
        const copy = {};
        for (const [taxonomy, terms] of Object.entries(tags)) {
            copy[taxonomy] = [...terms];
        }
        return copy;
    }

    /**
     * Compare les nouvelles valeurs avec l'état actuel.
     *
     * @param {Object} newData
     * @returns {Object}
     * @private
     */
    _buildDiff({ title, description, summary, tags, assignee }) {
        const changes = {};

        if (title !== this._title) {
            changes.title = { from: this._title, to: title };
        }

        if (description !== this._description) {
            changes.description = { from: this._description, to: description };
        }

        if ((summary || '') !== this._summary) {
            changes.summary = { from: this._summary, to: summary || '' };
        }

        if (assignee !== this._assignee) {
            changes.assignee = { from: this._assignee, to: assignee };
        }

        const oldTagsJson = JSON.stringify(this._tags);
        const newTagsCopy = this._cloneTags(tags);
        if (JSON.stringify(newTagsCopy) !== oldTagsJson) {
            changes.tags = { from: this._tags, to: newTagsCopy };
        }

        return changes;
    }
}
