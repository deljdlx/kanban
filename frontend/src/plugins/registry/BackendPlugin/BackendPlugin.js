/**
 * BackendPlugin — Connexion frontend ↔ backend Laravel.
 *
 * Orchestrateur qui connecte les services (Auth, User, Taxonomy, Sync, Images)
 * au backend Laravel via l'API REST. Active la synchronisation bidirectionnelle
 * tout en maintenant le mode offline-first avec IndexedDB comme source de vérité.
 *
 * Lifecycle :
 *
 *   app:initialized
 *     │
 *     ├─ charge config depuis IndexedDB
 *     ├─ si enabled && token existe
 *     │  ├─ configure AuthService
 *     │  ├─ configure UserService
 *     │  ├─ configure TaxonomyService
 *     │  ├─ crée RestBackendAdapter
 *     │  └─ injecte dans SyncService
 *     └─ écoute auth:login/logout
 *
 *   auth:login (réussi)
 *     │
 *     ├─ token Sanctum stocké par AuthService
 *     └─ configure tous les services backend
 *
 *   auth:logout
 *     │
 *     └─ désactive sync, nettoie config
 *
 * Configuration persistée dans IndexedDB (meta store, clé: backend:config) :
 *   - backendUrl : string (ex: 'http://localhost:8080')
 *   - pullInterval : number (ms, défaut: 30000)
 *   - enabled : boolean (défaut: false)
 */
import Container from '../../../Container.js';
import StorageService from '../../../services/StorageService.js';
import AuthService from '../../../services/AuthService.js';
import UserService from '../../../services/UserService.js';
import TaxonomyService from '../../../services/TaxonomyService.js';
import SyncService from '../../../sync/SyncService.js';
import RestBackendAdapter from '../../../sync/RestBackendAdapter.js';
import { NoOpBackendAdapter } from '../../../sync/BackendAdapter.js';
import ImageStorage from '../../../services/storage/IndexedDBImageStorage.js';
import ImageBackendAdapter from './ImageBackendAdapter.js';

/** Clé IndexedDB pour la config du plugin */
const CONFIG_KEY = 'backend:config';

