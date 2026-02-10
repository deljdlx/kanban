/**
 * Router — Routeur hash-based léger.
 *
 * Gère la navigation par URL via le hash (#/path).
 * Écoute l'événement `hashchange` pour réagir aux boutons
 * back/forward du navigateur et permet le deep linking.
 *
 * Chaque route est déclarée avec un pattern (ex: '/board/:id')
 * et un handler async appelé quand l'URL correspond.
 *
 *   window.hashchange
 *          │
 *          ▼
 *   Router._handleCurrentHash()
 *          │  match path → route handler
 *          ▼
 *   app.showHome()  ou  app.openBoard(id)
 *
 * Singleton exporté : `import Router from './services/Router.js'`.
 *
 * @example
 * Router.addRoute('/', async () => { ... });
 * Router.addRoute('/board/:id', async ({ params }) => { ... });
 * await Router.start();
 */
import Container from '../Container.js';

class Router {
    /**
     * Routes enregistrées.
     * @type {Array<{ pattern: string, regex: RegExp, paramNames: string[], handler: Function }>}
     */
    _routes;

    /**
     * Verrou anti-réentrance (les handlers sont async).
     * @type {boolean}
     */
    _navigating;

    /**
     * Chemin courant sans le '#'.
     * @type {string}
     */
    _currentPath;

    /**
     * Référence liée au listener hashchange (pour pouvoir la retirer).
     * @type {Function|null}
     */
    _onHashChangeBound;

    constructor() {
        this._routes = [];
        this._navigating = false;
        this._currentPath = '';
        this._onHashChangeBound = null;
    }

    /**
     * Enregistre une route.
     *
     * Les segments `:param` sont convertis en groupes de capture regex.
     * Le handler reçoit un objet `{ params }` avec les paramètres extraits.
     *
     * @param {string} pattern - Pattern de route (ex: '/board/:id')
     * @param {Function} handler - Handler async appelé quand la route correspond
     */
    addRoute(pattern, handler) {
        const { regex, paramNames } = this._compilePattern(pattern);
        this._routes.push({ pattern, regex, paramNames, handler });
    }

    /**
     * Navigue vers un chemin en mettant à jour le hash.
     *
     * Si le chemin est identique au chemin courant, ne fait rien.
     * Le changement de hash déclenche automatiquement `hashchange`
     * qui appelle le handler correspondant.
     *
     * @param {string} path - Chemin cible (ex: '/board/abc123')
     */
    navigate(path) {
        const normalized = path.startsWith('/') ? path : '/' + path;

        if (normalized === this._currentPath) {
            return;
        }

        window.location.hash = '#' + normalized;
        // hashchange sera déclenché → _handleCurrentHash() s'exécute
    }

    /**
     * Démarre le routeur.
     *
     * Installe le listener `hashchange` et traite le hash initial
     * (deep linking / refresh).
     *
     * @returns {Promise<void>}
     */
    async start() {
        this._onHashChangeBound = () => this._handleCurrentHash();
        window.addEventListener('hashchange', this._onHashChangeBound);

        // Traite le hash initial (deep linking / refresh)
        await this._handleCurrentHash();
    }

    /**
     * Arrête le routeur et retire le listener.
     */
    destroy() {
        if (this._onHashChangeBound) {
            window.removeEventListener('hashchange', this._onHashChangeBound);
            this._onHashChangeBound = null;
        }
    }

    /**
     * Lit le hash courant, trouve la route correspondante et exécute le handler.
     *
     * Utilise un verrou (_navigating) pour éviter les appels concurrents
     * pendant qu'un handler async est en cours.
     *
     * @returns {Promise<void>}
     * @private
     */
    async _handleCurrentHash() {
        if (this._navigating) {
            return;
        }

        const path = this._readHash();
        const match = this._match(path);

        if (!match) {
            // Guard : si on est déjà sur '/', évite une boucle infinie
            if (path === '/') {
                console.error('Router : aucune route enregistrée pour "/" — abandon');
                return;
            }
            console.warn(`Router : route inconnue "${path}", redirection vers /`);
            this.navigate('/');
            return;
        }

        this._navigating = true;
        this._currentPath = path;

        try {
            await match.handler({ params: match.params });
        } finally {
            this._navigating = false;
        }
    }

    /**
     * Cherche la première route qui correspond au chemin donné.
     *
     * @param {string} path - Chemin à matcher
     * @returns {{ handler: Function, params: Object }|null}
     * @private
     */
    _match(path) {
        for (const route of this._routes) {
            const result = route.regex.exec(path);
            if (result) {
                const params = {};
                route.paramNames.forEach((name, index) => {
                    params[name] = result[index + 1];
                });
                return { handler: route.handler, params };
            }
        }
        return null;
    }

    /**
     * Lit et normalise le hash de l'URL.
     *
     * '', '#', '#/' → '/'
     * '#/board/abc' → '/board/abc'
     *
     * @returns {string} Chemin normalisé
     * @private
     */
    _readHash() {
        const hash = window.location.hash;

        // Pas de hash ou hash vide → '/'
        if (!hash || hash === '#' || hash === '#/') {
            return '/';
        }

        // Retire le '#' initial
        return hash.substring(1);
    }

    /**
     * Compile un pattern de route en regex.
     *
     * Les segments ':param' deviennent des groupes de capture `([^/]+)`.
     *
     * @param {string} pattern - Pattern (ex: '/board/:id')
     * @returns {{ regex: RegExp, paramNames: string[] }}
     * @private
     */
    _compilePattern(pattern) {
        const paramNames = [];

        // Échappe les caractères spéciaux regex, sauf ':' qui marque les params
        const regexStr = pattern.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, paramName) => {
            paramNames.push(paramName);
            return '([^/]+)';
        });

        return {
            regex: new RegExp('^' + regexStr + '$'),
            paramNames,
        };
    }
}

// Singleton
const router = new Router();

// Enregistre dans le Container pour accès unifié
Container.set('Router', router);

export default router;
