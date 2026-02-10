/**
 * BaseModal — Coquille réutilisable pour toutes les modales.
 *
 * Gère l'overlay, le conteneur, le header (titre + bouton ×),
 * le body (vide, à remplir par la sous-classe) et le footer
 * (bouton annuler + bouton d'action principal).
 *
 * Utilisation :
 *   1. Étendre BaseModal
 *   2. Implémenter _buildBody(body) → ajouter les champs au body
 *   3. Implémenter _onConfirm()    → lire les champs et agir
 *
 *   class ModalFoo extends BaseModal {
 *       constructor(onDone) {
 *           super({ title: 'Mon titre', confirmLabel: 'Valider' });
 *           this._onDone = onDone;
 *       }
 *       _buildBody(body) { ... }
 *       _onConfirm() { this._onDone(data); this.close(); }
 *   }
 *
 * Extension par plugins :
 *   Chaque modale expose deux mécanismes aux plugins (via les hooks) :
 *
 *   1. Slot `.modal-plugins` — zone en bas du panneau principal
 *      pour injecter du contenu simple (label + champ).
 *
 *   2. addTab(label, { order }) — ajoute un onglet dédié au plugin.
 *      Retourne un HTMLElement (panneau) dans lequel le plugin
 *      peut construire son contenu librement.
 *      Le paramètre `order` (défaut 10) contrôle la position :
 *      plus petit = plus à gauche. Les onglets de même order
 *      conservent l'ordre d'insertion (stable).
 *      La barre d'onglets n'apparaît que si au moins un plugin
 *      appelle addTab() (sinon la modale reste identique à avant).
 *
 * Structure DOM (quand des onglets plugins existent) :
 *   div.modal
 *     div.modal-header
 *     div.modal-tabs              ← barre d'onglets (masquée si 0 plugin tab)
 *       button.modal-tab--active  ← "Général"
 *       button.modal-tab          ← onglet plugin
 *     div.modal-body
 *       div.modal-panel--active   ← panneau principal (contenu _buildBody + slot)
 *       div.modal-panel           ← panneau plugin
 *     div.modal-footer
 */
export default class BaseModal {
    /**
     * Titre affiché dans le header de la modale.
     * @type {string}
     */
    _title;

    /**
     * Texte du bouton principal (ex: "Créer", "Enregistrer").
     * @type {string}
     */
    _confirmLabel;

    /**
     * Variante de la modale (ex: "fullscreen" pour modal--fullscreen).
     * @type {string|null}
     */
    _variant;

    /**
     * Élément racine (overlay) ajouté au DOM.
     * @type {HTMLElement|null}
     */
    _overlay;

    /**
     * Callback appelé après la fermeture de la modale.
     * @type {Function|null}
     */
    _onClose;

    /**
     * Slot réservé aux plugins, situé en fin du panneau principal.
     * Les plugins y injectent leurs champs via les hooks modal:*:opened.
     * @type {HTMLElement|null}
     */
    _pluginsSlot;

    /**
     * Conteneur de la barre d'onglets (entre header et body).
     * Créé masqué, affiché dès qu'un plugin appelle addTab().
     * @type {HTMLElement|null}
     */
    _tabsBar;

    /**
     * Panneau principal ("Général") contenant le formulaire de la sous-classe.
     * @type {HTMLElement|null}
     */
    _mainPanel;

    /**
     * Conteneur .modal-body qui accueille tous les panneaux.
     * @type {HTMLElement|null}
     */
    _body;

    /**
     * Tous les boutons d'onglets (pour le switch).
     * @type {HTMLElement[]}
     */
    _allTabs;

    /**
     * Tous les panneaux (pour le switch).
     * @type {HTMLElement[]}
     */
    _allPanels;

    /**
     * Valeurs d'ordre des onglets (parallèle à _allTabs/_allPanels).
     * Sert à insérer chaque nouvel onglet à la bonne position.
     * @type {number[]}
     */
    _tabOrders;

