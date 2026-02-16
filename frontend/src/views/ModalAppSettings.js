/**
 * ModalAppSettings — Modale de configuration globale de l'application.
 *
 * Affiche une modale fullscreen avec système d'onglets pour les réglages
 * qui ne dépendent pas d'un board spécifique :
 *   - "Profil" (solo mode) : nom, initiales, couleur de l'utilisateur
 *   - "Plugins" : liste des plugins à scope "app" avec toggles et configuration
 *   - Onglets additionnels injectés par les plugins via hook
 *
 * Structure DOM identique à ModalBoardSettings :
 *   div.board-settings-overlay
 *     div.board-settings
 *       div.board-settings-header
 *         h2 + button.board-settings-close
 *       div.board-settings-body
 *         nav.board-settings-sidebar
 *           button.board-settings-nav-item (×N)
 *         div.board-settings-content
 *           div.board-settings-panel (×N, un seul --active)
 *
 * Hook disponible :
 *
 *   modal:appSettings:opened
 *     Contexte :
 *       - registerTab(id, label, buildPanel) : ajoute un onglet
 *       - onClose(fn) : callback de nettoyage
 */
import Hooks from '../plugins/HookRegistry.js';
import { isSoloMode } from '../config/appMode.js';
import ProfilePanel from './boardSettings/ProfilePanel.js';
import PluginsPanel from './boardSettings/PluginsPanel.js';

export default class ModalAppSettings {
    /**
     * Élément racine (overlay) ajouté au DOM.
     * @type {HTMLElement|null}
     */
    _overlay;

    /**
     * Sidebar de navigation.
     * @type {HTMLElement|null}
     */
    _sidebar;

    /**
     * Conteneur des panneaux.
     * @type {HTMLElement|null}
     */
    _content;

    /**
     * Tous les boutons de navigation.
     * @type {HTMLElement[]}
     */
    _navItems;

    /**
     * Tous les panneaux.
     * @type {HTMLElement[]}
     */
    _panels;

    /**
     * Callbacks à appeler lors de la fermeture.
     * @type {Function[]}
     */
    _closeCallbacks;

    /**
     * Instance du PluginsPanel (pour cleanup).
     * @type {PluginsPanel|null}
     */
    _pluginsPanel;

    constructor() {
        this._overlay = null;
        this._sidebar = null;
        this._content = null;
        this._navItems = [];
        this._panels = [];
        this._closeCallbacks = [];
        this._pluginsPanel = null;
    }

    /**
     * Construit le DOM et l'ajoute au body.
     */
    open() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay board-settings-overlay';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });

        const modal = document.createElement('div');
        modal.className = 'board-settings';

        // — Header
        modal.appendChild(this._buildHeader());

        // — Body (sidebar + content)
        const body = document.createElement('div');
        body.className = 'board-settings-body';

        this._sidebar = document.createElement('nav');
        this._sidebar.className = 'board-settings-sidebar';

        this._content = document.createElement('div');
        this._content.className = 'board-settings-content';

        body.appendChild(this._sidebar);
        body.appendChild(this._content);
        modal.appendChild(body);

        // — Assemblage
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        this._overlay = overlay;

        // — Onglets built-in
        this._addBuiltInTabs();

        // — Hook pour que les plugins ajoutent leurs onglets
        const hookContext = {
            registerTab: (id, label, buildPanel) => this._registerTab(id, label, buildPanel),
            onClose: (fn) => this._closeCallbacks.push(fn),
        };
        Hooks.doAction('modal:appSettings:opened', hookContext);

        // — Active le premier onglet
        if (this._navItems.length > 0) {
            this._activateTab(0);
        }
    }

    /**
     * Retire la modale du DOM.
     */
    close() {
        for (const fn of this._closeCallbacks) fn();
        this._closeCallbacks = [];

        if (this._pluginsPanel) {
            this._pluginsPanel.destroy();
            this._pluginsPanel = null;
        }

        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
    }

    // ---------------------------------------------------------------
    // Construction des éléments
    // ---------------------------------------------------------------

    /**
     * Construit le header.
     *
     * @returns {HTMLElement}
     * @private
     */
    _buildHeader() {
        const header = document.createElement('div');
        header.className = 'board-settings-header';

        const title = document.createElement('h2');
        title.textContent = "Paramètres de l'application";

        const closeBtn = document.createElement('button');
        closeBtn.className = 'board-settings-close';
        closeBtn.textContent = '\u00d7';
        closeBtn.addEventListener('click', () => this.close());

        header.appendChild(title);
        header.appendChild(closeBtn);
        return header;
    }

    /**
     * Ajoute les onglets built-in.
     *
     * @private
     */
    _addBuiltInTabs() {
        // Onglet Profil (solo mode uniquement)
        if (isSoloMode()) {
            const profilePanel = new ProfilePanel();
            this._registerTab('profile', 'Profil', (panel) => profilePanel.build(panel));
        }

        // Onglet Plugins (scope app uniquement)
        this._pluginsPanel = new PluginsPanel('app', {
            onRequestClose: () => this.close(),
        });
        this._registerTab('plugins', 'Plugins', (panel) => this._pluginsPanel.build(panel));
    }

    // ---------------------------------------------------------------
    // Gestion des onglets
    // ---------------------------------------------------------------

    /**
     * Enregistre un onglet.
     *
     * @param {string} id
     * @param {string} label
     * @param {Function} buildPanel - (panel) => void
     * @private
     */
    _registerTab(id, label, buildPanel) {
        const index = this._navItems.length;

        const navItem = document.createElement('button');
        navItem.className = 'board-settings-nav-item';
        navItem.type = 'button';
        navItem.textContent = label;
        navItem.dataset.tabId = id;
        navItem.addEventListener('click', () => this._activateTab(index));
        this._sidebar.appendChild(navItem);
        this._navItems.push(navItem);

        const panel = document.createElement('div');
        panel.className = 'board-settings-panel';
        panel.dataset.tabId = id;
        buildPanel(panel);
        this._content.appendChild(panel);
        this._panels.push(panel);
    }

    /**
     * Active un onglet par son index.
     *
     * @param {number} index
     * @private
     */
    _activateTab(index) {
        this._navItems.forEach((item, i) => {
            item.classList.toggle('board-settings-nav-item--active', i === index);
        });
        this._panels.forEach((panel, i) => {
            panel.classList.toggle('board-settings-panel--active', i === index);
        });
    }
}
