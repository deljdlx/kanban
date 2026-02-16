/**
 * StorageService — Facade unifiee pour le stockage.
 *
 * Delegue les operations board a un StorageDriver interchangeable :
 *   - LocalStorageDriver  (defaut) : IndexedDB via BoardStorage
 *   - BackendStorageDriver         : REST via httpClient
 *
 * Les settings globaux et les images restent toujours en IndexedDB local.
 *
 * Le board actif est stocke comme setting local ('storage:activeBoard')
 * au lieu du registre, pour etre independant du driver.
 *
 * @example
 * // Settings globaux (async, IndexedDB)
 * const theme = await StorageService.get('kanban:theme', 'light');
 * await StorageService.set('kanban:theme', 'dark');
 *
 * // Boards (async, delegue au driver actif)
 * const board = await StorageService.loadBoard(boardId);
 *
 * // Images (async, IndexedDB)
 * const url = await StorageService.getImageUrl(imageId);
 */
import Container from '../Container.js';
import { getDB, STORES } from './storage/Database.js';
import boardStorage from './storage/BoardStorage.js';
import imageStorage from './storage/IndexedDBImageStorage.js';
import LocalStorageDriver from './storage/LocalStorageDriver.js';

/** Cle IndexedDB pour le board actif */
const ACTIVE_BOARD_KEY = 'storage:activeBoard';

