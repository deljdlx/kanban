/**
 * Application — Point d'entree centralise de l'application Kanban.
 *
 * Orchestre le cycle de vie de l'application :
 * - Initialisation des services globaux (User, Taxonomy)
 * - Enregistrement des plugins
 * - Navigation entre la page d'accueil et les boards
 * - Chargement et affichage des boards (un seul a la fois)
 *
 * Pattern Singleton : une seule instance accessible via Application.instance.
 *
 * @example
 * // Demarrage standard (affiche la page d'accueil)
 * const app = await Application.create('#app');
 * await app.showHome();
 *
 * // Ouvrir un board specifique
 * await app.openBoard('board-abc123');
 *
 * // Acces depuis n'importe ou
 * Application.instance.currentBoard;
 * Application.instance.showHome();
 */
import UserService from './services/UserService.js';
import BoardService from './services/BoardService.js';
import TaxonomyService from './services/TaxonomyService.js';
import StorageService from './services/StorageService.js';
import AuthService from './services/AuthService.js';
import PluginManager from './plugins/PluginManager.js';
import Hooks from './plugins/HookRegistry.js';
import plugins from './plugins/registry/index.js';
import BoardView from './views/BoardView.js';
import HeaderView from './views/HeaderView.js';
import HomeView from './views/HomeView.js';
import ExplorerView from './views/ExplorerView.js';
import LoginView from './views/LoginView.js';
import Container from './Container.js';
import Router from './services/Router.js';
import SyncService from './sync/SyncService.js';
import { generateId } from './utils/id.js';

class Application {
    /**
     * Instance singleton.
     * @type {Application|null}
     */
    static _instance = null;

    /**
     * Retourne l'instance singleton de l'application.
     * @returns {Application|null}
     */
    static get instance() {
        return this._instance;
    }

    /**
     * Élément DOM racine de l'application.
     * @type {HTMLElement|null}
     */
    _rootElement;

    /**
     * Conteneur du board (entre le header et le reste).
     * @type {HTMLElement|null}
     */
    _boardContainer;

    /**
     * Vue actuellement affichée (HomeView, ExplorerView ou BoardView).
     * Une seule vue active à la fois — remplace les anciennes propriétés
     * _homeView, _explorerView et _currentBoardView.
     * @type {HomeView|ExplorerView|BoardView|null}
     */
    _currentView;

    /**
     * Vue du header (recréée à chaque changement de board).
     * @type {HeaderView|null}
     */
    _headerView;

    /**
     * Élément DOM du header (stocké pour suppression).
     * @type {HTMLElement|null}
     */
    _headerElement;

    /**
     * Board actuellement chargé.
     * @type {import('./models/Board.js').default|null}
     */
    _currentBoard;

    /**
     * ID du board actuellement chargé.
     * @type {string|null}
     */
    _currentBoardId;

    constructor() {
        this._rootElement = null;
        this._boardContainer = null;
        this._currentView = null;
        this._headerView = null;
        this._headerElement = null;
        this._currentBoard = null;
        this._currentBoardId = null;
    }

    /**
     * Retourne le board actuellement affiché.
     * @returns {import('./models/Board.js').default|null}
     */
    get currentBoard() {
        return this._currentBoard;
    }

    /**
     * Retourne l'ID du board actuellement affiché.
     * @returns {string|null}
     */
    get currentBoardId() {
        return this._currentBoardId;
    }

    /**
     * Retourne la vue du board actuellement affiché.
     * Dérivé depuis _currentView — préserve l'API publique.
     * @returns {BoardView|null}
     */
    get currentBoardView() {
        return this._currentView instanceof BoardView ? this._currentView : null;
    }

    /**
     * Initialise les services globaux de l'application.
     * Appelé une seule fois au démarrage.
     *
     * @returns {Promise<void>}
     */
    async init() {
        // AuthService.init() est synchrone — charge la session depuis sessionStorage.
        AuthService.init();

        // Services globaux chargés en parallèle.
        // allSettled évite qu'un service qui échoue empêche les autres de s'initialiser.
        const results = await Promise.allSettled([
            UserService.init(),
            TaxonomyService.init(),
            StorageService.init(), // Initialise IndexedDB
            PluginManager.init(), // Charge l'état des plugins désactivés
        ]);

        const serviceNames = ['UserService', 'TaxonomyService', 'StorageService', 'PluginManager'];
        for (let i = 0; i < results.length; i++) {
            if (results[i].status === 'rejected') {
                console.error(`Application.init() : ${serviceNames[i]} a échoué`, results[i].reason);
            }
        }

        // Plugins enregistrés avant tout rendu (attend chaque plugin)
        await this._registerPlugins();

        // SyncService s'initialise APRÈS les plugins pour que son handler
        // board:saved (priority 20) fire après LiveSyncPlugin (priority 10).
        // Non-bloquant : un échec du sync ne doit pas empêcher l'app de démarrer.
        try {
            await SyncService.init();
        } catch (error) {
            console.error('Application.init() : SyncService a échoué', error);
        }
    }

