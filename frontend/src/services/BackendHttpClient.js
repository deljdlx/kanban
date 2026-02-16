/**
 * BackendHttpClient — Client HTTP centralisé pour les appels backend.
 *
 * Gère l'authentification (token Bearer via AuthService), le timeout
 * par AbortController, et l'interception des 401 (token expiré).
 *
 * Tous les services qui communiquent avec le backend (RestBackendAdapter,
 * ImageBackendAdapter, UserService, TaxonomyService, BackendPlugin)
 * passent par ce client au lieu de faire leur propre fetch().
 *
 * Singleton enregistré dans le Container.
 */
import AuthService from './AuthService.js';
import Container from '../Container.js';
import Hooks from '../plugins/HookRegistry.js';

/** Timeout par défaut en millisecondes. */
const DEFAULT_TIMEOUT = 10000;

class BackendHttpClient {
    /**
     * URL de base du backend (sans trailing slash). Null = non configuré.
     * @type {string|null}
     */
    _baseUrl;

    /**
     * Timeout des requêtes en millisecondes.
     * @type {number}
     */
    _timeout;

    constructor() {
        this._baseUrl = null;
        this._timeout = DEFAULT_TIMEOUT;
    }

    // ---------------------------------------------------------------
    // Configuration
    // ---------------------------------------------------------------

    /**
     * Configure le client avec l'URL du backend.
     *
     * @param {string} baseUrl - URL de base (ex: 'http://localhost:8080')
     * @param {number} [timeout=10000] - Timeout en ms
     */
    configure(baseUrl, timeout = DEFAULT_TIMEOUT) {
        this._baseUrl = baseUrl.replace(/\/+$/, '');
        this._timeout = timeout;
    }

    /**
     * Réinitialise le client (appelé au logout).
     */
    reset() {
        this._baseUrl = null;
        this._timeout = DEFAULT_TIMEOUT;
    }

    /**
     * Indique si le client est configuré (baseUrl définie).
     *
     * @returns {boolean}
     */
    isConfigured() {
        return this._baseUrl !== null;
    }

    // ---------------------------------------------------------------
    // Requêtes HTTP
    // ---------------------------------------------------------------

    /**
     * Exécute une requête HTTP JSON authentifiée.
     *
     * - Ajoute le token Bearer via AuthService.getToken()
     * - Timeout via AbortController
     * - Interception 401 → fire 'auth:tokenExpired'
     * - Parse la réponse en JSON
     *
     * @param {string} method - Méthode HTTP (GET, POST, PUT, DELETE)
     * @param {string} path - Chemin relatif (ex: '/api/boards/123/ops')
     * @param {Object} [body] - Corps de la requête (sérialisé en JSON)
     * @returns {Promise<Object>} Réponse JSON parsée
     */
    async request(method, path, body = undefined) {
        const response = await this.requestRaw(method, path, body);
        return await response.json();
    }

    /**
     * Exécute une requête HTTP authentifiée et retourne la Response brute.
     *
     * Utilisé quand on a besoin du blob (downloadImage) ou d'un
     * traitement spécifique de la réponse.
     *
     * @param {string} method - Méthode HTTP
     * @param {string} path - Chemin relatif
     * @param {Object|FormData} [body] - Corps de la requête
     * @param {{ skipTokenExpired?: boolean }} [options] - Options
     * @param {boolean} [options.skipTokenExpired=false] - Ne pas fire auth:tokenExpired sur 401
     *   (utile pour login/register ou le 401 signifie "mauvais credentials", pas "token expire")
     * @returns {Promise<Response>} Réponse brute
     */
    async requestRaw(method, path, body = undefined, { skipTokenExpired = false } = {}) {
        if (!this._baseUrl) {
            throw new Error('BackendHttpClient: non configuré (baseUrl manquante)');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this._timeout);

        const token = AuthService.getToken();
        const headers = {
            Accept: 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Content-Type JSON sauf pour FormData (multipart géré par le navigateur)
        const isFormData = body instanceof FormData;
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        const options = {
            method,
            headers,
            signal: controller.signal,
        };

        if (body !== undefined) {
            options.body = isFormData ? body : JSON.stringify(body);
        }

        try {
            const response = await fetch(`${this._baseUrl}${path}`, options);

            // Interception 401 — token expiré
            // Ne fire le hook que si un token était présent ET que le caller
            // n'a pas demandé à ignorer (login/register gerent le 401 eux-memes)
            if (response.status === 401) {
                if (token && !skipTokenExpired) {
                    Hooks.doAction('auth:tokenExpired');
                }
                throw new Error('HTTP 401 Unauthorized');
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }

            return response;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // ---------------------------------------------------------------
    // Raccourcis
    // ---------------------------------------------------------------

    /**
     * GET request.
     *
     * @param {string} path
     * @returns {Promise<Object>}
     */
    async get(path) {
        return await this.request('GET', path);
    }

    /**
     * POST request.
     *
     * @param {string} path
     * @param {Object} body
     * @returns {Promise<Object>}
     */
    async post(path, body) {
        return await this.request('POST', path, body);
    }

    /**
     * PUT request.
     *
     * @param {string} path
     * @param {Object} body
     * @returns {Promise<Object>}
     */
    async put(path, body) {
        return await this.request('PUT', path, body);
    }

    /**
     * DELETE request.
     *
     * @param {string} path
     * @returns {Promise<Object>}
     */
    async delete(path) {
        return await this.request('DELETE', path);
    }

    /**
     * Upload multipart (FormData). Retourne la réponse JSON.
     *
     * @param {string} path
     * @param {FormData} formData
     * @returns {Promise<Object>}
     */
    async upload(path, formData) {
        return await this.request('POST', path, formData);
    }
}

const httpClient = new BackendHttpClient();
Container.set('BackendHttpClient', httpClient);

export { BackendHttpClient };
export default httpClient;
