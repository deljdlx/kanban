/**
 * BoardStorage — CRUD pour la gestion multi-board via IndexedDB.
 *
 * Utilise idb pour un accès simplifié à IndexedDB. Toutes les données
 * des boards sont stockées dans IndexedDB (plus de limite 5MB).
 *
 * @example
 * import boardStorage from './BoardStorage.js';
 *
 * const registry = await boardStorage.getRegistry();
 * const boardId = await boardStorage.createBoard('Mon Board');
 * const board = await boardStorage.loadBoard(boardId);
 */
import { getDB, STORES, META_KEYS } from './Database.js';
import { generateId } from '../../utils/id.js';

/**
 * Version actuelle du format de données.
 */
const REGISTRY_VERSION = 1;
const BOARD_VERSION = 1;

const BoardStorage = {
    // ---------------------------------------------------------------
    // Registre des boards
    // ---------------------------------------------------------------

    /**
     * Retourne le registre des boards.
     * Crée un registre vide si aucun n'existe.
     *
     * @returns {Promise<BoardRegistry>}
     *
     * @typedef {Object} BoardRegistry
     * @property {number} version - Version du format
     * @property {string|null} activeBoard - ID du board actif
     * @property {BoardMeta[]} boards - Liste des boards
     *
     * @typedef {Object} BoardMeta
     * @property {string} id - ID unique du board
     * @property {string} name - Nom du board
     * @property {string} description - Description du board
     * @property {string|null} coverImageId - ID de l'image de couverture
     * @property {string} createdAt - Date ISO de création
     * @property {string} updatedAt - Date ISO de dernière modification
     * @property {number} cardCount - Nombre de cartes
     * @property {number} columnCount - Nombre de colonnes
     */
    async getRegistry() {
        const db = await getDB();
        const record = await db.get(STORES.META, META_KEYS.REGISTRY);

        if (!record) {
            return this._createEmptyRegistry();
        }

        return record.value;
    },

    /**
     * Sauvegarde le registre des boards.
     *
     * @param {BoardRegistry} registry
     * @returns {Promise<void>}
     */
    async saveRegistry(registry) {
        const db = await getDB();
        registry.version = REGISTRY_VERSION;
        await db.put(STORES.META, { key: META_KEYS.REGISTRY, value: registry });
    },

    // ---------------------------------------------------------------
    // CRUD Boards
    // ---------------------------------------------------------------

    /**
     * Crée un nouveau board vide.
     *
     * @param {string} [name='Nouveau Board'] - Nom du board
     * @returns {Promise<string>} ID du board créé
     */
    async createBoard(name = 'Nouveau Board') {
        const registry = await this.getRegistry();

        const boardId = generateId('board');
        const now = new Date().toISOString();

        // Ajoute au registre
        const meta = {
            id: boardId,
            name,
            description: '',
            coverImageId: null,
            createdAt: now,
            updatedAt: now,
            cardCount: 0,
            columnCount: 0,
        };
        registry.boards.push(meta);
        registry.activeBoard = boardId;

        // Crée les données vides du board
        const boardData = {
            version: BOARD_VERSION,
            id: boardId,
            name,
            description: '',
            coverImage: null,
            backgroundImage: null,
            columns: [],
            pluginData: {},
        };

        // Sauvegarde tout
        await this.saveBoard(boardId, boardData);
        await this.saveRegistry(registry);

        return boardId;
    },

    /**
     * Charge les données complètes d'un board.
     *
     * @param {string} boardId - ID du board
     * @returns {Promise<BoardData|null>}
     *
     * @typedef {Object} BoardData
     * @property {number} version - Version du format
     * @property {string} id - ID du board
     * @property {string} name - Nom du board
     * @property {string} description - Description du board
     * @property {{ id: string }|null} coverImage - Référence image de couverture
     * @property {Object|null} backgroundImage - { id } référence image
     * @property {Array} columns - Colonnes avec cartes
     * @property {Object} pluginData - Données des plugins
     */
    async loadBoard(boardId) {
        if (!boardId) return null;

        const db = await getDB();
        return (await db.get(STORES.BOARDS, boardId)) || null;
    },

    /**
     * Sauvegarde les données d'un board.
     * Met à jour les métadonnées dans le registre.
     *
     * @param {string} boardId - ID du board
     * @param {BoardData} data - Données à sauvegarder
     * @returns {Promise<void>}
     */
    async saveBoard(boardId, data) {
        const db = await getDB();

        // Assure la version et l'ID
        data.version = BOARD_VERSION;
        data.id = boardId;

        await db.put(STORES.BOARDS, data);

        // Met à jour les métadonnées du registre
        await this._updateBoardMeta(boardId, data);
    },

    /**
     * Supprime un board et toutes ses données associées.
     *
     * @param {string} boardId - ID du board à supprimer
     * @returns {Promise<boolean>} true si supprimé
     */
    async deleteBoard(boardId) {
        const db = await getDB();
        const registry = await this.getRegistry();

        // Vérifie que le board existe
        const index = registry.boards.findIndex((b) => b.id === boardId);
        if (index === -1) return false;

        // Supprime du registre
        registry.boards.splice(index, 1);

        // Gère le board actif
        if (registry.activeBoard === boardId) {
            registry.activeBoard = registry.boards.length > 0 ? registry.boards[0].id : null;
        }

        // Supprime les données du board
        await db.delete(STORES.BOARDS, boardId);

        // Supprime les images du board
        await this._deleteImagesByBoard(boardId);

        await this.saveRegistry(registry);

        return true;
    },

    /**
     * Duplique un board existant.
     *
     * @param {string} boardId - ID du board source
     * @param {string} [newName] - Nom du nouveau board
     * @returns {Promise<string|null>} ID du nouveau board ou null
     */
    async duplicateBoard(boardId, newName = null) {
        const sourceData = await this.loadBoard(boardId);
        if (!sourceData) return null;

        const registry = await this.getRegistry();
        const sourceMeta = registry.boards.find((b) => b.id === boardId);

        const newBoardId = generateId('board');
        const now = new Date().toISOString();
        const name = newName || `${sourceMeta?.name || sourceData.name} (copie)`;

        // Clone les données
        const newData = JSON.parse(JSON.stringify(sourceData));
        newData.id = newBoardId;
        newData.name = name;

        // Régénère les IDs des colonnes et cartes
        newData.columns = newData.columns.map((col) => ({
            ...col,
            id: generateId('col'),
            cards: col.cards.map((card) => ({
                ...card,
                id: generateId('card'),
                image: null, // Images non dupliquées pour l'instant
            })),
        }));

        // Ajoute au registre
        const meta = {
            id: newBoardId,
            name,
            description: newData.description || '',
            coverImageId: newData.coverImage?.id || null,
            createdAt: now,
            updatedAt: now,
            cardCount: this._countCards(newData),
            columnCount: newData.columns.length,
        };
        registry.boards.push(meta);

        // Sauvegarde
        await this.saveBoard(newBoardId, newData);
        await this.saveRegistry(registry);

        return newBoardId;
    },

    /**
     * Renomme un board.
     *
     * @param {string} boardId - ID du board
     * @param {string} newName - Nouveau nom
     * @returns {Promise<boolean>}
     */
    async renameBoard(boardId, newName) {
        const data = await this.loadBoard(boardId);
        if (!data) return false;

        data.name = newName;
        await this.saveBoard(boardId, data);

        return true;
    },

    /**
     * Définit le board actif.
     *
     * @param {string} boardId - ID du board
     * @returns {Promise<boolean>}
     */
    async setActiveBoard(boardId) {
        const registry = await this.getRegistry();

        const exists = registry.boards.some((b) => b.id === boardId);
        if (!exists) return false;

        registry.activeBoard = boardId;
        await this.saveRegistry(registry);

        return true;
    },

    // ---------------------------------------------------------------
    // Settings globaux
    // ---------------------------------------------------------------

    /**
     * Récupère un setting global.
     *
     * @param {string} key - Clé du setting
     * @param {*} [defaultValue=null] - Valeur par défaut
     * @returns {Promise<*>}
     */
    async getSetting(key, defaultValue = null) {
        const db = await getDB();
        const record = await db.get(STORES.META, `setting:${key}`);
        return record ? record.value : defaultValue;
    },

    /**
     * Sauvegarde un setting global.
     *
     * @param {string} key - Clé du setting
     * @param {*} value - Valeur
     * @returns {Promise<void>}
     */
    async setSetting(key, value) {
        const db = await getDB();
        await db.put(STORES.META, { key: `setting:${key}`, value });
    },

    /**
     * Supprime un setting global.
     *
     * @param {string} key - Clé du setting
     * @returns {Promise<void>}
     */
    async deleteSetting(key) {
        const db = await getDB();
        await db.delete(STORES.META, `setting:${key}`);
    },

    // ---------------------------------------------------------------
    // Privé
    // ---------------------------------------------------------------

    /**
     * Crée un registre vide.
     *
     * @returns {BoardRegistry}
     * @private
     */
    _createEmptyRegistry() {
        return {
            version: REGISTRY_VERSION,
            activeBoard: null,
            boards: [],
        };
    },

    /**
     * Met à jour les métadonnées d'un board dans le registre.
     *
     * @param {string} boardId
     * @param {BoardData} data
     * @returns {Promise<void>}
     * @private
     */
    async _updateBoardMeta(boardId, data) {
        const registry = await this.getRegistry();
        const meta = registry.boards.find((b) => b.id === boardId);

        if (meta) {
            meta.name = data.name;
            meta.description = data.description || '';
            meta.coverImageId = data.coverImage?.id || null;
            meta.updatedAt = new Date().toISOString();
            meta.cardCount = this._countCards(data);
            meta.columnCount = data.columns?.length || 0;
            await this.saveRegistry(registry);
        }
    },

    /**
     * Supprime toutes les images d'un board.
     *
     * @param {string} boardId
     * @returns {Promise<void>}
     * @private
     */
    async _deleteImagesByBoard(boardId) {
        const db = await getDB();
        const tx = db.transaction(STORES.IMAGES, 'readwrite');
        const index = tx.store.index('by-board');

        let cursor = await index.openCursor(IDBKeyRange.only(boardId));
        while (cursor) {
            await cursor.delete();
            cursor = await cursor.continue();
        }

        await tx.done;
    },

    /**
     * Compte le nombre de cartes dans un board.
     *
     * @param {BoardData} data
     * @returns {number}
     * @private
     */
    _countCards(data) {
        if (!data.columns) return 0;
        return data.columns.reduce((sum, col) => sum + (col.cards?.length || 0), 0);
    },
};

export default BoardStorage;