const StorageService = {
    /**
     * Indique si l'initialisation IndexedDB est terminee.
     * @type {boolean}
     */
    _initialized: false,

    /**
     * Driver actif pour les operations board.
     * @type {import('./storage/StorageDriver.js').default}
     */
    _driver: new LocalStorageDriver(),

    // ----------------------------------------------------------------
    // Initialisation
    // ----------------------------------------------------------------

    /**
     * Initialise la connexion IndexedDB.
     * Safe a appeler plusieurs fois.
     *
     * @returns {Promise<void>}
     */
    async init() {
        if (this._initialized) return;
        await getDB();
        this._initialized = true;
    },

    /**
     * Remplace le driver de stockage des boards.
     *
     * @param {import('./storage/StorageDriver.js').default} driver
     */
    setDriver(driver) {
        this._driver = driver;
    },

    /**
     * Indique si le driver actif est distant (pas le LocalStorageDriver par defaut).
     *
     * @returns {boolean}
     */
    isRemoteDriverActive() {
        return !(this._driver instanceof LocalStorageDriver);
    },

    /**
     * Retourne la liste des boards locaux (IndexedDB).
     * Utile quand le driver distant est actif pour afficher les deux sources.
     *
     * @returns {Promise<Array>}
     */
    async getLocalBoardList() {
        await this.init();
        const registry = await boardStorage.getRegistry();
        return registry.boards;
    },

    // ----------------------------------------------------------------
    // Settings globaux (IndexedDB - toujours local)
    // ----------------------------------------------------------------

    /**
     * Lit une valeur depuis IndexedDB.
     *
     * @param {string} key - Cle de stockage
     * @param {*} [defaultValue=null] - Valeur par defaut
     * @returns {Promise<*>}
     */
    async get(key, defaultValue = null) {
        await this.init();
        return boardStorage.getSetting(key, defaultValue);
    },

    /**
     * Ecrit une valeur dans IndexedDB.
     *
     * @param {string} key - Cle de stockage
     * @param {*} value - Valeur a stocker
     * @returns {Promise<void>}
     */
    async set(key, value) {
        await this.init();
        return boardStorage.setSetting(key, value);
    },

    /**
     * Supprime une cle de IndexedDB.
     *
     * @param {string} key
     * @returns {Promise<void>}
     */
    async remove(key) {
        await this.init();
        return boardStorage.deleteSetting(key);
    },

    // ----------------------------------------------------------------
    // Gestion Multi-Board (delegue au driver actif)
    // ----------------------------------------------------------------

    /**
     * Retourne le registre des boards.
     * Compose la liste depuis le driver + le board actif depuis le setting local.
     *
     * @returns {Promise<{ version: number, activeBoard: string|null, boards: Array }>}
     */
    async getBoardRegistry() {
        await this.init();
        const boards = await this._driver.getBoardList();
        const activeBoard = await this._getActiveBoard();
        return { version: 1, activeBoard, boards };
    },

    /**
     * Sauvegarde le registre des boards (local-only).
     * Utilise pour l'import/export. Ecrit directement dans IndexedDB.
     *
     * @param {Object} registry
     * @returns {Promise<void>}
     */
    async saveBoardRegistry(registry) {
        await this.init();
        return boardStorage.saveRegistry(registry);
    },

    /**
     * Cree un nouveau board via le driver et le marque comme actif.
     *
     * @param {string} [name='Nouveau Board']
     * @returns {Promise<string>} ID du board
     */
    async createBoard(name) {
        await this.init();
        const id = await this._driver.createBoard(name);
        await this._setActiveBoard(id);
        return id;
    },

    /**
     * Charge les donnees d'un board via le driver.
     *
     * @param {string} boardId
     * @returns {Promise<Object|null>}
     */
    async loadBoard(boardId) {
        await this.init();
        return this._driver.loadBoard(boardId);
    },

    /**
     * Sauvegarde les donnees d'un board via le driver.
     *
     * @param {string} boardId
     * @param {Object} data
     * @returns {Promise<void>}
     */
    async saveBoard(boardId, data) {
        await this.init();
        return this._driver.saveBoard(boardId, data);
    },

    /**
     * Supprime un board via le driver.
     * Ajuste le board actif si celui supprime etait l'actif.
     *
     * @param {string} boardId
     * @returns {Promise<boolean>}
     */
    async deleteBoard(boardId) {
        await this.init();
        const result = await this._driver.deleteBoard(boardId);

        // Si le board supprime etait l'actif, selectionne le premier restant
        const activeBoard = await this._getActiveBoard();
        if (activeBoard === boardId) {
            const boards = await this._driver.getBoardList();
            await this._setActiveBoard(boards.length > 0 ? boards[0].id : null);
        }

        return result;
    },

    /**
     * Duplique un board via le driver.
     *
     * @param {string} boardId
     * @param {string} [newName]
     * @returns {Promise<string|null>}
     */
    async duplicateBoard(boardId, newName) {
        await this.init();
        return this._driver.duplicateBoard(boardId, newName);
    },

    /**
     * Renomme un board via le driver.
     *
     * @param {string} boardId
     * @param {string} newName
     * @returns {Promise<boolean>}
     */
    async renameBoard(boardId, newName) {
        await this.init();
        return this._driver.renameBoard(boardId, newName);
    },

    /**
     * Definit le board actif (stocke en setting local).
     *
     * @param {string} boardId
     * @returns {Promise<void>}
     */
    async setActiveBoard(boardId) {
        await this.init();
        await this._setActiveBoard(boardId);
    },

    // ----------------------------------------------------------------
    // Board actif (setting local, independant du driver)
    // ----------------------------------------------------------------

    /**
     * Lit le board actif depuis le setting local.
     * Migration : si absent, lit depuis l'ancien registre local.
     *
     * @returns {Promise<string|null>}
     * @private
     */
    async _getActiveBoard() {
        let active = await this.get(ACTIVE_BOARD_KEY, null);
        if (!active) {
            // Migration : lit depuis l'ancien registre local
            const registry = await boardStorage.getRegistry();
            active = registry.activeBoard;
            if (active) {
                await this.set(ACTIVE_BOARD_KEY, active);
            }
        }
        return active;
    },

    /**
     * Ecrit le board actif dans le setting local.
     *
     * @param {string|null} boardId
     * @returns {Promise<void>}
     * @private
     */
    async _setActiveBoard(boardId) {
        await this.set(ACTIVE_BOARD_KEY, boardId);
    },

    // ----------------------------------------------------------------
    // Gestion Images (IndexedDB - toujours local)
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
     * Recupere une Object URL pour une image.
     *
     * @param {string} imageId
     * @returns {Promise<string|null>}
     */
    async getImageUrl(imageId) {
        await this.init();
        return imageStorage.getUrl(imageId);
    },

    /**
     * Recupere les donnees d'une image.
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
     * Recupere toutes les images d'un board.
     *
     * @param {string} boardId
     * @returns {Promise<Object[]>}
     */
    async getImagesByBoard(boardId) {
        await this.init();
        return imageStorage.getByBoard(boardId);
    },

    /**
     * Revoque toutes les Object URLs.
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
    // Explorer (outil dev — acces brut aux stores)
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
     * Retourne un record par cle dans un store.
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
