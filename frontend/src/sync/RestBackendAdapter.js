/**
 * RestBackendAdapter — Adapteur REST pour la synchronisation backend.
 *
 * Envoie les operations granulaires et recupere les changements distants
 * via une API REST classique. Delegue le HTTP (auth, timeout, 401) au
 * BackendHttpClient centralise.
 *
 * Endpoints utilises :
 *   POST   /api/boards/{boardId}/ops              -> pushOps
 *   GET    /api/boards/{boardId}/ops?since={rev}   -> pullOps
 *   GET    /api/boards/{boardId}                   -> fetchSnapshot
 *   PUT    /api/boards/{boardId}                   -> pushSnapshot
 */
import { BackendAdapter } from './BackendAdapter.js';

export default class RestBackendAdapter extends BackendAdapter {
    /**
     * Client HTTP centralisé.
     * @type {import('../services/BackendHttpClient.js').BackendHttpClient}
     */
    _httpClient;

    /**
     * @param {import('../services/BackendHttpClient.js').BackendHttpClient} httpClient
     */
    constructor(httpClient) {
        super();
        this._httpClient = httpClient;
    }

    // ---------------------------------------------------------------
    // BackendAdapter implementation
    // ---------------------------------------------------------------

    /**
     * POST /api/boards/{boardId}/ops
     *
     * @param {string} boardId
     * @param {Array} ops
     * @param {number} clientRevision
     * @returns {Promise<{ serverRevision: number }>}
     */
    async pushOps(boardId, ops, clientRevision) {
        return await this._httpClient.post(`/api/boards/${boardId}/ops`, {
            ops,
            clientRevision,
        });
    }

    /**
     * GET /api/boards/{boardId}/ops?since={rev}
     *
     * @param {string} boardId
     * @param {number} sinceRevision
     * @returns {Promise<{ ops: Array, serverRevision: number }>}
     */
    async pullOps(boardId, sinceRevision) {
        return await this._httpClient.get(`/api/boards/${boardId}/ops?since=${sinceRevision}`);
    }

    /**
     * GET /api/boards/{boardId}
     *
     * @param {string} boardId
     * @returns {Promise<Object|null>}
     */
    async fetchSnapshot(boardId) {
        return await this._httpClient.get(`/api/boards/${boardId}`);
    }

    /**
     * PUT /api/boards/{boardId}
     *
     * @param {string} boardId
     * @param {Object} snapshot
     * @returns {Promise<{ serverRevision: number }>}
     */
    async pushSnapshot(boardId, snapshot) {
        return await this._httpClient.put(`/api/boards/${boardId}`, snapshot);
    }
}
