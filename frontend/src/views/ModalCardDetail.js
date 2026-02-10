/**
 * ModalCardDetail — Modale fullscreen de détail d'un ticket.
 *
 * Affiche trois onglets :
 *   - "Informations"  : description, assignee, auteur, tags
 *   - "Commentaires"  : formulaire d'ajout + liste des commentaires
 *   - "Historique"    : timeline des actions
 *
 * Structure DOM :
 *   div.card-detail-overlay
 *     div.card-detail
 *       div.card-detail-header
 *         h2 + div.card-detail-header-actions (bouton éditer + bouton fermer)
 *       div.card-detail-tabs
 *         button.card-detail-tab (×3)
 *       div.card-detail-content
 *         div.card-detail-panel (×3, un seul --active)
 *
 * Les panels sont extraits dans des classes dédiées :
 *   - cardDetail/InfoPanel.js
 *   - cardDetail/CommentsPanel.js
 *   - cardDetail/HistoryPanel.js
 */
import PermissionService from '../services/PermissionService.js';
import ModalConfirmDelete from './ModalConfirmDelete.js';
import InfoPanel from './cardDetail/InfoPanel.js';
import CommentsPanel from './cardDetail/CommentsPanel.js';
import HistoryPanel from './cardDetail/HistoryPanel.js';

export default class ModalCardDetail {
    /**
     * @type {import('../models/Card.js').default}
     */
    _card;

    /**
     * @type {HTMLElement|null}
     */
    _overlay;

    /**
     * Instance du panel historique (pour refresh après commentaire).
     * @type {HistoryPanel|null}
     */
    _historyPanel;

    /**
     * Instance du panel commentaires (pour cleanup au close).
     * @type {CommentsPanel|null}
     */
    _commentsPanel;

    /**
     * Callback appelé quand l'utilisateur clique sur "Éditer".
     * @type {Function|null}
     */
    _onEdit;

    /**
     * Callback appelé quand l'utilisateur confirme la suppression.
     * @type {Function|null}
     */
    _onDelete;

    /**
     * Nom du board source si la carte est un miroir (lecture seule).
     * @type {string|null}
     */
    _mirrorSource;

    /**
     * @param {import('../models/Card.js').default} card
     * @param {Object} [options]
     * @param {Function} [options.onEdit]        - Callback déclenché au clic sur "Éditer"
     * @param {Function} [options.onDelete]      - Callback déclenché après confirmation de suppression
     * @param {string}   [options.mirrorSource]  - Nom du board source (carte miroir, lecture seule)
     */
    constructor(card, { onEdit = null, onDelete = null, mirrorSource = null } = {}) {
        this._card = card;
        this._overlay = null;
        this._historyPanel = null;
        this._commentsPanel = null;
        this._onEdit = onEdit;
        this._onDelete = onDelete;
        this._mirrorSource = mirrorSource;
    }

    /**
     * Construit le DOM et l'ajoute au body.
     */
    open() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay card-detail-overlay';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });

        const modal = document.createElement('div');
        modal.className = 'card-detail';

        // — Header
        modal.appendChild(this._buildHeader());

        // — Onglets et contenu
        const { tabs, content } = this._buildTabsAndContent();
        modal.appendChild(tabs);
        modal.appendChild(content);