    /**
     * Monte l'application dans le DOM.
     * Crée la structure de base (header + conteneur board).
     *
     * @param {HTMLElement} rootElement - Élément DOM racine
     */
    mount(rootElement) {
        this._rootElement = rootElement;

        // Conteneur pour le board (sera rempli par openBoard)
        this._boardContainer = document.createElement('div');
        this._boardContainer.id = 'board-container';
        this._rootElement.appendChild(this._boardContainer);
    }

    /**
     * Affiche la page d'accueil avec la liste des boards.
     * Nettoie la vue courante (board, explorer, etc.) avant d'afficher.
     *
     * @returns {Promise<void>}
     */
    async showHome() {
        if (this._currentBoard) {
            Hooks.doAction('board:willChange', {
                currentBoardId: this._currentBoardId,
                nextBoardId: null,
            });
        }

        this._teardownCurrentView();

        try {
            this._currentView = new HomeView();
            await this._currentView.render(this._boardContainer);
        } catch (error) {
            console.error("Application : échec du rendu de la page d'accueil", error);
            this._renderMinimalError("Impossible d'afficher la page d'accueil.");
        }
    }

    /**
     * Affiche l'explorateur IndexedDB.
     * Nettoie la vue courante (board, home, etc.) avant d'afficher.
     *
     * @returns {Promise<void>}
     */
    async showExplorer() {
        if (this._currentBoard) {
            Hooks.doAction('board:willChange', {
                currentBoardId: this._currentBoardId,
                nextBoardId: null,
            });
        }

        this._teardownCurrentView();

        try {
            this._currentView = new ExplorerView();
            await this._currentView.render(this._boardContainer);
        } catch (error) {
            console.error("Application : échec du rendu de l'explorateur", error);
            this._renderMinimalError("Impossible d'afficher l'explorateur.");
        }
    }

    /**
     * Affiche l'écran de connexion.
     * Nettoie la vue courante avant d'afficher.
     *
     * @returns {Promise<void>}
     */
    async showLogin() {
        this._teardownCurrentView();

        try {
            this._currentView = new LoginView();
            this._currentView.render(this._boardContainer);
        } catch (error) {
            console.error('Application : échec du rendu de la page de connexion', error);
            this._renderMinimalError("Impossible d'afficher la page de connexion.");
        }
    }

    /**
     * Charge et affiche un board par son ID.
     * Si aucun ID n'est fourni, charge le board actif ou en crée un nouveau.
     * Si une vue est déjà affichée, elle est proprement nettoyée.
     *
     * Émet les hooks :
     *   - board:willChange (avant cleanup, permet aux plugins de se préparer)
     *   - board:didChange (après rendu, permet aux plugins de s'initialiser)
     *
     * @param {string|null} [boardId=null] - ID du board à charger (null = auto)
     * @returns {Promise<void>}
     */
    async openBoard(boardId = null) {
        if (!boardId) {
            boardId = await this._resolveActiveBoardId();
        }

        const previousBoardId = this._currentBoardId;

        // Notifie les plugins avant le changement (même au premier chargement)
        Hooks.doAction('board:willChange', {
            currentBoardId: previousBoardId,
            nextBoardId: boardId,
        });

        this._teardownCurrentView();

        // Charge les données du board (error boundary : IndexedDB peut échouer)
        try {
            await BoardService.fetchBoard(boardId);
            this._currentBoard = BoardService.buildBoard();
            this._currentBoardId = boardId;
            await StorageService.setActiveBoard(boardId);
        } catch (error) {
            console.error('Application : échec du chargement du board', error);
            this._renderBoardError(error);
            return;
        }

        // Render header + board, avec error boundary global
        try {
            this._renderHeader();
            this._currentView = new BoardView(this._currentBoard);
            this._currentView.render(this._boardContainer);
        } catch (error) {
            console.error('Application : échec du rendu du board', error);
            this._currentView = null;
            this._currentBoard = null;
            this._currentBoardId = null;
            this._renderBoardError(error);
            return;
        }

        // Notifie les plugins après le changement
        Hooks.doAction('board:didChange', {
            previousBoardId,
            board: this._currentBoard,
        });
    }

    /**
     * Affiche un message d'erreur dans le conteneur board avec un bouton retour.
     * Appelé quand le rendu du board échoue.
     *
     * @param {Error} error
     * @private
     */
    _renderBoardError(error) {
        this._boardContainer.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'board-error';

        const title = document.createElement('h2');
        title.className = 'board-error-title';
        title.textContent = 'Erreur de rendu du board';

        const msg = document.createElement('p');
        msg.className = 'board-error-message';
        msg.textContent = error.message || 'Une erreur inattendue est survenue.';

        const btn = document.createElement('button');
        btn.className = 'board-error-back';
        btn.textContent = "Retour à l'accueil";
        btn.addEventListener('click', () => Router.navigate('/'));

        wrapper.appendChild(title);
        wrapper.appendChild(msg);
        wrapper.appendChild(btn);
        this._boardContainer.appendChild(wrapper);
    }