    /**
     * Callbacks à appeler lors de la fermeture de la modale.
     * Permet aux plugins de nettoyer leurs ressources.
     * @type {Function[]}
     */
    _closeCallbacks;

    /**
     * AbortController pour retirer tous les listeners d'un coup à la fermeture.
     * @type {AbortController|null}
     */
    _abortController;

    /**
     * @param {Object} options
     * @param {string} options.title        - Titre du header
     * @param {string} options.confirmLabel - Texte du bouton d'action
     * @param {Function} [options.onClose]  - Callback appelé après fermeture
     * @param {string} [options.variant]    - Variante CSS (ex: "fullscreen")
     */
    constructor({ title, confirmLabel, onClose = null, variant = null }) {
        this._title = title;
        this._confirmLabel = confirmLabel;
        this._overlay = null;
        this._onClose = onClose;
        this._variant = variant;
        this._pluginsSlot = null;
        this._tabsBar = null;
        this._mainPanel = null;
        this._body = null;
        this._allTabs = [];
        this._allPanels = [];
        this._tabOrders = [];
        this._closeCallbacks = [];
        this._abortController = null;
    }

    /**
     * Construit le DOM complet et l'ajoute au <body>.
     * Appelle `_buildBody()` pour que la sous-classe remplisse le contenu.
     */
    open() {
        this._abortController = new AbortController();
        const signal = this._abortController.signal;

        // — Overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.addEventListener(
            'click',
            (e) => {
                if (e.target === overlay) {
                    this.close();
                }
            },
            { signal },
        );

        // — Conteneur modal
        const modal = document.createElement('div');
        modal.className = this._variant ? `modal modal--${this._variant}` : 'modal';

        // — Header
        const header = document.createElement('div');
        header.className = 'modal-header';

