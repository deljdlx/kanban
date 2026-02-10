/**
 * CardComments — Gestion des commentaires d'une carte.
 *
 * Encapsule le tableau de Comment et fournit les méthodes
 * pour ajouter, modifier et lister les commentaires.
 */
import Comment from './Comment.js';

export default class CardComments {
    /**
     * @type {Comment[]}
     */
    _comments;

    /**
     * @param {Array} [rawComments] - Commentaires bruts depuis l'API
     */
    constructor(rawComments = null) {
        this._comments = (rawComments || []).map((raw) => new Comment(raw));
    }

    /**
     * Retourne une copie du tableau de commentaires.
     *
     * @returns {Comment[]}
     */
    getAll() {
        return [...this._comments];
    }

    /**
     * Retourne le nombre de commentaires.
     *
     * @returns {number}
     */
    get count() {
        return this._comments.length;
    }

    /**
     * Ajoute un commentaire.
     *
     * @param {Comment} comment
     */
    add(comment) {
        this._comments.push(comment);
    }

    /**
     * Trouve un commentaire par son ID.
     *
     * @param {string} commentId
     * @returns {Comment|undefined}
     */
    findById(commentId) {
        return this._comments.find((c) => c.id === commentId);
    }

    /**
     * Met à jour le texte d'un commentaire existant.
     *
     * @param {string} commentId
     * @param {string} newText
     * @returns {{ oldText: string, comment: Comment }|null} - null si non trouvé
     */
    updateText(commentId, newText) {
        const comment = this.findById(commentId);
        if (!comment) return null;

        const oldText = comment.text;
        comment.updateText(newText);

        return { oldText, comment };
    }

    /**
     * Sérialise les commentaires pour la persistance.
     *
     * @returns {Array}
     */
    toJSON() {
        return this._comments.map((comment) => comment.toJSON());
    }
}