/** Configuration par défaut */
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
     * Référence au hook registry.
     * @type {import('../../HookRegistry.js').default|null}
     */
    _hooksRegistry;

    /**
     * Handlers pour cleanup.
     * @type {Object<string, Function>}
     */
    _handlers;

    constructor() {
        this._config = { ...DEFAULT_CONFIG };
        this._adapter = null;
        this._imageAdapter = null;
        this._hooksRegistry = null;
        this._handlers = {};
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

        // Écoute les hooks
        this._handlers.onAppInitialized = () => this._onAppInitialized();
        hooks.addAction('app:initialized', this._handlers.onAppInitialized);

        this._handlers.onAuthLogin = () => this._onAuthLogin();
        hooks.addAction('auth:login', this._handlers.onAuthLogin);

        this._handlers.onAuthLogout = () => this._onAuthLogout();
        hooks.addAction('auth:logout', this._handlers.onAuthLogout);
    }

    /**
     * Désinstallation du plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        // Retire les hooks
        if (this._handlers.onAppInitialized) {
            hooks.removeAction('app:initialized', this._handlers.onAppInitialized);
        }
        if (this._handlers.onAuthLogin) {
            hooks.removeAction('auth:login', this._handlers.onAuthLogin);
        }
        if (this._handlers.onAuthLogout) {
            hooks.removeAction('auth:logout', this._handlers.onAuthLogout);
        }

        // Nettoie l'adapteur
        this._adapter = null;
        this._hooksRegistry = null;
    }

    // ---------------------------------------------------------------
    // Hooks handlers
    // ---------------------------------------------------------------

    /**
     * Handler pour app:initialized.
     * Appelé au démarrage de l'app, après le chargement des plugins.
     *
     * @private
     */
    _onAppInitialized() {
        // Si enabled et token existe, configure les services
        if (this._config.enabled && AuthService.getToken()) {
            this._configureServices();
        }
    }

    /**
     * Handler pour auth:login.
     * Appelé après un login réussi.
     *
     * @private
     */
    _onAuthLogin() {
        // Si enabled, configure les services
        if (this._config.enabled) {
            this._configureServices();
        }
    }

    /**
     * Handler pour auth:logout.
     * Appelé après un logout.
     *
     * @private
     */
    _onAuthLogout() {
        // Désactive le sync en repassant à NoOpBackendAdapter (import direct)
        SyncService.setAdapter(new NoOpBackendAdapter());

        // Désactive le backend pour les images
        ImageStorage.setBackendAdapter(null);
    }

    // ---------------------------------------------------------------
    // Configuration des services
    // ---------------------------------------------------------------

    /**
     * Configure tous les services pour utiliser le backend.
     *
     * @private
     */
    _configureServices() {
        if (!this._config.backendUrl) {
            console.warn('BackendPlugin: backendUrl non configurée');
            return;
        }

        const backendUrl = this._config.backendUrl;

        // Fonction qui retourne les headers auth
        const getHeaders = () => {
            const token = AuthService.getToken();
            return token ? { Authorization: `Bearer ${token}` } : {};
        };

        // Configure AuthService
        AuthService.setBackendUrl(backendUrl);

        // Configure UserService et recharge les données
        UserService.setFetchUrl(`${backendUrl}/api/users`, getHeaders);
        UserService.reload().catch((err) =>
            console.warn('BackendPlugin: échec reload UserService', err),
        );

        // Configure TaxonomyService et recharge les données
        TaxonomyService.setFetchUrl(`${backendUrl}/api/taxonomies`, getHeaders);
        TaxonomyService.reload().catch((err) =>
            console.warn('BackendPlugin: échec reload TaxonomyService', err),
        );

        // Configure SyncService
        this._adapter = new RestBackendAdapter({
            baseUrl: backendUrl,
            getHeaders,
            timeout: 10000,
        });
        SyncService.setAdapter(this._adapter);
        SyncService.setPullInterval(this._config.pullInterval);

        // Configure ImageStorage
        this._imageAdapter = new ImageBackendAdapter({
            baseUrl: backendUrl,
            getHeaders,
        });
        ImageStorage.setBackendAdapter(this._imageAdapter);

        console.warn('BackendPlugin: services configurés avec', backendUrl);
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
     * Met à jour la configuration et persiste dans IndexedDB.
     *
     * @param {{ backendUrl?: string, pullInterval?: number, enabled?: boolean }} updates
     * @returns {Promise<void>}
     */
    async updateConfig(updates) {
        this._config = { ...this._config, ...updates };
        await StorageService.set(CONFIG_KEY, this._config);

        // Détermine si une reconfiguration est nécessaire
        let needsReconfigure = false;

        if (updates.enabled !== undefined) {
            if (updates.enabled && AuthService.getToken()) {
                needsReconfigure = true;
            } else if (!updates.enabled) {
                this._onAuthLogout();
                return; // Pas besoin de reconfigurer après logout
            }
        }

        // Si backendUrl ou pullInterval change et enabled, reconfigure
        if ((updates.backendUrl || updates.pullInterval) && this._config.enabled) {
            needsReconfigure = true;
        }

        // Configure une seule fois à la fin
        if (needsReconfigure) {
            this._configureServices();
        }
    }

    /**
     * Teste la connexion au backend.
     *
     * @returns {Promise<{ success: boolean, error?: string, user?: Object }>}
     */
    async testConnection() {
        if (!this._config.backendUrl) {
            return { success: false, error: 'URL backend non configurée' };
        }

        const token = AuthService.getToken();
        if (!token) {
            return { success: false, error: "Aucun token d'authentification" };
        }

        try {
            const response = await fetch(`${this._config.backendUrl}/api/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}` };
            }

            const data = await response.json();
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
