/**
 * BackendStorageDriver — Driver REST pour le stockage des boards.
 *
 * Delegue toutes les operations board a l'API backend via httpClient.
 * Pas de cache local : chaque operation est un appel reseau.
 *
 * Transformations de format :
 *   Backend stocke : { id, name, data: { version, description, columns, ... }, serverRevision }
 *   Frontend attend : { version, id, name, description, columns, coverImage, pluginData, ... }
 *
 *   _backendToFrontend() fusionne data + id/name en format plat
 *   _frontendToBackend() extrait name et wrappe le reste dans data
 */
import StorageDriver from './StorageDriver.js';

/** Structure d'un board vide cote backend */
const EMPTY_BOARD_DATA = {
    version: 1,
    description: '',
    coverImage: null,
    backgroundImage: null,
    columns: [],
    pluginData: {},
};

export default class BackendStorageDriver extends StorageDriver {
    /**
     * Client HTTP pour les appels REST.
     * @type {import('../../services/BackendHttpClient.js').BackendHttpClient}
     */
    _httpClient;

    /**
     * @param {import('../../services/BackendHttpClient.js').BackendHttpClient} httpClient
     */
    constructor(httpClient) {
        super();
        this._httpClient = httpClient;
    }

    // ---------------------------------------------------------------
    // StorageDriver implementation
    // ---------------------------------------------------------------

    /**
     * GET /api/boards/registry
     *
     * @returns {Promise<Array<{ id: string, name: string, description: string, columnCount: number, cardCount: number, coverImageId: string|null, createdAt: string, updatedAt: string }>>}
     */
    async getBoardList() {
        return await this._httpClient.get('/api/boards/registry');
    }

    /**
     * POST /api/boards
     *
     * @param {string} name - Nom du board
     * @returns {Promise<string>} ID du board cree
     */
    async createBoard(name) {
        const response = await this._httpClient.post('/api/boards', {
            name,
            data: { ...EMPTY_BOARD_DATA },
        });
        return response.id;
    }

    /**
     * GET /api/boards/{boardId}
     * Transforme le format backend en format frontend (plat).
     *
     * @param {string} boardId - ID du board
     * @returns {Promise<Object|null>}
     */
    async loadBoard(boardId) {
        const response = await this._httpClient.get(`/api/boards/${boardId}`);
        return this._backendToFrontend(response);
    }

    /**
     * PUT /api/boards/{boardId}
     * Transforme le format frontend en format backend (name + data).
     *
     * @param {string} boardId - ID du board
     * @param {Object} data - Donnees completes du board (format frontend plat)
     * @returns {Promise<void>}
     */
    async saveBoard(boardId, data) {
        const payload = this._frontendToBackend(data);
        await this._httpClient.put(`/api/boards/${boardId}`, payload);
    }

    /**
     * DELETE /api/boards/{boardId}
     *
     * @param {string} boardId - ID du board
     * @returns {Promise<boolean>}
     */
    async deleteBoard(boardId) {
        await this._httpClient.delete(`/api/boards/${boardId}`);
        return true;
    }

    /**
     * Duplique un board : charge le source puis cree un nouveau.
     *
     * @param {string} boardId - ID du board source
     * @param {string} newName - Nom du nouveau board
     * @returns {Promise<string|null>} ID du nouveau board ou null
     */
    async duplicateBoard(boardId, newName) {
        const sourceData = await this.loadBoard(boardId);
        if (!sourceData) return null;

        // Clone et renomme
        const cloned = JSON.parse(JSON.stringify(sourceData));
        cloned.name = newName;
        delete cloned.id;

        const payload = this._frontendToBackend(cloned);
        const response = await this._httpClient.post('/api/boards', payload);
        return response.id;
    }

    /**
     * PUT /api/boards/{boardId} — rename only (envoie uniquement le name).
     *
     * @param {string} boardId - ID du board
     * @param {string} newName - Nouveau nom
     * @returns {Promise<boolean>}
     */
    async renameBoard(boardId, newName) {
        await this._httpClient.put(`/api/boards/${boardId}`, { name: newName });
        return true;
    }

    // ---------------------------------------------------------------
    // Transformations de format
    // ---------------------------------------------------------------

    /**
     * Convertit le format backend (nested) en format frontend (plat).
     *
     * Backend : { id, name, data: { version, description, columns, ... }, serverRevision }
     * Frontend : { id, name, version, description, columns, ... }
     *
     * @param {Object} response - Reponse API
     * @returns {Object} Board au format frontend
     * @private
     */
    _backendToFrontend(response) {
        const { id, name, data } = response;
        return { ...data, id, name };
    }

    /**
     * Convertit le format frontend (plat) en format backend (nested).
     *
     * Frontend : { id, name, version, description, columns, ... }
     * Backend : { name, data: { version, description, columns, ... } }
     *
     * @param {Object} boardData - Board au format frontend
     * @returns {{ name: string, data: Object }} Payload pour l'API
     * @private
     */
    _frontendToBackend(boardData) {
        // Exclut id (genere par le backend) et serverRevision (gere par le backend)
        const { id: _id, name, serverRevision: _rev, ...data } = boardData;
        return { name, data };
    }
}
