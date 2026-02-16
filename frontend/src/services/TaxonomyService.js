/**
 * TaxonomyService — Gère les taxonomies de tags (statiques et dynamiques).
 *
 * Sources de taxonomies :
 *   1. Statiques : chargées depuis `/api/taxonomies.json` au démarrage
 *   2. Dynamiques : enregistrées par des plugins via registerTaxonomy()
 *
 * Singleton exporté. On appelle `init()` une seule fois au démarrage,
 * puis les getters sont synchrones pour le reste de l'application.
 *
 * Les plugins de taxonomies utilisent registerTaxonomy/unregisterTaxonomy
 * pour ajouter leurs taxonomies personnalisées (ex: complexité, catégorie).
 *
 * Hérite d'EventEmitter — émet 'change' quand les taxonomies changent.
 */
import EventEmitter from '../lib/EventEmitter.js';

class TaxonomyService extends EventEmitter {
    /**
     * Taxonomies statiques chargées depuis l'API.
     * @type {Object<string, { label: string, terms: Object<string, { label: string, color: string }> }>}
     */
    _staticTaxonomies;

    /**
     * Taxonomies dynamiques enregistrées par les plugins.
     * @type {Object<string, { label: string, terms: Object<string, { label: string, color: string }> }>}
     */
    _dynamicTaxonomies;

    /**
     * Indique si le fetch a déjà été effectué (évite les appels multiples).
     * @type {boolean}
     */
    _loaded;

    /**
     * Client HTTP centralisé pour les appels backend (null = mode local).
     * @type {import('./BackendHttpClient.js').BackendHttpClient|null}
     */
    _httpClient;

    constructor() {
        super();
        this._staticTaxonomies = {};
        this._dynamicTaxonomies = {};
        this._loaded = false;
        this._httpClient = null;
    }

    /**
     * Charge les taxonomies statiques depuis `/api/taxonomies.json`.
     * Si déjà chargé, ne fait rien. En cas d'erreur réseau,
     * l'objet reste vide (fallback silencieux).
     */
    async init() {
        if (this._loaded) {
            return;
        }

        await this._loadStatic();

        this._loaded = true;
    }

    /**
     * Configure le client HTTP pour les appels backend.
     *
     * @param {import('./BackendHttpClient.js').BackendHttpClient|null} httpClient
     */
    setHttpClient(httpClient) {
        this._httpClient = httpClient;
    }

    /**
     * Force un rechargement des taxonomies depuis le backend.
     * Utile après configuration du backend ou changement d'URL.
     *
     * @returns {Promise<void>}
     */
    async reload() {
        await this._loadStatic();
    }

    /**
     * Charge les taxonomies depuis l'API (backend ou mock local).
     * Si httpClient est configuré, utilise le backend. Sinon, mock local.
     *
     * @private
     */
    async _loadStatic() {
        try {
            let data;

            if (this._httpClient) {
                data = await this._httpClient.get('/api/taxonomies');
            } else {
                const response = await fetch('/api/taxonomies.json');
                if (!response.ok) throw new Error('HTTP ' + response.status);
                data = await response.json();
            }

            // Backend retourne un tableau [{ key, label, terms }]
            // Mock local retourne { taxonomies: { [key]: { label, terms } } }
            if (Array.isArray(data)) {
                this._staticTaxonomies = this._transformBackendArray(data);
            } else {
                this._staticTaxonomies = data.taxonomies || {};
            }
        } catch (error) {
            console.warn('TaxonomyService : impossible de charger les taxonomies', error);

            // Fallback sur le mock local si le backend échoue
            if (this._httpClient) {
                try {
                    const response = await fetch('/api/taxonomies.json');
                    if (response.ok) {
                        const data = await response.json();
                        this._staticTaxonomies = data.taxonomies || {};
                    } else {
                        this._staticTaxonomies = {};
                    }
                } catch (_fallbackError) {
                    this._staticTaxonomies = {};
                }
            } else {
                this._staticTaxonomies = {};
            }
        }
    }

    /**
     * Transforme un tableau backend en map.
     *
     * @param {Array<{ key: string, label: string, terms: Object }>} array
     * @returns {Object<string, { label: string, terms: Object }>}
     * @private
     */
    _transformBackendArray(array) {
        const map = {};
        for (const item of array) {
            map[item.key] = {
                label: item.label,
                terms: item.terms || {},
            };
        }
        return map;
    }

    // ---------------------------------------------------------------
    // Enregistrement dynamique (pour les plugins)
    // ---------------------------------------------------------------

    /**
     * Enregistre une taxonomie dynamique (depuis un plugin).
     *
     * @param {string} key - Clé unique de la taxonomie (ex: 'complexity')
     * @param {Object} config - Configuration de la taxonomie
     * @param {string} config.label - Label affiché (ex: 'Complexité')
     * @param {Object<string, { label: string, color: string }>} config.terms - Termes disponibles
     */
    registerTaxonomy(key, config) {
        if (this._staticTaxonomies[key]) {
            console.warn(`TaxonomyService : la taxonomie "${key}" existe déjà en statique, ignorée.`);
            return;
        }
        this._dynamicTaxonomies[key] = config;
        this.emit('change');
    }

    /**
     * Retire une taxonomie dynamique.
     *
     * @param {string} key - Clé de la taxonomie à retirer
     */
    unregisterTaxonomy(key) {
        if (this._dynamicTaxonomies[key]) {
            delete this._dynamicTaxonomies[key];
            this.emit('change');
        }
    }

    /**
     * Vérifie si une taxonomie existe.
     *
     * @param {string} key
     * @returns {boolean}
     */
    hasTaxonomy(key) {
        return !!(this._staticTaxonomies[key] || this._dynamicTaxonomies[key]);
    }

    // ---------------------------------------------------------------
    // Getters
    // ---------------------------------------------------------------

    /**
     * Retourne toutes les taxonomies (statiques + dynamiques).
     *
     * @returns {Object<string, { label: string, terms: Object<string, { label: string, color: string }> }>}
     */
    getTaxonomies() {
        return { ...this._staticTaxonomies, ...this._dynamicTaxonomies };
    }

    /**
     * Retourne la configuration d'un terme dans une taxonomie.
     *
     * @param {string} taxonomy - Clé de la taxonomie (ex: 'type', 'priority')
     * @param {string} term - Clé du terme (ex: 'feature', 'high')
     * @returns {{ label: string, color: string }|null} Config du terme, ou null si introuvable
     */
    getTermConfig(taxonomy, term) {
        const all = this.getTaxonomies();
        return all[taxonomy]?.terms[term] ?? null;
    }
}

import Container from '../Container.js';

const taxonomyService = new TaxonomyService();
Container.set('TaxonomyService', taxonomyService);

export { TaxonomyService };
export default taxonomyService;