    /**
     * Affiche un message d'erreur minimal dans le conteneur board.
     * Utilisé quand même la page d'accueil ne peut pas s'afficher.
     *
     * @param {string} message
     * @private
     */
    _renderMinimalError(message) {
        this._boardContainer.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'board-error-minimal';
        wrapper.textContent = message;

        this._boardContainer.appendChild(wrapper);
    }

    /**
     * Résout l'ID du board à charger.
     * Priorité : board actif du registre → nouveau board créé.
     *
     * @returns {Promise<string>}
     * @private
     */
    async _resolveActiveBoardId() {
        const registry = await StorageService.getBoardRegistry();

        // Si un board actif existe, l'utiliser
        if (registry.activeBoard) {
            // Vérifie que le board existe toujours
            const exists = registry.boards.some((b) => b.id === registry.activeBoard);
            if (exists) {
                return registry.activeBoard;
            }
        }

        // Si des boards existent, utiliser le premier
        if (registry.boards.length > 0) {
            return registry.boards[0].id;
        }

        // Sinon, créer un nouveau board
        return await StorageService.createBoard('Mon Kanban');
    }

    /**
     * Enregistre tous les plugins définis dans le registre.
     * Le tri par priorité est géré par PluginManager.registerAll().
     *
     * @returns {Promise<void>}
     * @private
     */
    async _registerPlugins() {
        await PluginManager.registerAll(plugins);
    }

    /**
     * Rend le header avec les callbacks appropriés.
     * Le header est recréé à chaque changement de board pour
     * garantir que les callbacks pointent vers le bon board.
     *
     * @private
     */
    _renderHeader() {
        // Détruit proprement l'ancien header (listeners + DOM)
        this._destroyHeader();

        this._headerView = new HeaderView({
            board: this._currentBoard,
            onAddColumn: (title) => {
                BoardService.addColumn(title);
            },
            onAddCard: (cardData) => {
                const { columnId, ...rest } = cardData;
                const data = { id: generateId('card'), ...rest };
                BoardService.addCard(columnId, data, 0);
            },
        });

        // Insère le header avant le board container
        this._headerElement = this._headerView.render();
        this._rootElement.insertBefore(this._headerElement, this._boardContainer);
    }

    /**
     * Détruit proprement le header (listeners + DOM).
     *
     * @private
     */
    _destroyHeader() {
        if (this._headerView) {
            this._headerView.destroy();
            this._headerView = null;
        }
        if (this._headerElement) {
            this._headerElement.remove();
            this._headerElement = null;
        }
    }

    /**
     * Nettoie la vue courante (quelle qu'elle soit) et l'état associé.
     *
     * Responsabilités :
     * - Détruit le header board-spécifique (si existe)
     * - Révoque les Object URLs (toujours — corrige le leak Home→Explorer)
     * - Détruit _currentView (générique, fonctionne pour toute vue)
     * - Vide le container (défensif : BoardView ne fait pas _element.remove())
     * - Reset l'état board (_currentBoard, _currentBoardId)
     *
     * @private
     */
    _teardownCurrentView() {
        this._destroyHeader();

        // Toujours révoquer — même depuis Home qui peut avoir des images de couverture
        StorageService.revokeAllImageUrls();

        if (this._currentView) {
            try {
                this._currentView.destroy();
            } catch (error) {
                console.error('Application : échec du destroy de la vue courante', error);
            }
            this._currentView = null;
        }

        // Défensif : BoardView.destroy() ne retire pas son élément du DOM
        this._boardContainer.innerHTML = '';

        this._currentBoard = null;
        this._currentBoardId = null;
    }

    /**
     * Factory method : crée, initialise et monte l'application.
     *
     * @param {string} [rootSelector='#app'] - Sélecteur CSS de l'élément racine
     * @returns {Promise<Application>}
     */
    static async create(rootSelector = '#app') {
        const app = new Application();
        this._instance = app;

        // Expose en dev pour debug
        if (import.meta.env.DEV) {
            window.__Application = app;
        }

        await app.init();

        const rootElement = document.querySelector(rootSelector);
        if (!rootElement) {
            throw new Error(`Application.create() : élément "${rootSelector}" introuvable`);
        }
        app.mount(rootElement);

        // Enregistre dans le Container pour accès unifié
        Container.set('Application', app);

        // Sauvegarde le board en cours avant fermeture de l'onglet.
        // flush() annule le debounce et lance un save() immédiat.
        // IndexedDB finalise les transactions même pendant le unload.
        window.addEventListener('beforeunload', () => {
            const bs = Container.get('BoardService');
            if (bs) bs.flush();
        });

        return app;
    }
}

export default Application;
