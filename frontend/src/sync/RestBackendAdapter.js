/**
 * RestBackendAdapter — Adapteur REST pour la synchronisation backend.
 *
 * Envoie les opérations granulaires et récupère les changements distants
 * via une API REST classique. Utilise fetch() avec timeout configurable.
 *
 * Endpoints attendus :
 *   POST   {baseUrl}/api/boards/{boardId}/ops     → pushOps
 *   GET    {baseUrl}/api/boards/{boardId}/ops?since={rev}  → pullOps
 *   GET    {baseUrl}/api/boards/{boardId}          → fetchSnapshot
 *   PUT    {baseUrl}/api/boards/{boardId}          → pushSnapshot
 *
 * L'injection de headers d'auth se fait via getHeaders() passé au
 * constructeur, ce qui découple l'adapteur de la logique d'authentification.
 */
import { BackendAdapter } from './BackendAdapter.js';

export default class RestBackendAdapter extends BackendAdapter {
    /**
     * @type {string}
     */
    _baseUrl;

    /**
     * Fonction retournant les headers HTTP (ex: Authorization).
     * @type {() => Object}
     */
    _getHeaders;

    /**
     * Timeout des requêtes en millisecondes.
     * @type {number}
     */
    _timeout;

    /**
     * @param {Object} config
     * @param {string} config.baseUrl - URL de base du backend (sans trailing slash)
     * @param {() => Object} [config.getHeaders] - Fonction retournant les headers HTTP
     * @param {number} [config.timeout=10000] - Timeout en ms
     */
    constructor({ baseUrl, getHeaders = () => ({}), timeout = 10000 }) {
        super();
        this._baseUrl = baseUrl.replace(/\/+$/, '');
        this._getHeaders = getHeaders;
        this._timeout = timeout;
    }

    // ---------------------------------------------------------------
    // BackendAdapter implementation
    // ---------------------------------------------------------------

    /**
     * POST {baseUrl}/api/boards/{boardId}/ops
     *
     * @param {string} boardId
     * @param {Array} ops
     * @param {number} clientRevision
     * @returns {Promise<{ serverRevision: number }>}
     */
    async pushOps(boardId, ops, clientRevision) {
        return await this._request('POST', `/api/boards/${boardId}/ops`, {
            ops,
            clientRevision,
        });
    }

    /**
     * GET {baseUrl}/api/boards/{boardId}/ops?since={rev}
     *
     * @param {string} boardId
     * @param {number} sinceRevision
     * @returns {Promise<{ ops: Array, serverRevision: number }>}
     */
    async pullOps(boardId, sinceRevision) {
        return await this._request('GET', `/api/boards/${boardId}/ops?since=${sinceRevision}`);
    }

    /**
     * GET {baseUrl}/api/boards/{boardId}
     *
     * @param {string} boardId
     * @returns {Promise<Object|null>}
     */
    async fetchSnapshot(boardId) {
        return await this._request('GET', `/api/boards/${boardId}`);
    }

    /**
     * PUT {baseUrl}/api/boards/{boardId}
     *
     * @param {string} boardId
     * @param {Object} snapshot
     * @returns {Promise<{ serverRevision: number }>}
     */
    async pushSnapshot(boardId, snapshot) {
        return await this._request('PUT', `/api/boards/${boardId}`, snapshot);
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    /**
     * Exécute une requête HTTP avec timeout et gestion d'erreurs.
     *
     * @param {string} method - Méthode HTTP
     * @param {string} path - Chemin relatif (ex: /api/boards/123/ops)
     * @param {Object} [body] - Corps de la requête (sérialisé en JSON)
     * @returns {Promise<Object>}
     * @private
     */
    async _request(method, path, body = undefined) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this._timeout);

        const headers = {
            'Content-Type': 'application/json',
            ...this._getHeaders(),
        };

        const options = {
            method,
            headers,
            signal: controller.signal,
        };

        if (body !== undefined) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${this._baseUrl}${path}`, options);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } finally {
            clearTimeout(timeoutId);
        }
    }
}
