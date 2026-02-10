/**
 * AuthService — Authentification front-end pour le mode multi.
 *
 * Gère le login/logout et la session utilisateur via sessionStorage.
 * En mode solo, l'authentification est ignorée (toujours authentifié).
 *
 * Design "backend-ready" : remplacer `_authenticate()` par un
 * `fetch('/api/login', { POST })` suffit pour passer en mode serveur.
 *
 * Session stockée dans sessionStorage (perdue à la fermeture de l'onglet).
 */
import { isSoloMode } from '../config/appMode.js';
import Container from '../Container.js';
import Hooks from '../plugins/HookRegistry.js';

/**
 * Clé sessionStorage pour la session auth.
 * @type {string}
 */
const SESSION_KEY = 'kanban:auth:session';

/**
 * Clé sessionStorage pour le token Sanctum.
 * @type {string}
 */
const TOKEN_KEY = 'kanban:auth:token';

class AuthService {
    /**
     * Indique si l'utilisateur est authentifié.
     * @type {boolean}
     */
    _authenticated;

    /**
     * ID de l'utilisateur authentifié.
     * @type {string|null}
     */
    _userId;

    /**
     * URL vers laquelle rediriger après login.
     * @type {string|null}
     */
    _redirectUrl;

    /**
     * URL du backend (null = mode local).
     * @type {string|null}
     */
    _backendUrl;

    constructor() {
        this._authenticated = false;
        this._userId = null;
        this._redirectUrl = null;
        this._backendUrl = null;
    }

    /**
     * Initialise le service : charge une session existante depuis sessionStorage.
     * En mode solo, l'authentification est toujours considérée comme valide.
     */
    init() {
        if (isSoloMode()) {
            this._authenticated = true;
            return;
        }

        const stored = sessionStorage.getItem(SESSION_KEY);
        if (stored) {
            try {
                const session = JSON.parse(stored);
                this._authenticated = true;
                this._userId = session.userId;
            } catch (_e) {
                sessionStorage.removeItem(SESSION_KEY);
            }
        }
    }

    /**
     * Active le mode backend et configure l'URL.
     *
     * @param {string} url - URL du backend (sans trailing slash)
     */
    setBackendUrl(url) {
        this._backendUrl = url.replace(/\/+$/, '');
    }

    /**
     * Retourne le token Sanctum courant.
     *
     * @returns {string|null}
     */
    getToken() {
        return sessionStorage.getItem(TOKEN_KEY);
    }

    /**
     * Tente de connecter un utilisateur avec email + mot de passe.
     *
     * @param {string} email
     * @param {string} password - Mot de passe en clair (hashé côté client en mode local)
     * @returns {Promise<{ success: boolean, error?: string, userId?: string }>}
     */
    async login(email, password) {
        const result = await this._authenticate(email, password);

        if (result.success) {
            this._authenticated = true;
            this._userId = result.userId;
            this._saveSession(result.userId);

            // En mode backend, stocker le token
            if (result.token) {
                sessionStorage.setItem(TOKEN_KEY, result.token);
            }
        }

        return result;
    }

    /**
     * Déconnecte l'utilisateur.
     */
    async logout() {
        // En mode backend, appeler l'endpoint de logout
        if (this._backendUrl && this.getToken()) {
            try {
                await fetch(`${this._backendUrl}/api/logout`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${this.getToken()}`,
                        'Content-Type': 'application/json',
                    },
                });
            } catch (error) {
                console.warn('AuthService: erreur lors du logout backend', error);
            }
        }

        this._authenticated = false;
        this._userId = null;
        this._clearSession();
        sessionStorage.removeItem(TOKEN_KEY);

        // Déclenche le hook auth:logout pour que les plugins puissent réagir
        Hooks.doAction('auth:logout', {});
    }

    /**
     * Indique si l'utilisateur est authentifié.
     * @returns {boolean}
     */
    isAuthenticated() {
        return this._authenticated;
    }

    /**
     * Retourne l'ID de l'utilisateur authentifié.
     * @returns {string|null}
     */
    getUserId() {
        return this._userId;
    }

    /**
     * Mémorise l'URL cible pour redirect post-login.
     * @param {string} url
     */
    setRedirectUrl(url) {
        this._redirectUrl = url;
    }

    /**
     * Consomme et retourne l'URL de redirection mémorisée.
     * @returns {string|null}
     */
    consumeRedirectUrl() {
        const url = this._redirectUrl;
        this._redirectUrl = null;
        return url;
    }

    // =========================================================
    // Point de plug backend
    // =========================================================

    /**
     * Authentifie l'utilisateur.
     *
     * Mode local : hash SHA-256 côté client + comparaison locale.
     * Mode backend : POST /api/login avec email + password en clair.
     *
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{ success: boolean, userId?: string, token?: string, error?: string }>}
     * @private
     */
    async _authenticate(email, password) {
        // Mode backend
        if (this._backendUrl) {
            try {
                const response = await fetch(`${this._backendUrl}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    return {
                        success: false,
                        error: error.message || 'Email ou mot de passe incorrect.',
                    };
                }

                const data = await response.json();
                return {
                    success: true,
                    userId: data.user?.id || 'backend-user',
                    token: data.token,
                };
            } catch (error) {
                // Fallback sur le mode local si le backend est injoignable
                console.warn('AuthService: backend injoignable, fallback mode local', error);
                return await this._authenticateLocal(email, password);
            }
        }

        // Mode local
        return await this._authenticateLocal(email, password);
    }

    /**
     * Authentification locale (hash SHA-256 + comparaison).
     *
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{ success: boolean, userId?: string, error?: string }>}
     * @private
     */
    async _authenticateLocal(email, password) {
        const hash = await this._hashPassword(password);
        const credentials = await this._fetchCredentials();

        if (!credentials) {
            return { success: false, error: 'Impossible de charger les identifiants.' };
        }

        const user = credentials.users.find(
            (u) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === hash,
        );

        if (!user) {
            return { success: false, error: 'Email ou mot de passe incorrect.' };
        }

        return { success: true, userId: user.id };
    }

    /**
     * Hash un mot de passe en SHA-256 via l'API Web Crypto.
     *
     * @param {string} password
     * @returns {Promise<string>} Hash hexadécimal
     * @private
     */
    async _hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const buffer = await crypto.subtle.digest('SHA-256', data);
        const array = Array.from(new Uint8Array(buffer));
        return array.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Charge le fichier de credentials depuis l'API.
     *
     * @returns {Promise<{ users: Array<{ id: string, email: string, passwordHash: string }> }|null>}
     * @private
     */
    async _fetchCredentials() {
        try {
            const response = await fetch('/api/credentials.json');
            if (!response.ok) {
                console.error('AuthService : HTTP ' + response.status);
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error('AuthService : impossible de charger credentials.json', error);
            return null;
        }
    }

    /**
     * Sauvegarde la session dans sessionStorage.
     *
     * @param {string} userId
     * @private
     */
    _saveSession(userId) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
    }

    /**
     * Supprime la session de sessionStorage.
     *
     * @private
     */
    _clearSession() {
        sessionStorage.removeItem(SESSION_KEY);
    }
}

const authService = new AuthService();
Container.set('AuthService', authService);

export { AuthService };
export default authService;
