/**
 * LocalStorageDriver — Driver IndexedDB pour le stockage des boards.
 *
 * Delegue toutes les operations a BoardStorage (IndexedDB).
 * C'est le driver par defaut utilise quand aucun backend n'est configure.
 */
import StorageDriver from './StorageDriver.js';
import boardStorage from './BoardStorage.js';

export default class LocalStorageDriver extends StorageDriver {
    /**
     * Retourne la liste des boards depuis le registre IndexedDB.
     *
     * @returns {Promise<Array<{ id: string, name: string, description: string, columnCount: number, cardCount: number, coverImageId: string|null, createdAt: string, updatedAt: string }>>}
     */
    async getBoardList() {
        const registry = await boardStorage.getRegistry();
        return registry.boards;
    }

    /**
     * Cree un nouveau board vide dans IndexedDB.
     *
     * @param {string} name - Nom du board
     * @returns {Promise<string>} ID du board cree
     */
    async createBoard(name) {
        return boardStorage.createBoard(name);
    }

    /**
     * Charge les donnees completes d'un board depuis IndexedDB.
     *
     * @param {string} boardId - ID du board
     * @returns {Promise<Object|null>}
     */
    async loadBoard(boardId) {
        return boardStorage.loadBoard(boardId);
    }

    /**
     * Sauvegarde les donnees d'un board dans IndexedDB.
     *
     * @param {string} boardId - ID du board
     * @param {Object} data - Donnees completes du board
     * @returns {Promise<void>}
     */
    async saveBoard(boardId, data) {
        return boardStorage.saveBoard(boardId, data);
    }

    /**
     * Supprime un board et ses donnees depuis IndexedDB.
     *
     * @param {string} boardId - ID du board
     * @returns {Promise<boolean>}
     */
    async deleteBoard(boardId) {
        return boardStorage.deleteBoard(boardId);
    }

    /**
     * Duplique un board dans IndexedDB.
     *
     * @param {string} boardId - ID du board source
     * @param {string} newName - Nom du nouveau board
     * @returns {Promise<string|null>} ID du nouveau board ou null
     */
    async duplicateBoard(boardId, newName) {
        return boardStorage.duplicateBoard(boardId, newName);
    }

    /**
     * Renomme un board dans IndexedDB.
     *
     * @param {string} boardId - ID du board
     * @param {string} newName - Nouveau nom
     * @returns {Promise<boolean>}
     */
    async renameBoard(boardId, newName) {
        return boardStorage.renameBoard(boardId, newName);
    }
}