        // — Assemblage
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        this._overlay = overlay;
    }

    /**
     * Retire la modale du DOM.
     */
    close() {
        if (this._commentsPanel) {
            this._commentsPanel.destroy();
            this._commentsPanel = null;
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
     * Construit le header avec titre et boutons d'action.
     *
     * @returns {HTMLElement}
     * @private
     */
    _buildHeader() {
        const header = document.createElement('div');
        header.className = 'card-detail-header';

        const title = document.createElement('h2');
        title.textContent = this._card.title;

        // Bandeau board source si carte miroir
        if (this._mirrorSource) {
            const sourceBadge = document.createElement('div');
            sourceBadge.className = 'card-detail-mirror-source';
            sourceBadge.textContent = `Depuis : ${this._mirrorSource}`;
            header.appendChild(sourceBadge);
        }

        const actions = document.createElement('div');
        actions.className = 'card-detail-header-actions';

        // Bouton Éditer (masqué pour les cartes miroir)
        if (!this._mirrorSource && this._onEdit && PermissionService.can('editCard')) {
            const editBtn = document.createElement('button');
            editBtn.className = 'card-detail-edit-btn';
            editBtn.textContent = 'Éditer';
            editBtn.addEventListener('click', () => {
                this.close();
                this._onEdit();
            });
            actions.appendChild(editBtn);
        }

        // Bouton Supprimer (masqué pour les cartes miroir)
        if (!this._mirrorSource && this._onDelete && PermissionService.can('deleteCard')) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'card-detail-delete-btn';
            deleteBtn.textContent = 'Supprimer';
            deleteBtn.addEventListener('click', () => {
                const confirmModal = new ModalConfirmDelete(this._card.title, () => {
                    this._onDelete();
                    this.close();
                });
                confirmModal.open();
            });
            actions.appendChild(deleteBtn);
        }

        // Bouton Fermer
        const closeBtn = document.createElement('button');
        closeBtn.className = 'card-detail-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => this.close());
        actions.appendChild(closeBtn);

        header.appendChild(title);
        header.appendChild(actions);
        return header;
    }

    /**
     * Construit les onglets et les panneaux de contenu.
     *
     * @returns {{ tabs: HTMLElement, content: HTMLElement }}
     * @private
     */
    _buildTabsAndContent() {
        // — Onglets
        const tabs = document.createElement('div');
        tabs.className = 'card-detail-tabs';

        const tabInfo = this._createTab('Informations', true);
        const tabComments = this._createTab('Commentaires', false);
        const tabHistory = this._createTab('Historique', false);

        tabs.appendChild(tabInfo);
        tabs.appendChild(tabComments);
        tabs.appendChild(tabHistory);

        // — Contenu (panels)
        const content = document.createElement('div');
        content.className = 'card-detail-content';

        // Panel Informations
        const infoPanel = new InfoPanel(this._card);
        const panelInfo = infoPanel.build();
        panelInfo.classList.add('card-detail-panel--active');

        // Panel Commentaires (avec callback pour refresh historique)
        this._historyPanel = new HistoryPanel(this._card);
        this._commentsPanel = new CommentsPanel(this._card, {
            onCommentChange: () => this._historyPanel.refresh(),
        });
        const panelComments = this._commentsPanel.build();

        // Panel Historique
        const panelHistory = this._historyPanel.build();

        content.appendChild(panelInfo);
        content.appendChild(panelComments);
        content.appendChild(panelHistory);

        // — Switch d'onglets
        const allTabs = [tabInfo, tabComments, tabHistory];
        const allPanels = [panelInfo, panelComments, panelHistory];

        const activateTab = (index) => {
            allTabs.forEach((tab, i) => {
                tab.classList.toggle('card-detail-tab--active', i === index);
            });
            allPanels.forEach((panel, i) => {
                panel.classList.toggle('card-detail-panel--active', i === index);
            });
        };

        tabInfo.addEventListener('click', () => activateTab(0));
        tabComments.addEventListener('click', () => activateTab(1));
        tabHistory.addEventListener('click', () => activateTab(2));

        return { tabs, content };
    }

    /**
     * Crée un bouton d'onglet.
     *
     * @param {string} label
     * @param {boolean} active
     * @returns {HTMLElement}
     * @private
     */
    _createTab(label, active) {
        const btn = document.createElement('button');
        btn.className = 'card-detail-tab';
        if (active) {
            btn.classList.add('card-detail-tab--active');
        }
        btn.textContent = label;
        return btn;
    }
}
