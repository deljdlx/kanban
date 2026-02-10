/**
 * CardView — Vue d'une carte du Kanban.
 *
 * Reçoit un model Card et construit un élément DOM via createElement.
 *
 * Hooks disponibles :
 *   - card:renderBody : permet aux plugins (widgets) de prendre le contrôle
 *     total du rendu en définissant ctx.handled = true
 *   - card:beforeRender : filtre pour transformer titre/description/tags
 *   - render:description : action pour transformer le rendu de la description
 *
 * Les couleurs des tags sont appliquées en inline style à partir
 * du registre TAXONOMIES (plus aucun modifier CSS hardcodé).
 */
import { renderTagBadges } from '../utils/tags.js';
import { formatDate } from '../utils/date.js';
import UserService from '../services/UserService.js';
import PermissionService from '../services/PermissionService.js';
import { isSoloMode } from '../config/appMode.js';
import Hooks from '../plugins/HookRegistry.js';

export default class CardView {
    /**
     * @type {import('../models/Card.js').default}
     */
    _card;

    /**
     * @type {HTMLElement|null}
     */
    _element;

    /**
     * Callback appelé quand on clique sur le bouton d'édition.
     * @type {function(import('../models/Card.js').default): void}
     */
    _onEdit;

    /**
     * Callback appelé quand on clique sur la carte (hors bouton éditer).
     * @type {function(import('../models/Card.js').default): void}
     */
    _onCardClick;

    /**
     * Handler lié pour le clic sur la carte (stocké pour removeEventListener).
     * @type {Function}
     */
    _onCardClickBound;

    /**
     * Handler lié pour le clic sur le bouton éditer (stocké pour removeEventListener).
     * @type {Function}
     */
    _onEditBound;

    /**
     * Référence au bouton éditer (pour cleanup dans destroy).
     * @type {HTMLElement|null}
     */
    _editBtn;

    /**
     * @param {import('../models/Card.js').default} card - Le modèle Card à afficher
     * @param {Object} [options]
     * @param {function} [options.onEdit]      - Callback déclenché au clic sur le bouton éditer
     * @param {function} [options.onCardClick] - Callback déclenché au clic sur la carte
     */
    constructor(card, { onEdit = () => {}, onCardClick = () => {} } = {}) {
        this._card = card;
        this._element = null;
        this._onEdit = onEdit;
        this._onCardClick = onCardClick;
        this._onCardClickBound = () => this._onCardClick(this._card);
        this._onEditBound = (e) => {
            e.stopPropagation();
            e.preventDefault();
            this._onEdit(this._card);
        };
        this._editBtn = null;
    }

    /**
     * Construit et retourne l'élément DOM de la carte.
     *
     * Structure produite :
     *   div.card[data-id]
     *     div.card-title
     *     div.card-description
     *     div.card-tags
     *       span.card-tag (×N, styles inline via TAXONOMIES)
     *
     * @returns {HTMLElement}
     */
    render() {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.id = this._card.id;
        card.dataset.cardType = this._card.type || 'standard';

        // Clic sur la carte → ouvre le détail (sauf si on clique sur le bouton éditer)
        card.addEventListener('click', this._onCardClickBound);

        // Zone d'actions (toujours visible, en haut à droite)
        // Le bouton couleur du CardColorPlugin s'y injecte également.
        const actions = document.createElement('div');
        actions.className = 'card-actions';

        if (PermissionService.can('editCard')) {
            this._editBtn = document.createElement('button');
            this._editBtn.className = 'card-edit-btn';
            this._editBtn.textContent = '✎';
            this._editBtn.title = 'Modifier';
            this._editBtn.addEventListener('click', this._onEditBound);
            actions.appendChild(this._editBtn);
        }

        card.appendChild(actions);

        // Hook pour les widgets : permet aux plugins de prendre le contrôle total
        // Le plugin peut définir renderContext.handled = true pour bloquer le rendu standard
        const renderContext = {
            card: this._card,
            cardElement: card,
            handled: false,
        };
        Hooks.doAction('card:renderBody', renderContext);

        // Si un plugin a pris le contrôle (widget), on skip le rendu standard
        if (renderContext.handled) {
            this._element = card;
            return card;
        }

        // Applique le filter card:beforeRender pour permettre aux plugins
        // de transformer les données affichées (titre, description, tags)
        const renderData = Hooks.applyFilters('card:beforeRender', {
            title: this._card.title,
            description: this._card.description,
            summary: this._card.summary,
            tags: this._card.tags,
            card: this._card,
        });

        const title = document.createElement('div');
        title.className = 'card-title';
        title.textContent = renderData.title;

        // Badge assignee : masqué en solo mode (toujours la même personne)
        if (!isSoloMode()) {
            const assigneeUser = this._card.assignee ? UserService.getUserById(this._card.assignee) : null;

            if (assigneeUser) {
                const titleRow = document.createElement('div');
                titleRow.className = 'card-title-row';

                const badge = document.createElement('div');
                badge.className = 'card-assignee';
                badge.textContent = assigneeUser.initials;
                badge.style.backgroundColor = assigneeUser.color;
                badge.title = assigneeUser.name;

                titleRow.appendChild(title);
                titleRow.appendChild(badge);
                card.appendChild(titleRow);
            } else {
                card.appendChild(title);
            }
        } else {
            card.appendChild(title);
        }

        // Affiche le résumé si disponible, sinon la description
        const displayText = renderData.summary || renderData.description;
        const displayClass = renderData.summary ? 'card-summary' : 'card-description';

        const textBlock = document.createElement('div');
        textBlock.className = displayClass;
        textBlock.textContent = displayText;

        Hooks.doAction('render:description', {
            element: textBlock,
            text: displayText,
            context: 'card',
        });

        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'card-tags';

        renderTagBadges(tagsContainer, renderData.tags, 'card-tag');

        card.appendChild(textBlock);
        card.appendChild(tagsContainer);

        // Footer : date de création + auteur (auteur masqué en solo)
        const authorUser = this._card.author ? UserService.getUserById(this._card.author) : null;

        const hasFooter = (authorUser && !isSoloMode()) || this._card.createdAt;

        if (hasFooter) {
            const footer = document.createElement('div');
            footer.className = 'card-footer';

            // Date de création (toujours présente)
            const dateLabel = document.createElement('span');
            dateLabel.className = 'card-date';
            dateLabel.textContent = formatDate(this._card.createdAt);
            footer.appendChild(dateLabel);

            // Auteur (masqué en solo mode — toujours la même personne)
            if (authorUser && !isSoloMode()) {
                const authorLabel = document.createElement('span');
                authorLabel.className = 'card-author';
                authorLabel.textContent = 'par ' + authorUser.name;
                footer.appendChild(authorLabel);
            }

            card.appendChild(footer);
        }

        this._element = card;
        return card;
    }

    /**
     * Retire les event listeners de l'élément DOM.
     * Doit être appelé avant de supprimer la vue du DOM
     * (ex: re-render du body de la colonne).
     */
    destroy() {
        if (this._element) {
            this._element.removeEventListener('click', this._onCardClickBound);
            if (this._editBtn) {
                this._editBtn.removeEventListener('click', this._onEditBound);
                this._editBtn = null;
            }
            this._element = null;
        }
    }
}
