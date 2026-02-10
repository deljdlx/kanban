/**
 * NoteManager.js — Gestionnaire des notes d'un board.
 *
 * Gère le CRUD des notes et la synchronisation avec le Board.
 * Les notes sont stockées dans board.pluginData['board-notes'].
 *
 * Émet les hooks :
 *   - boardNotes:created : après création d'une note
 *   - boardNotes:updated : après modification d'une note
 *   - boardNotes:deleted : après suppression d'une note
 */
import Note from './Note.js';
import Hooks from '../../HookRegistry.js';

/**
 * Clé utilisée pour stocker les notes dans pluginData.
 */
const STORAGE_KEY = 'board-notes';

export default class NoteManager {
    /**
     * @type {import('../../../models/Board.js').default}
     */
    _board;

    /**
     * @type {Note[]}
     */
    _notes;

    /**
     * @param {import('../../../models/Board.js').default} board
     */
    constructor(board) {
        this._board = board;
        this._notes = [];
        this._load();
    }

    // ---------------------------------------------------------------
    // Getters
    // ---------------------------------------------------------------

    /**
     * Retourne toutes les notes (plus récentes en premier).
     *
     * @returns {Note[]}
     */
    get all() {
        return [...this._notes];
    }

    /**
     * Retourne le nombre de notes.
     *
     * @returns {number}
     */
    get count() {
        return this._notes.length;
    }

    // ---------------------------------------------------------------
    // CRUD
    // ---------------------------------------------------------------

    /**
     * Ajoute une nouvelle note.
     *
     * @param {Object} data
     * @param {string} data.title
     * @param {string} data.content
     * @param {string|null} [data.authorId]
     * @param {string} [data.authorName]
     * @returns {Note}
     */
    add({ title, content, authorId = null, authorName = 'Anonyme' }) {
        const note = new Note({ title, content, authorId, authorName });
        this._notes.unshift(note);
        this._save();

        Hooks.doAction('boardNotes:created', { note, board: this._board });

        return note;
    }

    /**
     * Met à jour une note existante.
     *
     * @param {string} noteId
     * @param {Object} updates
     * @param {string} [updates.title]
     * @param {string} [updates.content]
     * @returns {Note|null}
     */
    update(noteId, { title, content }) {
        const index = this._notes.findIndex((n) => n.id === noteId);
        if (index === -1) return null;

        const oldNote = this._notes[index];
        const updatedNote = oldNote.update({ title, content });
        this._notes[index] = updatedNote;
        this._save();

        Hooks.doAction('boardNotes:updated', { note: updatedNote, oldNote, board: this._board });

        return updatedNote;
    }

    /**
     * Supprime une note.
     *
     * @param {string} noteId
     * @returns {boolean}
     */
    delete(noteId) {
        const index = this._notes.findIndex((n) => n.id === noteId);
        if (index === -1) return false;

        const deletedNote = this._notes[index];
        this._notes.splice(index, 1);
        this._save();

        Hooks.doAction('boardNotes:deleted', { note: deletedNote, board: this._board });

        return true;
    }

    /**
     * Retrouve une note par son ID.
     *
     * @param {string} noteId
     * @returns {Note|null}
     */
    getById(noteId) {
        return this._notes.find((n) => n.id === noteId) || null;
    }

    // ---------------------------------------------------------------
    // Persistence
    // ---------------------------------------------------------------

    /**
     * Charge les notes depuis pluginData.
     *
     * @private
     */
    _load() {
        const data = this._board.pluginData[STORAGE_KEY];

        if (Array.isArray(data) && data.length > 0) {
            this._notes = data.map((item) => Note.fromJSON(item));
            return;
        }

        this._notes = [];
    }

    /**
     * Sauvegarde les notes dans pluginData.
     *
     * @private
     */
    _save() {
        this._board.setPluginData(
            STORAGE_KEY,
            this._notes.map((n) => n.toJSON()),
        );
    }
}
