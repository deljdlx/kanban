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
import httpClient from './BackendHttpClient.js';

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

    constructor() {
        this._authenticated = false;
        this._userId = null;
        this._redirectUrl = null;
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

            // Déclenche le hook auth:login et attend que tous les plugins
            // aient fini leur configuration (ex: BackendPlugin recharge UserService).
            await Hooks.doActionAsync('auth:login', { userId: result.userId });
        }

        return result;
    }

    /**
     * Déconnecte l'utilisateur.
     *
     * Déclenche auth:beforeLogout (async) avant le cleanup pour permettre
     * aux plugins de faire des appels backend (ex: POST /api/logout)
     * tant que le token est encore disponible.
     */
    async logout() {
        // Hook avant cleanup (async) — attend que BackendPlugin ait fini
        // POST /api/logout tant que le token est encore disponible.
        await Hooks.doActionAsync('auth:beforeLogout', {});

        this._authenticated = false;
        this._userId = null;
        this._clearSession();
        sessionStorage.removeItem(TOKEN_KEY);

        // auth:logout utilise doAction (sync) intentionnellement :
        // le token et la session sont deja nettoyes, les plugins n'ont plus
        // besoin de faire des appels backend — juste du cleanup local.
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
     * Mode backend : POST /api/login via BackendHttpClient.
     *
     * Le login n'a pas besoin de token (pas encore authentifié),
     * mais utilise le httpClient pour bénéficier de l'URL centralisée et du timeout.
     *
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{ success: boolean, userId?: string, token?: string, error?: string }>}
     * @private
     */
    async _authenticate(email, password) {
        // Mode backend — httpClient configuré avec baseUrl par BackendPlugin
        if (httpClient.isConfigured()) {
            try {
                // Login est un cas spécial : un 401 signifie "mauvais credentials",
                // pas "token expiré". skipTokenExpired empeche le hook auth:tokenExpired
                // de se declencher si l'utilisateur a encore un token d'une session precedente.
                const response = await httpClient.requestRaw('POST', '/api/login', {
                    email,
                    password,
                }, { skipTokenExpired: true });

                const data = await response.json();
                return {
                    success: true,
                    userId: data.user?.id || 'backend-user',
                    token: data.token,
                };
            } catch (error) {
                // 401 du login = mauvais credentials (pas un token expiré)
                if (error.message.includes('401')) {
                    return {
                        success: false,
                        error: 'Email ou mot de passe incorrect.',
                    };
                }
                // Backend injoignable ou autre erreur
                console.error('AuthService: backend injoignable', error);
                return {
                    success: false,
                    error: 'Backend injoignable. Vérifiez votre connexion ou contactez l\'administrateur.',
                };
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
