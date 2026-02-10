/**
 * UserService — Charge et met en cache la liste des utilisateurs.
 *
 * Singleton exporté. On appelle `init()` une seule fois au démarrage.
 *
 * En mode solo : un seul utilisateur local, configurable via IndexedDB.
 * En mode multi : fetch du JSON statique (API backend).
 *
 * Après init, `getUsers()` / `getUserById()` sont synchrones.
 */
import { isSoloMode } from '../config/appMode.js';
import StorageService from './StorageService.js';
import AuthService from './AuthService.js';

/**
 * ID fixe du solo user.
 * @type {string}
 */
const SOLO_USER_ID = 'solo-user';

/**
 * Profil par défaut du solo user.
 * @type {{ name: string, initials: string, color: string }}
 */
const DEFAULT_PROFILE = { name: 'Utilisateur', initials: 'U', color: '#6c63ff' };

class UserService {
    /**
     * Liste des utilisateurs chargés.
     * @type {Array<{ id: string, name: string, initials: string, color: string, role: string }>}
     */
    _users;

    /**
     * Indique si le fetch a déjà été effectué (évite les appels multiples).
     * @type {boolean}
     */
    _loaded;

    /**
     * Utilisateur actuellement connecté.
     * @type {{ id: string, name: string, initials: string, color: string, role: string }|null}
     */
    _currentUser;

    /**
     * URL de fetch pour le backend (null = mode local).
     * @type {string|null}
     */
    _fetchUrl;

    /**
     * Fonction retournant les headers HTTP pour le backend.
     * @type {(() => Object)|null}
     */
    _getHeaders;

    constructor() {
        this._users = [];
        this._loaded = false;
        this._currentUser = null;
        this._fetchUrl = null;
        this._getHeaders = null;
    }

    /**
     * Initialise le service selon le mode (solo ou multi).
     */
    async init() {
        if (this._loaded) {
            return;
        }

        if (isSoloMode()) {
            await this._initSolo();
        } else {
            await this._initMulti();
        }

        this._loaded = true;
    }

    /**
     * Configure l'URL de fetch pour le backend.
     *
     * @param {string} url - URL complète de l'endpoint users
     * @param {() => Object} getHeaders - Fonction retournant les headers HTTP
     */
    setFetchUrl(url, getHeaders) {
        this._fetchUrl = url;
        this._getHeaders = getHeaders;
    }

    /**
     * Force un rechargement des utilisateurs depuis le backend.
     * Utile après configuration du backend ou changement d'URL.
     *
     * @returns {Promise<void>}
     */
    async reload() {
        if (isSoloMode()) {
            await this._initSolo();
        } else {
            await this._initMulti();
        }
    }

    /**
     * Init solo : charge le profil depuis IndexedDB et crée un seul user admin.
     *
     * @private
     */
    async _initSolo() {
        const profile = await StorageService.get('userProfile', DEFAULT_PROFILE);
        this._users = [
            {
                id: SOLO_USER_ID,
                name: profile.name,
                initials: profile.initials,
                color: profile.color,
                role: 'admin',
            },
        ];
        this._currentUser = this._users[0];
    }

    /**
     * Init multi : charge les utilisateurs depuis l'API.
     * L'utilisateur courant est déterminé par AuthService (plus de fetch de me.json).
     *
     * @private
     */
    async _initMulti() {
        try {
            const url = this._fetchUrl || '/api/users.json';
            const headers = this._getHeaders ? this._getHeaders() : {};

            const response = await fetch(url, { headers });
            if (!response.ok) throw new Error('HTTP ' + response.status);

            const data = await response.json();

            // Support backend paginé (data.data) ou mock local (data.users)
            this._users = data.data || data.users || [];
        } catch (error) {
            console.warn('UserService : impossible de charger les utilisateurs', error);

            // Fallback sur le mock local si le backend échoue
            if (this._fetchUrl) {
                try {
                    const response = await fetch('/api/users.json');
                    if (response.ok) {
                        const data = await response.json();
                        this._users = data.users || [];
                    } else {
                        this._users = [];
                    }
                } catch (_fallbackError) {
                    this._users = [];
                }
            } else {
                this._users = [];
            }
        }

        // L'utilisateur courant est déterminé par la session AuthService
        const userId = AuthService.getUserId();
        this._currentUser = userId ? this._users.find((u) => u.id === userId) || null : null;
    }

    /**
     * Retourne une copie du tableau d'utilisateurs.
     * @returns {Array<{ id: string, name: string, initials: string, color: string, role: string }>}
     */
    getUsers() {
        return [...this._users];
    }

    /**
     * Recherche un utilisateur par son identifiant.
     * En mode solo, retourne le solo user pour TOUT ID non-null
     * (compatibilité boards existants avec "user-1", etc.).
     *
     * @param {string} id
     * @returns {{ id: string, name: string, initials: string, color: string, role: string }|null}
     */
    getUserById(id) {
        if (!id) return null;

        if (isSoloMode()) {
            return this._users[0] || null;
        }

        return this._users.find((user) => user.id === id) || null;
    }

    /**
     * Définit l'utilisateur connecté (simulé).
     * @param {string} userId - ID de l'utilisateur à "connecter"
     */
    setCurrentUser(userId) {
        this._currentUser = this.getUserById(userId) || null;
    }

    /**
     * Retourne l'utilisateur actuellement connecté.
     * @returns {{ id: string, name: string, initials: string, color: string, role: string }|null}
     */
    getCurrentUser() {
        return this._currentUser;
    }

    /**
     * Met à jour le profil du solo user (nom, initiales, couleur).
     * Sauvegarde en IndexedDB et reconstruit le user en mémoire.
     *
     * @param {{ name: string, initials: string, color: string }} profile
     */
    async updateProfile({ name, initials, color }) {
        const profile = { name, initials, color };
        await StorageService.set('userProfile', profile);

        // Reconstruit le solo user en mémoire
        this._users = [
            {
                id: SOLO_USER_ID,
                name: profile.name,
                initials: profile.initials,
                color: profile.color,
                role: 'admin',
            },
        ];
        this._currentUser = this._users[0];
    }
}

import Container from '../Container.js';

const userService = new UserService();
Container.set('UserService', userService);

export { UserService };
export default userService;
