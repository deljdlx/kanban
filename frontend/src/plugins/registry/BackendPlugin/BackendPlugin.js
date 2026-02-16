/**
 * BackendPlugin — Connexion frontend - backend Laravel.
 *
 * Plugin de wiring qui connecte les services (User, Taxonomy, Sync, Images)
 * au backend Laravel via le BackendHttpClient centralisé.
 *
 * Lifecycle :
 *
 *   app:initialized
 *     |
 *     +- charge config depuis IndexedDB
 *     +- si enabled : configure httpClient (baseUrl)
 *     +- si enabled && token existe
 *     |  +- valide le token via GET /api/me
 *     |  +- si valide : configure les services
 *     |  +- si 401 : token expire, le hook auth:tokenExpired gere le logout
 *     +- ecoute auth:login/logout/beforeLogout/tokenExpired
 *
 *   auth:login (reussi)
 *     |
 *     +- configure les services backend
 *
 *   auth:beforeLogout
 *     |
 *     +- POST /api/logout via httpClient (tant que le token est encore disponible)
 *
 *   auth:logout
 *     |
 *     +- reset httpClient, adapteurs, services
 *
 *   auth:tokenExpired
 *     |
 *     +- declenche AuthService.logout()
 *
 * Configuration persistee dans IndexedDB (meta store, cle: backend:config) :
 *   - backendUrl : string (ex: 'http://localhost:8080')
 *   - pullInterval : number (ms, defaut: 30000)
 *   - enabled : boolean (defaut: false)
 */
import StorageService from '../../../services/StorageService.js';
import AuthService from '../../../services/AuthService.js';
import UserService from '../../../services/UserService.js';
import TaxonomyService from '../../../services/TaxonomyService.js';
import httpClient from '../../../services/BackendHttpClient.js';
import SyncService from '../../../sync/SyncService.js';
import RestBackendAdapter from '../../../sync/RestBackendAdapter.js';
import { NoOpBackendAdapter } from '../../../sync/BackendAdapter.js';
import ImageStorage from '../../../services/storage/IndexedDBImageStorage.js';
import ImageBackendAdapter from './ImageBackendAdapter.js';
import BackendStorageDriver from '../../../services/storage/BackendStorageDriver.js';
import LocalStorageDriver from '../../../services/storage/LocalStorageDriver.js';

/** Cle IndexedDB pour la config du plugin */
const CONFIG_KEY = 'backend:config';

/** Configuration par defaut */
const DEFAULT_CONFIG = {
    backendUrl: '',
    pullInterval: 30000,
    enabled: false,
};

export default class BackendPlugin {
    /**
     * Configuration courante.
     * @type {{ backendUrl: string, pullInterval: number, enabled: boolean }}
     */
    _config;

    /**
     * Adapteur REST pour la sync.
     * @type {RestBackendAdapter|null}
     */
    _adapter;

    /**
     * Adapteur backend pour les images.
     * @type {ImageBackendAdapter|null}
     */
    _imageAdapter;

    /**
     * Reference au hook registry.
     * @type {import('../../HookRegistry.js').default|null}
     */
    _hooksRegistry;

    /**
     * Handlers pour cleanup.
     * @type {Object<string, Function>}
     */
    _handlers;

    /**
     * Indique si les services ont deja ete configures (evite la double configuration).
     * @type {boolean}
     */
    _configured;

    /**
     * Garde contre la boucle tokenExpired → logout → beforeLogout → 401 → tokenExpired.
     * @type {boolean}
     */
    _loggingOut;

    constructor() {
        this._config = { ...DEFAULT_CONFIG };
        this._adapter = null;
        this._imageAdapter = null;
        this._hooksRegistry = null;
        this._handlers = {};
        this._configured = false;
        this._loggingOut = false;
    }

    // ---------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------

    /**
     * Installation du plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     * @returns {Promise<void>}
     */
    async install(hooks) {
        this._hooksRegistry = hooks;

        // Charge la config depuis IndexedDB
        await this._loadConfig();

        // Ecoute les hooks
        this._handlers.onAppInitialized = () => this._onAppInitialized();
        hooks.addAction('app:initialized', this._handlers.onAppInitialized);

        this._handlers.onAuthLogin = () => this._onAuthLogin();
        hooks.addAction('auth:login', this._handlers.onAuthLogin);

        this._handlers.onAuthBeforeLogout = () => this._onAuthBeforeLogout();
        hooks.addAction('auth:beforeLogout', this._handlers.onAuthBeforeLogout);

        this._handlers.onAuthLogout = () => this._onAuthLogout();
        hooks.addAction('auth:logout', this._handlers.onAuthLogout);

        this._handlers.onTokenExpired = () => this._onTokenExpired();
        hooks.addAction('auth:tokenExpired', this._handlers.onTokenExpired);
    }

