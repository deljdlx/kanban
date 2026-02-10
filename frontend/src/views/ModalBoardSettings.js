/**
 * ModalBoardSettings — Modale de configuration générale du board.
 *
 * Affiche une modale fullscreen avec système d'onglets :
 *   - "Général" : nom du board, image de fond + zone d'injection pour plugins
 *   - "Plugins" : liste des plugins avec toggles et boutons de configuration
 *   - Onglets additionnels injectés par les plugins via hook
 *
 * Structure DOM :
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
 * Hooks disponibles :
 *
 *   modal:boardSettings:opened
 *     Contexte :
 *       - registerTab(id, label, buildPanel) : ajoute un onglet
 *       - board : instance du Board
 *       - onClose(fn) : callback de nettoyage
 *
 *   modal:boardSettings:general
 *     Contexte :
 *       - panel : HTMLElement du panneau Général (pour injecter du contenu)
 *       - board : instance du Board
 *     Permet aux plugins d'ajouter des champs dans l'onglet Général.
 *
 * Les panels sont extraits dans des classes dédiées :
 *   - boardSettings/GeneralPanel.js
 *   - boardSettings/PluginsPanel.js
 */
import Hooks from '../plugins/HookRegistry.js';
import { isSoloMode } from '../config/appMode.js';
import GeneralPanel from './boardSettings/GeneralPanel.js';
import ProfilePanel from './boardSettings/ProfilePanel.js';
import PluginsPanel from './boardSettings/PluginsPanel.js';

export default class ModalBoardSettings {
    /**
     * Référence au Board.
     * @type {import('../models/Board.js').default}
     */
    _board;

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

    /**
     * @param {import('../models/Board.js').default} board
     */
    constructor(board) {
        this._board = board;
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
            board: this._board,
            onClose: (fn) => this._closeCallbacks.push(fn),
        };
        Hooks.doAction('modal:boardSettings:opened', hookContext);

        // — Active le premier onglet
        if (this._navItems.length > 0) {
            this._activateTab(0);
        }
    }

    /**
     * Retire la modale du DOM.
     */
    close() {
        // Appelle les callbacks de nettoyage
        for (const fn of this._closeCallbacks) fn();
        this._closeCallbacks = [];

        // Nettoyage du PluginsPanel
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
        title.textContent = 'Configuration du board';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'board-settings-close';
        closeBtn.textContent = '×';
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
        // Onglet Général
        const generalPanel = new GeneralPanel(this._board, {
            onClose: () => this.close(),
        });
        this._registerTab('general', 'Général', (panel) => generalPanel.build(panel));

        // Onglet Profil (solo mode uniquement)
        if (isSoloMode()) {
            const profilePanel = new ProfilePanel();
            this._registerTab('profile', 'Profil', (panel) => profilePanel.build(panel));
        }

        // Onglet Plugins
        this._pluginsPanel = new PluginsPanel();
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

        // Bouton de navigation
        const navItem = document.createElement('button');
        navItem.className = 'board-settings-nav-item';
        navItem.type = 'button';
        navItem.textContent = label;
        navItem.dataset.tabId = id;
        navItem.addEventListener('click', () => this._activateTab(index));
        this._sidebar.appendChild(navItem);
        this._navItems.push(navItem);

        // Panneau
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
