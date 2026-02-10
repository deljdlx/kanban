/**
 * StorageService — Facade unifiée pour le stockage IndexedDB.
 *
 * Toutes les données sont stockées dans IndexedDB via idb :
 *   - meta    : settings globaux, registre des boards
 *   - boards  : données complètes de chaque board
 *   - images  : blobs des images avec indexes
 *
 * TOUTES les méthodes sont async pour compatibilité future avec
 * un backend API.
 *
 * @example
 * // Settings globaux (async, IndexedDB)
 * const theme = await StorageService.get('kanban:theme', 'light');
 * await StorageService.set('kanban:theme', 'dark');
 *
 * // Boards (async, IndexedDB)
 * const board = await StorageService.loadBoard(boardId);
 *
 * // Images (async, IndexedDB)
 * const url = await StorageService.getImageUrl(imageId);
 */
import Container from '../Container.js';
import { getDB, STORES } from './storage/Database.js';
import boardStorage from './storage/BoardStorage.js';
import imageStorage from './storage/IndexedDBImageStorage.js';

const StorageService = {
    /**
     * Indique si l'initialisation IndexedDB est terminée.
     * @type {boolean}
     */
    _initialized: false,

    // ----------------------------------------------------------------
    // Initialisation
    // ----------------------------------------------------------------

    /**
     * Initialise la connexion IndexedDB.
     * Safe à appeler plusieurs fois.
     *
     * @returns {Promise<void>}
     */
    async init() {
        if (this._initialized) return;
        await getDB();
        this._initialized = true;
    },

    // ----------------------------------------------------------------
    // Settings globaux (IndexedDB - async)
    // ----------------------------------------------------------------

    /**
     * Lit une valeur depuis IndexedDB.
     *
     * @param {string} key - Clé de stockage
     * @param {*} [defaultValue=null] - Valeur par défaut
     * @returns {Promise<*>}
     */
    async get(key, defaultValue = null) {
        await this.init();
        return boardStorage.getSetting(key, defaultValue);
    },

    /**
     * Écrit une valeur dans IndexedDB.
     *
     * @param {string} key - Clé de stockage
     * @param {*} value - Valeur à stocker
     * @returns {Promise<void>}
     */
    async set(key, value) {
        await this.init();
        return boardStorage.setSetting(key, value);
    },

    /**
     * Supprime une clé de IndexedDB.
     *
     * @param {string} key
     * @returns {Promise<void>}
     */
    async remove(key) {
        await this.init();
        return boardStorage.deleteSetting(key);
    },

    // ----------------------------------------------------------------
    // Gestion Multi-Board (IndexedDB - async)
    // ----------------------------------------------------------------

    /**
     * Retourne le registre des boards.
     *
     * @returns {Promise<Object>}
     */
    async getBoardRegistry() {
        await this.init();
        return boardStorage.getRegistry();
    },

    /**
     * Sauvegarde le registre des boards.
     *
     * @param {Object} registry
     * @returns {Promise<void>}
     */
    async saveBoardRegistry(registry) {
        await this.init();
        return boardStorage.saveRegistry(registry);
    },

    /**
     * Crée un nouveau board.
     *
     * @param {string} [name='Nouveau Board']
     * @returns {Promise<string>} ID du board
     */
    async createBoard(name) {
        await this.init();
        return boardStorage.createBoard(name);
    },

    /**
     * Charge les données d'un board.
     *
     * @param {string} boardId
     * @returns {Promise<Object|null>}
     */
    async loadBoard(boardId) {
        await this.init();
        return boardStorage.loadBoard(boardId);
    },

    /**
     * Sauvegarde les données d'un board.
     *
     * @param {string} boardId
     * @param {Object} data
     * @returns {Promise<void>}
     */
    async saveBoard(boardId, data) {
        await this.init();
        return boardStorage.saveBoard(boardId, data);
    },

    /**
     * Supprime un board et ses données.
     *
     * @param {string} boardId
     * @returns {Promise<boolean>}
     */
    async deleteBoard(boardId) {
        await this.init();
        return boardStorage.deleteBoard(boardId);
    },

    /**
     * Duplique un board.
     *
     * @param {string} boardId
     * @param {string} [newName]
     * @returns {Promise<string|null>}
     */
    async duplicateBoard(boardId, newName) {
        await this.init();
        return boardStorage.duplicateBoard(boardId, newName);
    },

    /**
     * Renomme un board.
     *
     * @param {string} boardId
     * @param {string} newName
     * @returns {Promise<boolean>}
     */
    async renameBoard(boardId, newName) {
        await this.init();
        return boardStorage.renameBoard(boardId, newName);
    },

    /**
     * Définit le board actif.
     *
     * @param {string} boardId
     * @returns {Promise<boolean>}
     */
    async setActiveBoard(boardId) {
        await this.init();
        return boardStorage.setActiveBoard(boardId);
    },

    // ----------------------------------------------------------------
    // Gestion Images (IndexedDB - async)
    // ----------------------------------------------------------------

    /**
     * Stocke une image.
     *
     * @param {Object} imageData
     * @param {Blob} imageData.blob
     * @param {string} imageData.boardId
     * @param {string|null} [imageData.cardId]
     * @param {string} imageData.mimeType
     * @returns {Promise<string>} ID de l'image
     */
    async storeImage(imageData) {
        await this.init();
        return imageStorage.store(imageData);
    },

    /**
     * Récupère une Object URL pour une image.
     *
     * @param {string} imageId
     * @returns {Promise<string|null>}
     */
    async getImageUrl(imageId) {
        await this.init();
        return imageStorage.getUrl(imageId);
    },

    /**
     * Récupère les données d'une image.
     *
     * @param {string} imageId
     * @returns {Promise<Object|null>}
     */
    async getImage(imageId) {
        await this.init();
        return imageStorage.get(imageId);
    },

    /**
     * Supprime une image.
     *
     * @param {string} imageId
     * @returns {Promise<boolean>}
     */
    async deleteImage(imageId) {
        await this.init();
        return imageStorage.delete(imageId);
    },

    /**
     * Récupère toutes les images d'un board.
     *
     * @param {string} boardId
     * @returns {Promise<Object[]>}
     */
    async getImagesByBoard(boardId) {
        await this.init();
        return imageStorage.getByBoard(boardId);
    },

    /**
     * Révoque toutes les Object URLs.
     */
    revokeAllImageUrls() {
        imageStorage.revokeAllUrls();
    },

    /**
     * Convertit un blob en data URL.
     *
     * @param {Blob} blob
     * @returns {Promise<string>}
     */
    async blobToDataUrl(blob) {
        return imageStorage.blobToDataUrl(blob);
    },

    /**
     * Convertit une data URL en blob.
     *
     * @param {string} dataUrl
     * @returns {Blob}
     */
    dataUrlToBlob(dataUrl) {
        return imageStorage.dataUrlToBlob(dataUrl);
    },

    // ----------------------------------------------------------------
    // Explorer (outil dev — accès brut aux stores)
    // ----------------------------------------------------------------

    /**
     * Noms des stores IndexedDB.
     * @type {{ META: string, BOARDS: string, IMAGES: string }}
     */
    STORES,

    /**
     * Compte les records dans un store.
     *
     * @param {string} storeName
     * @returns {Promise<number>}
     */
    async countRecords(storeName) {
        const db = await getDB();
        return db.count(storeName);
    },

    /**
     * Retourne tous les records d'un store.
     *
     * @param {string} storeName
     * @returns {Promise<Object[]>}
     */
    async getAllRecords(storeName) {
        const db = await getDB();
        return db.getAll(storeName);
    },

    /**
     * Retourne un record par clé dans un store.
     *
     * @param {string} storeName
     * @param {string} key
     * @returns {Promise<Object|undefined>}
     */
    async getRecord(storeName, key) {
        const db = await getDB();
        return db.get(storeName, key);
    },
};

Container.set('StorageService', StorageService);

export default StorageService;