    /**
     * Desinstallation du plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        if (this._handlers.onAppInitialized) {
            hooks.removeAction('app:initialized', this._handlers.onAppInitialized);
        }
        if (this._handlers.onAuthLogin) {
            hooks.removeAction('auth:login', this._handlers.onAuthLogin);
        }
        if (this._handlers.onAuthBeforeLogout) {
            hooks.removeAction('auth:beforeLogout', this._handlers.onAuthBeforeLogout);
        }
        if (this._handlers.onAuthLogout) {
            hooks.removeAction('auth:logout', this._handlers.onAuthLogout);
        }
        if (this._handlers.onTokenExpired) {
            hooks.removeAction('auth:tokenExpired', this._handlers.onTokenExpired);
        }

        this._adapter = null;
        this._imageAdapter = null;
        this._hooksRegistry = null;
        this._configured = false;
    }

    // ---------------------------------------------------------------
    // Hooks handlers
    // ---------------------------------------------------------------

    /**
     * Handler pour app:initialized.
     *
     * Configure httpClient avec baseUrl des le demarrage (necessaire pour login).
     * Si un token existe deja, valide avec GET /api/me puis configure les services.
     *
     * @private
     */
    async _onAppInitialized() {
        if (!this._config.enabled || !this._config.backendUrl) {
            return;
        }

        // Configure httpClient avec l'URL (meme sans token, necessaire pour login)
        httpClient.configure(this._config.backendUrl);

        // Si un token existe, valide et configure les services
        if (AuthService.getToken()) {
            try {
                await httpClient.get('/api/me');
                await this._configureServices();
            } catch (_error) {
                // 401 = token expire → le hook auth:tokenExpired est deja fire par httpClient
                // Autre erreur = backend injoignable, on ne configure pas
                console.warn('BackendPlugin: validation token echouee, services non configures');
            }
        }
    }

    /**
     * Handler pour auth:login.
     * Appele apres un login reussi. Attend que les services soient configures
     * (drivers, UserService, TaxonomyService) avant que LoginView ne continue.
     *
     * @returns {Promise<void>}
     * @private
     */
    async _onAuthLogin() {
        if (this._config.enabled) {
            await this._configureServices();
        }
    }

    /**
     * Handler pour auth:beforeLogout.
     * Appele avant le cleanup de session — le token est encore disponible.
     * POST /api/logout via httpClient.
     *
     * @private
     */
    async _onAuthBeforeLogout() {
        // Active la garde anti-boucle : si le POST /api/logout provoque un 401,
        // le hook auth:tokenExpired sera ignore (voir _onTokenExpired).
        this._loggingOut = true;

        if (httpClient.isConfigured() && AuthService.getToken()) {
            try {
                await httpClient.post('/api/logout', {});
            } catch (error) {
                console.warn('BackendPlugin: erreur lors du logout backend', error);
            }
        }
    }

    /**
     * Handler pour auth:logout.
     * Appele apres le cleanup de session. Reset complet des services.
     *
     * @private
     */
    _onAuthLogout() {
        // Revient au driver local pour les boards
        StorageService.setDriver(new LocalStorageDriver());

        // Reset les services
        SyncService.setAdapter(new NoOpBackendAdapter());
        ImageStorage.setBackendAdapter(null);
        UserService.setHttpClient(null);
        TaxonomyService.setHttpClient(null);

        // Reset les adapteurs
        this._adapter = null;
        this._imageAdapter = null;
        this._configured = false;
        this._loggingOut = false;

        // Note: httpClient garde sa baseUrl pour permettre un re-login
        // Il sera reset si le plugin est desactive
    }

    /**
     * Handler pour auth:tokenExpired (intercepte par httpClient sur 401).
     * Declenche le logout complet.
     *
     * @private
     */
    _onTokenExpired() {
        // Garde anti-boucle : si on est deja en cours de logout,
        // un 401 du POST /api/logout ne doit pas relancer le cycle.
        if (this._loggingOut) return;
        this._loggingOut = true;

        console.warn('BackendPlugin: token expire, deconnexion');
        AuthService.logout();
    }

    // ---------------------------------------------------------------
    // Configuration des services
    // ---------------------------------------------------------------

