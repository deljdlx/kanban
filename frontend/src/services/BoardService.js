/**
 * BoardService — Charge et persiste les données du board.
 *
 * Singleton exporté. Gère le chargement et la sauvegarde des boards
 * via StorageService (multi-board). Le board actuel est tracké via
 * _currentBoardId. Après chaque modification structurelle, le board
 * est automatiquement sauvegardé.
 *
 * Changements multi-board :
 *   - fetchBoard(boardId) accepte un boardId
 *   - save() utilise _currentBoardId pour sauvegarder
 *   - getCurrentBoardId() retourne l'ID du board courant
 */
import Board from '../models/Board.js';
import Column from '../models/Column.js';
import Card from '../models/Card.js';
import StorageService from './StorageService.js';
import Hooks from '../plugins/HookRegistry.js';
import { generateId } from '../utils/id.js';

class BoardService {
    /**
     * Données brutes récupérées depuis l'API ou la persistence.
     * @type {{ columns: Array }|null}
     */
    _data;

    /**
     * Référence au Board model construit.
     * @type {import('../models/Board.js').default|null}
     */
    _board;

    /**
     * ID du board actuellement chargé.
     * @type {string|null}
     */
    _currentBoardId;

    /**
     * Handler lié pour Board 'change' (stocké pour off() au rebuild).
     * @type {Function|null}
     */
    _onBoardChangeBound;

    /**
     * Timer du debounce de sauvegarde (300 ms).
     * @type {number|null}
     */
    _saveTimeout;

    /**
     * Promise du save() en cours (null si aucun save en vol).
     * Permet de flush() avant fermeture tab.
     * @type {Promise<void>|null}
     */
    _savePending;

    /**
     * Quand true, les auto-saves déclenchés par les events 'change'
     * sont ignorés. Utilisé par LiveSyncPlugin pendant l'application
     * des opérations reçues d'un autre onglet.
     * @type {boolean}
     */
    _autoSavePaused;

    constructor() {
        this._data = null;
        this._board = null;
        this._currentBoardId = null;
        this._onBoardChangeBound = null;
        this._saveTimeout = null;
        this._savePending = null;
        this._autoSavePaused = false;
    }

    /**
     * Retourne l'ID du board actuellement chargé.
     *
     * @returns {string|null}
     */
    getCurrentBoardId() {
        return this._currentBoardId;
    }

    /**
     * Retourne le board actuellement chargé.
     *
     * @returns {import('../models/Board.js').default|null}
     */
    getBoard() {
        return this._board;
    }

    /**
     * Charge les données d'un board par son ID.
     * Priorité : StorageService (multi-board) → fetch `/api/board.json` → board vide.
     *
     * @param {string} boardId - ID du board à charger
     */
    async fetchBoard(boardId) {
        // Stocke l'ID du board courant
        this._currentBoardId = boardId;

        // Tente de charger depuis StorageService (multi-board)
        const persisted = await StorageService.loadBoard(boardId);
        if (persisted) {
            this._data = persisted;
            this._data = Hooks.applyFilters('board:afterLoad', this._data);
            return;
        }

        // Fallback : chargement depuis l'API (pour boards de démo)
        try {
            const response = await fetch('/api/board.json');
            if (!response.ok) throw new Error('HTTP ' + response.status);
            this._data = await response.json();
        } catch (error) {
            console.warn('BoardService : impossible de charger le board', error);
            this._data = { columns: [] };
        }
        this._data = Hooks.applyFilters('board:afterLoad', this._data);
    }

    /**
     * Construit et retourne un Board model hydraté à partir
     * des données chargées par `fetchBoard()`.
     *
     * Si un board existe déjà, ses listeners auto-save sont
     * retirés proprement avant de reconstruire.
     *
     * @returns {import('../models/Board.js').default}
     */
    buildBoard() {
        // Nettoie les listeners de l'ancien board avant d'en créer un nouveau
        this._teardownAutoSave();

        const columnsData = this._data?.columns || [];

        const columns = columnsData.map((colData) => {
            const cards = (colData.cards || []).map((cardData) => new Card(cardData));
            return new Column({ id: colData.id, title: colData.title, cards, pluginData: colData.pluginData || {} });
        });

        this._board = new Board(columns, {
            name: this._data?.name || 'Kanban',
            description: this._data?.description || '',
            coverImage: this._data?.coverImage || null,
            backgroundImage: this._data?.backgroundImage || null,
            pluginData: this._data?.pluginData || {},
        });
        this._setupAutoSave();

        return this._board;
    }

    /**
     * Charge et retourne le snapshot brut depuis la persistence,
     * sans construire de Board. Utilisé par LiveSyncPlugin pour
     * le fallback snapshot diff.
     *
     * @returns {Promise<Object|null>}
     */
    async loadSnapshot() {
        if (!this._currentBoardId) return null;
        return await StorageService.loadBoard(this._currentBoardId);
    }