        const headerTitle = document.createElement('h3');
        headerTitle.textContent = this._title;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => this.close(), { signal });

        header.appendChild(headerTitle);
        header.appendChild(closeBtn);

        // — Barre d'onglets (masquée par défaut, affichée si addTab est appelé)
        const tabsBar = document.createElement('div');
        tabsBar.className = 'modal-tabs';
        tabsBar.classList.add('hidden');
        this._tabsBar = tabsBar;

        // — Body
        const body = document.createElement('div');
        body.className = 'modal-body';
        this._body = body;

        // — Panneau principal "Général"
        const mainPanel = document.createElement('div');
        mainPanel.className = 'modal-panel modal-panel--active';
        this._mainPanel = mainPanel;

        // Rempli par la sous-classe
        this._buildBody(mainPanel);

        // Slot plugins en fin du panneau principal
        const pluginsSlot = document.createElement('div');
        pluginsSlot.className = 'modal-plugins';
        mainPanel.appendChild(pluginsSlot);
        this._pluginsSlot = pluginsSlot;

        body.appendChild(mainPanel);

        // Initialise les listes de tabs/panels (le tab "Général"
        // n'est ajouté à la barre que si un plugin appelle addTab)
        this._allTabs = [];
        this._allPanels = [mainPanel];
        this._tabOrders = [];

        // — Footer
        const footer = document.createElement('div');
        footer.className = 'modal-footer';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn--cancel';
        cancelBtn.textContent = 'Annuler';
        cancelBtn.addEventListener('click', () => this.close(), { signal });

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn--primary';
        confirmBtn.textContent = this._confirmLabel;
        confirmBtn.addEventListener('click', () => this._onConfirm(), { signal });

        footer.appendChild(cancelBtn);
        footer.appendChild(confirmBtn);

        // — Assemblage
        modal.appendChild(header);
        modal.appendChild(tabsBar);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);

        document.body.appendChild(overlay);
        this._overlay = overlay;
    }

    /**
     * Retire la modale du DOM et appelle les callbacks de fermeture.
     */
    close() {
        if (this._abortController) {
            this._abortController.abort();
            this._abortController = null;
        }

        for (const fn of this._closeCallbacks) fn();
        this._closeCallbacks = [];

        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
        if (this._onClose) {
            this._onClose();
        }
    }

    /**
     * Enregistre un callback à appeler lors de la fermeture de la modale.
     * Exposé aux plugins via le hook modal:*:opened.
     *
     * @param {Function} fn
     */
    _registerCloseCallback(fn) {
        this._closeCallbacks.push(fn);
    }

    /**
     * Ajoute un onglet plugin à la modale.
     *
     * Au premier appel, affiche la barre d'onglets et crée le tab "Général"
     * pour le panneau principal. Retourne un HTMLElement (panneau vide)
     * dans lequel le plugin peut construire son contenu.
     *
     * L'option `order` (défaut 10) contrôle la position de l'onglet :
     * plus petit = plus à gauche. Les onglets de même order conservent
     * l'ordre d'insertion (tri stable).
     *
     * @param {string} label - Libellé de l'onglet (ex: "Couleur", "Options")
     * @param {Object} [options]
     * @param {number} [options.order=10] - Position de l'onglet (plus petit = plus à gauche)
     * @returns {HTMLElement} Le panneau dédié au plugin
     */
    addTab(label, { order = 10 } = {}) {
        const signal = this._abortController.signal;

        // Premier appel → affiche la barre et crée le tab "Général"
        if (this._allTabs.length === 0) {
            this._tabsBar.classList.remove('hidden');

            const mainTab = document.createElement('button');
            mainTab.className = 'modal-tab modal-tab--active';
            mainTab.type = 'button';
            mainTab.textContent = 'Général';
            mainTab.addEventListener('click', () => this._activateTab(mainTab, this._mainPanel), { signal });
            this._tabsBar.appendChild(mainTab);
            this._allTabs.push(mainTab);
            this._tabOrders.push(-Infinity); // "Général" toujours en premier
        }

        // Crée le nouveau tab
        const tabBtn = document.createElement('button');
        tabBtn.className = 'modal-tab';
        tabBtn.type = 'button';
        tabBtn.textContent = label;

        // Crée le panneau associé
        const panel = document.createElement('div');
        panel.className = 'modal-panel';

        tabBtn.addEventListener('click', () => this._activateTab(tabBtn, panel), { signal });

        // Trouve la position d'insertion (tri stable : premier index où order existant > order)
        // On commence à 1 pour ne jamais passer devant "Général" (index 0)
        let insertAt = this._allTabs.length;
        for (let i = 1; i < this._tabOrders.length; i++) {
            if (this._tabOrders[i] > order) {
                insertAt = i;
                break;
            }
        }

        // Insère dans le DOM et les tableaux à la bonne position
        if (insertAt >= this._allTabs.length) {
            // Append en fin
            this._tabsBar.appendChild(tabBtn);
            this._body.appendChild(panel);
        } else {
            this._tabsBar.insertBefore(tabBtn, this._allTabs[insertAt]);
            this._body.insertBefore(panel, this._allPanels[insertAt]);
        }

        this._allTabs.splice(insertAt, 0, tabBtn);
        this._allPanels.splice(insertAt, 0, panel);
        this._tabOrders.splice(insertAt, 0, order);

        return panel;
    }

    /**
     * Active un onglet par référence directe (tab button + panel).
     *
     * @param {HTMLElement} activeTab - Le bouton d'onglet à activer
     * @param {HTMLElement} activePanel - Le panneau à afficher
     * @private
     */
    _activateTab(activeTab, activePanel) {
        for (const tab of this._allTabs) {
            tab.classList.toggle('modal-tab--active', tab === activeTab);
        }
        for (const panel of this._allPanels) {
            panel.classList.toggle('modal-panel--active', panel === activePanel);
        }
    }

    /**
     * À implémenter par la sous-classe.
     * Ajoute les champs de formulaire dans l'élément body.
     *
     * @param {HTMLElement} body - Le conteneur du panneau principal
     * @abstract
     */
    _buildBody(body) {
        // À surcharger
    }

    /**
     * À implémenter par la sous-classe.
     * Appelé au clic sur le bouton principal.
     *
     * @abstract
     */
    _onConfirm() {
        // À surcharger
    }
}
