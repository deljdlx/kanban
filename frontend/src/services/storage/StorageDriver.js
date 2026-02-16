/**
 * StorageDriver — Interface abstraite pour le stockage des boards.
 *
 * Definit le contrat que tout driver de stockage doit respecter.
 * Trois implementations prevues :
 *   - LocalStorageDriver  : pure IndexedDB (comportement par defaut)
 *   - BackendStorageDriver : pure REST via httpClient
 *   - FederatedStorageDriver : offline-first + backend (futur)
 *
 * Ce driver ne gere QUE les boards (pas les settings, pas les images).
 * Les settings restent toujours en IndexedDB local via BoardStorage.
 * Les images restent gerees par IndexedDBImageStorage / ImageBackendAdapter.
 */
export default class StorageDriver {
    /**
     * Retourne la liste des boards (metadonnees legeres).
     *
     * @returns {Promise<Array<{ id: string, name: string, description: string, columnCount: number, cardCount: number, coverImageId: string|null, createdAt: string, updatedAt: string }>>}
     */
    async getBoardList() {
        throw new Error('StorageDriver.getBoardList() not implemented');
    }

    /**
     * Cree un nouveau board vide.
     *
     * @param {string} _name - Nom du board
     * @returns {Promise<string>} ID du board cree
     */
    async createBoard(_name) {
        throw new Error('StorageDriver.createBoard() not implemented');
    }

    /**
     * Charge les donnees completes d'un board.
     *
     * @param {string} _boardId - ID du board
     * @returns {Promise<Object|null>} Donnees du board ou null si introuvable
     */
    async loadBoard(_boardId) {
        throw new Error('StorageDriver.loadBoard() not implemented');
    }

    /**
     * Sauvegarde les donnees d'un board.
     *
     * @param {string} _boardId - ID du board
     * @param {Object} _data - Donnees completes du board
     * @returns {Promise<void>}
     */
    async saveBoard(_boardId, _data) {
        throw new Error('StorageDriver.saveBoard() not implemented');
    }

    /**
     * Supprime un board et ses donnees.
     *
     * @param {string} _boardId - ID du board
     * @returns {Promise<boolean>} true si supprime
     */
    async deleteBoard(_boardId) {
        throw new Error('StorageDriver.deleteBoard() not implemented');
    }

    /**
     * Duplique un board existant.
     *
     * @param {string} _boardId - ID du board source
     * @param {string} _newName - Nom du nouveau board
     * @returns {Promise<string|null>} ID du nouveau board ou null si echec
     */
    async duplicateBoard(_boardId, _newName) {
        throw new Error('StorageDriver.duplicateBoard() not implemented');
    }

    /**
     * Renomme un board.
     *
     * @param {string} _boardId - ID du board
     * @param {string} _newName - Nouveau nom
     * @returns {Promise<boolean>} true si renomme
     */
    async renameBoard(_boardId, _newName) {
        throw new Error('StorageDriver.renameBoard() not implemented');
    }
}