    /**
     * Suspend les auto-saves déclenchés par les events 'change'.
     * Le timer en cours est annulé.
     */
    pauseAutoSave() {
        this._autoSavePaused = true;
        clearTimeout(this._saveTimeout);
    }

    /**
     * Reprend les auto-saves après un pauseAutoSave().
     */
    resumeAutoSave() {
        this._autoSavePaused = false;
    }

    /**
     * Sauvegarde l'état actuel du board via StorageService.
     */
    async save() {
        if (!this._board || !this._currentBoardId) return;

        let data = this._board.toJSON();
        data = Hooks.applyFilters('board:beforeSave', data);

        try {
            await StorageService.saveBoard(this._currentBoardId, data);
            Hooks.doAction('board:saved', { board: this._board });
        } catch (error) {
            console.warn('BoardService.save() : échec de la sauvegarde', error);
            Hooks.doAction('board:saveFailed', { error });
        }
    }

    // ---------------------------------------------------------------
    // Mutations centralisées
    // ---------------------------------------------------------------

    /**
     * Crée et ajoute une nouvelle colonne au board.
     *
     * @param {string} title - Titre de la colonne
     * @returns {import('../models/Column.js').default}
     */
    async addColumn(title) {
        const column = new Column({ id: generateId('col'), title, cards: [] });
        this._board.addColumn(column);
        Hooks.doAction('column:added', { column, board: this._board });
        await this.save();
        return column;
    }

    /**
     * Met à jour le titre d'une colonne.
     *
     * @param {string} columnId - Id de la colonne
     * @param {string} newTitle - Nouveau titre
     */
    updateColumnTitle(columnId, newTitle) {
        const column = this._board.getColumnById(columnId);
        if (!column) return;
        const oldTitle = column.title;
        column.updateTitle(newTitle);
        Hooks.doAction('column:renamed', { column, oldTitle, newTitle });
        // save via auto-save (column émet 'change')
    }

    /**
     * Supprime une colonne du board.
     *
     * Passe par le filtre `column:beforeRemove` qui peut bloquer la
     * suppression en retournant `false`. Si `targetColumnId` est fourni
     * et que la colonne contient des cartes, celles-ci sont migrées
     * vers la colonne cible avant suppression.
     *
     * @param {string} columnId - Id de la colonne à supprimer
     * @param {string|null} [targetColumnId=null] - Id de la colonne cible pour migrer les cartes
     * @returns {boolean} true si la suppression a été effectuée
     */
    async removeColumn(columnId, targetColumnId = null) {
        const column = this._board.getColumnById(columnId);
        if (!column) return false;

        // Filtre : les plugins peuvent bloquer la suppression
        const allowed = Hooks.applyFilters('column:beforeRemove', true, {
            column,
            board: this._board,
            targetColumnId,
        });
        if (allowed === false) return false;

        // Migrer les cartes vers la colonne cible.
        // On utilise replaceCards() en une seule opération pour éviter
        // N events 'change' (un par addCard) qui causeraient N re-renders.
        if (targetColumnId && column.count > 0) {
            const target = this._board.getColumnById(targetColumnId);
            if (target) {
                const merged = [...target.cards, ...column.cards];
                target.replaceCards(merged);
            }
        }

        this._board.removeColumn(columnId);
        Hooks.doAction('column:removed', { column, board: this._board });
        await this.save();
        return true;
    }

    /**
     * Crée et ajoute une carte dans une colonne.
     *
     * @param {string} columnId - Id de la colonne cible
     * @param {Object} cardData - Données brutes de la carte
     * @param {number} [index=0] - Position d'insertion
     * @returns {import('../models/Card.js').default|null}
     */
    async addCard(columnId, cardData, index = 0) {
        const column = this._board.getColumnById(columnId);
        if (!column) return null;
        const filtered = Hooks.applyFilters('card:beforeCreate', cardData);
        const card = new Card(filtered);
        column.addCard(card, index);
        Hooks.doAction('card:created', { card, column });
        await this.save();
        return card;
    }

    /**
     * Retire une carte d'une colonne.
     *
     * Passe par le filtre `card:beforeDelete` qui peut bloquer la
     * suppression en retournant `false` (ex: carte protégée).
     *
     * @param {string} columnId - Id de la colonne
     * @param {string} cardId - Id de la carte à retirer
     * @returns {import('../models/Card.js').default|null}
     */
    async removeCard(columnId, cardId) {
        const column = this._board.getColumnById(columnId);
        if (!column) return null;

        const card = column.getCardById(cardId);
        if (!card) return null;

        // Filtre : les plugins peuvent bloquer la suppression
        const allowed = Hooks.applyFilters('card:beforeDelete', true, { card, column });
        if (allowed === false) return null;

        column.removeCard(cardId);
        Hooks.doAction('card:deleted', { card, column });
        await this.save();
        return card;
    }