    /**
     * Configure tous les services pour utiliser le backend via httpClient.
     *
     * Async : attend que UserService et TaxonomyService aient fini leur
     * rechargement avant de retourner. Cela garantit que PermissionService
     * a un user avec role quand les vues s'affichent apres login.
     *
     * @returns {Promise<void>}
     * @private
     */
    async _configureServices() {
        if (!this._config.backendUrl) {
            console.warn('BackendPlugin: backendUrl non configuree');
            return;
        }

        if (this._configured) {
            return;
        }

        // httpClient deja configure dans _onAppInitialized ou _configureHttpClient
        if (!httpClient.isConfigured()) {
            httpClient.configure(this._config.backendUrl);
        }

        // Switch le driver de StorageService vers le backend
        StorageService.setDriver(new BackendStorageDriver(httpClient));

        // Configure et recharge UserService + TaxonomyService en parallele.
        // Await : les vues ont besoin des users (PermissionService) et des
        // taxonomies pour s'afficher correctement.
        UserService.setHttpClient(httpClient);
        TaxonomyService.setHttpClient(httpClient);

        const [userResult, taxonomyResult] = await Promise.allSettled([
            UserService.reload(),
            TaxonomyService.reload(),
        ]);

        if (userResult.status === 'rejected') {
            console.warn('BackendPlugin: echec reload UserService', userResult.reason);
        }
        if (taxonomyResult.status === 'rejected') {
            console.warn('BackendPlugin: echec reload TaxonomyService', taxonomyResult.reason);
        }

        // Configure SyncService
        this._adapter = new RestBackendAdapter(httpClient);
        SyncService.setAdapter(this._adapter);
        SyncService.setPullInterval(this._config.pullInterval);

        // Configure ImageStorage
        this._imageAdapter = new ImageBackendAdapter(httpClient);
        ImageStorage.setBackendAdapter(this._imageAdapter);

        this._configured = true;
        console.warn('BackendPlugin: services configures avec', this._config.backendUrl);
    }

    // ---------------------------------------------------------------
    // API publique (pour le settings panel)
    // ---------------------------------------------------------------

    /**
     * Retourne la configuration courante.
     *
     * @returns {{ backendUrl: string, pullInterval: number, enabled: boolean }}
     */
    getConfig() {
        return { ...this._config };
    }

    /**
     * Met a jour la configuration et persiste dans IndexedDB.
     *
     * @param {{ backendUrl?: string, pullInterval?: number, enabled?: boolean }} updates
     * @returns {Promise<void>}
     */
    async updateConfig(updates) {
        this._config = { ...this._config, ...updates };
        await StorageService.set(CONFIG_KEY, this._config);

        let needsReconfigure = false;

        if (updates.enabled !== undefined) {
            if (updates.enabled && AuthService.getToken()) {
                // Active : configure httpClient + services
                httpClient.configure(this._config.backendUrl);
                this._configured = false;
                needsReconfigure = true;
            } else if (!updates.enabled) {
                // Desactive : reset complet
                this._onAuthLogout();
                httpClient.reset();
                return;
            }
        }

        // Si backendUrl ou pullInterval change et enabled, reconfigure
        if ((updates.backendUrl || updates.pullInterval) && this._config.enabled) {
            if (updates.backendUrl) {
                httpClient.configure(this._config.backendUrl);
                this._configured = false;
            }
            needsReconfigure = true;
        }

        if (needsReconfigure) {
            this._configureServices();
        }
    }

    /**
     * Teste la connexion au backend via httpClient.
     *
     * @returns {Promise<{ success: boolean, error?: string, user?: Object }>}
     */
    async testConnection() {
        if (!this._config.backendUrl) {
            return { success: false, error: 'URL backend non configuree' };
        }

        if (!AuthService.getToken()) {
            return { success: false, error: "Aucun token d'authentification" };
        }

        // Configure temporairement httpClient si pas encore fait
        if (!httpClient.isConfigured()) {
            httpClient.configure(this._config.backendUrl);
        }

        try {
            const data = await httpClient.get('/api/me');
            return { success: true, user: data.user || data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ---------------------------------------------------------------
    // Persistence
    // ---------------------------------------------------------------

    /**
     * Charge la config depuis IndexedDB.
     *
     * @returns {Promise<void>}
     * @private
     */
    async _loadConfig() {
        const stored = await StorageService.get(CONFIG_KEY, null);
        if (stored) {
            this._config = { ...DEFAULT_CONFIG, ...stored };
        }
    }
}
