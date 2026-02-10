/**
 * main.js — Point d'entrée de l'application Kanban.
 *
 * Importe les styles, démarre l'application via Application.create(),
 * puis configure les routes et démarre le routeur hash-based.
 *
 * En mode multi, les routes (sauf /login) sont protégées par un guard
 * qui redirige vers /login si l'utilisateur n'est pas authentifié.
 */
import './styles/main.scss';
import './plugins/hookDefinitions.js';
import Application from './Application.js';
import Router from './services/Router.js';
import AuthService from './services/AuthService.js';
import { isSoloMode } from './config/appMode.js';

/**
 * Wrapper de route : redirige vers /login si non authentifié en mode multi.
 * En mode solo, le handler est appelé directement.
 *
 * @param {Function} handler - Handler async de la route
 * @returns {Function} Handler protégé
 */
const requireAuth = (handler) => async (ctx) => {
    if (!isSoloMode() && !AuthService.isAuthenticated()) {
        AuthService.setRedirectUrl(Router._currentPath || '/');
        Router.navigate('/login');
        return;
    }
    await handler(ctx);
};

(async () => {
    const app = await Application.create('#app');

    Router.addRoute('/login', async () => {
        await app.showLogin();
    });

    Router.addRoute(
        '/',
        requireAuth(async () => {
            await app.showHome();
        }),
    );

    Router.addRoute(
        '/board/:id',
        requireAuth(async ({ params }) => {
            await app.openBoard(params.id);
        }),
    );

    Router.addRoute(
        '/explorer',
        requireAuth(async () => {
            await app.showExplorer();
        }),
    );

    await Router.start();
})();