    /**
     * Déplace une carte entre deux colonnes.
     *
     * Passe par le filtre `card:beforeMove` qui peut bloquer le
     * déplacement en retournant `false`. Le DragDropHandler utilise
     * la valeur de retour pour savoir s'il doit restaurer le DOM.
     *
     * @param {string} cardId - Id de la carte
     * @param {string} fromColumnId - Id de la colonne source
     * @param {string} toColumnId - Id de la colonne cible
     * @param {number} newIndex - Position dans la colonne cible
     * @param {string|null} [userId=null] - Id de l'utilisateur
     * @returns {boolean} true si le déplacement a été effectué
     */
    moveCard(cardId, fromColumnId, toColumnId, newIndex, userId = null) {
        const fromColumn = this._board.getColumnById(fromColumnId);
        const toColumn = this._board.getColumnById(toColumnId);
        const result = this._board.getCardById(cardId);
        if (!fromColumn || !toColumn || !result) return false;

        // Filtre : les plugins peuvent bloquer le déplacement (ex: WIP limit)
        const allowed = Hooks.applyFilters('card:beforeMove', true, {
            card: result.card,
            fromColumn,
            toColumn,
            newIndex,
        });
        if (allowed === false) return false;

        this._board.moveCard(cardId, fromColumnId, toColumnId, newIndex, userId);
        // save via auto-save (Board.moveCard émet 2 events 'change',
        // le debounce les coalescera en un seul save)
        return true;
    }

    /**
     * Réordonne une carte dans la même colonne.
     *
     * Passe par le filtre `card:beforeMove` qui peut bloquer le
     * réordonnancement en retournant `false`.
     *
     * @param {string} columnId - Id de la colonne
     * @param {number} fromIndex - Position actuelle
     * @param {number} toIndex - Nouvelle position
     * @param {string|null} [userId=null] - Id de l'utilisateur
     * @returns {boolean} true si le déplacement a été effectué
     */
    moveCardInColumn(columnId, fromIndex, toIndex, userId = null) {
        const column = this._board.getColumnById(columnId);
        if (!column) return false;

        const card = column.cards[fromIndex];
        if (!card) return false;

        // Filtre : même colonne, mêmes règles
        const allowed = Hooks.applyFilters('card:beforeMove', true, {
            card,
            fromColumn: column,
            toColumn: column,
            newIndex: toIndex,
        });
        if (allowed === false) return false;

        column.moveCard(fromIndex, toIndex, userId);
        // save via auto-save (column émet 'change')
        return true;
    }

    // ---------------------------------------------------------------
    // Auto-save
    // ---------------------------------------------------------------

    /**
     * Écoute les événements 'change' du board pour déclencher une
     * sauvegarde automatique. Depuis que Board fait remonter les events
     * Column, un seul listener suffit (plus besoin de tracker chaque colonne).
     *
     * @private
     */
    _setupAutoSave() {
        this._onBoardChangeBound = () => this._debouncedSave();
        this._board.on('change', this._onBoardChangeBound);
    }

    /**
     * Debounce de la sauvegarde : attend 300 ms d'inactivité
     * avant de lancer un save(), évite les saves concurrents.
     *
     * La promise du save() est trackée dans _savePending pour
     * permettre flush() avant fermeture de tab.
     *
     * @private
     */
    _debouncedSave() {
        if (this._autoSavePaused) return;
        clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(async () => {
            this._savePending = this.save();
            try {
                await this._savePending;
            } catch (error) {
                console.error('BoardService._debouncedSave() : erreur inattendue', error);
            } finally {
                this._savePending = null;
            }
        }, 300);
    }

    /**
     * Attend que tous les saves en cours soient terminés.
     * Utile avant fermeture de tab ou changement de board.
     *
     * @returns {Promise<void>}
     */
    async flush() {
        // Annule le debounce et sauvegarde immédiatement
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
            this._saveTimeout = null;
            await this.save();
        }
        // Attend un save déjà en cours
        if (this._savePending) {
            await this._savePending;
        }
    }

    /**
     * Retire tous les listeners auto-save du board et des colonnes.
     * Appelé avant chaque rebuild pour éviter les doublons.
     *
     * @private
     */
    _teardownAutoSave() {
        if (!this._board) return;

        clearTimeout(this._saveTimeout);

        if (this._onBoardChangeBound) {
            this._board.off('change', this._onBoardChangeBound);
            this._onBoardChangeBound = null;
        }
    }
}

import Container from '../Container.js';

const boardService = new BoardService();
Container.set('BoardService', boardService);

export { BoardService };
export default boardService;
