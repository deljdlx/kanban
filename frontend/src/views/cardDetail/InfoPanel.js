/**
 * InfoPanel — Onglet "Informations" de la modale carte.
 *
 * Affiche les données de la carte :
 *   - Description (avec hook Markdown)
 *   - Assigné à
 *   - Auteur
 *   - Date de création
 *   - Tags
 */
import UserService from '../../services/UserService.js';
import { isSoloMode } from '../../config/appMode.js';
import { renderTagBadges } from '../../utils/tags.js';
import { formatDate } from '../../utils/date.js';
import Hooks from '../../plugins/HookRegistry.js';

export default class InfoPanel {
    /**
     * @type {import('../../models/Card.js').default}
     */
    _card;

    /**
     * @param {import('../../models/Card.js').default} card
     */
    constructor(card) {
        this._card = card;
    }

    /**
     * Construit et retourne l'élément DOM du panel.
     * Pour les cartes widget, permet aux plugins de prendre le contrôle du rendu.
     *
     * @returns {HTMLElement}
     */
    build() {
        const panel = document.createElement('div');
        panel.className = 'card-detail-panel';

        // Hook pour les widgets : permet aux plugins de prendre le contrôle
        const renderContext = {
            card: this._card,
            panel,
            handled: false,
        };
        Hooks.doAction('modal:cardDetail:renderContent', renderContext);

        // Si un plugin a pris le contrôle (widget), on retourne le panel tel quel
        if (renderContext.handled) {
            return panel;
        }

        // Rendu standard pour les cartes normales
        this._buildSummary(panel);
        this._buildDescription(panel);
        if (!isSoloMode()) {
            this._buildAssignee(panel);
            this._buildAuthor(panel);
        }
        this._buildCreatedAt(panel);
        this._buildTags(panel);

        return panel;
    }

    // ---------------------------------------------------------------
    // Construction des champs
    // ---------------------------------------------------------------

    /**
     * @param {HTMLElement} panel
     * @private
     */
    _buildSummary(panel) {
        const field = this._createField('Résumé', this._card.summary || '—');
        const valueEl = field.querySelector('.card-detail-field-value');

        if (this._card.summary) {
            Hooks.doAction('render:description', {
                element: valueEl,
                text: this._card.summary,
                context: 'modal',
            });
        }

        panel.appendChild(field);
    }

    /**
     * @param {HTMLElement} panel
     * @private
     */
    _buildDescription(panel) {
        const field = this._createField('Description', this._card.description || '—');
        const valueEl = field.querySelector('.card-detail-field-value');

        if (this._card.description) {
            Hooks.doAction('render:description', {
                element: valueEl,
                text: this._card.description,
                context: 'modal',
            });
        }

        panel.appendChild(field);
    }

    /**
     * @param {HTMLElement} panel
     * @private
     */
    _buildAssignee(panel) {
        panel.appendChild(this._createUserField('Assigné à', this._card.assignee));
    }

    /**
     * @param {HTMLElement} panel
     * @private
     */
    _buildAuthor(panel) {
        panel.appendChild(this._createUserField('Auteur', this._card.author));
    }

    /**
     * @param {HTMLElement} panel
     * @private
     */
    _buildCreatedAt(panel) {
        panel.appendChild(this._createField('Créé le', formatDate(this._card.createdAt)));
    }

    /**
     * @param {HTMLElement} panel
     * @private
     */
    _buildTags(panel) {
        const field = this._createField('Tags', '');
        const valueEl = field.querySelector('.card-detail-field-value');
        valueEl.textContent = '';

        const container = document.createElement('div');
        container.className = 'card-detail-tags';

        renderTagBadges(container, this._card.tags, 'card-detail-tag');

        if (container.children.length > 0) {
            valueEl.appendChild(container);
        } else {
            valueEl.textContent = '—';
        }

        panel.appendChild(field);
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    /**
     * Crée un bloc label + valeur.
     *
     * @param {string} label
     * @param {string} value
     * @returns {HTMLElement}
     * @private
     */
    _createField(label, value) {
        const field = document.createElement('div');
        field.className = 'card-detail-field';

        const labelEl = document.createElement('div');
        labelEl.className = 'card-detail-field-label';
        labelEl.textContent = label;

        const valueEl = document.createElement('div');
        valueEl.className = 'card-detail-field-value';
        valueEl.textContent = value;

        field.appendChild(labelEl);
        field.appendChild(valueEl);
        return field;
    }

    /**
     * Crée un champ label + badge utilisateur (ou "—" si absent).
     *
     * @param {string} label
     * @param {string|null} userId
     * @returns {HTMLElement}
     * @private
     */
    _createUserField(label, userId) {
        const field = this._createField(label, '');
        const valueEl = field.querySelector('.card-detail-field-value');
        const user = userId ? UserService.getUserById(userId) : null;

        if (user) {
            valueEl.textContent = '';
            valueEl.appendChild(this._createUserBadge(user));
        } else {
            valueEl.textContent = '—';
        }

        return field;
    }

    /**
     * Crée un badge avatar + nom pour un utilisateur.
     *
     * @param {{ name: string, initials: string, color: string }} user
     * @returns {HTMLElement}
     * @private
     */
    _createUserBadge(user) {
        const badge = document.createElement('span');
        badge.className = 'card-detail-user-badge';

        const avatar = document.createElement('span');
        avatar.className = 'card-detail-user-avatar';
        avatar.textContent = user.initials;
        avatar.style.backgroundColor = user.color;

        const name = document.createElement('span');
        name.textContent = user.name;

        badge.appendChild(avatar);
        badge.appendChild(name);
        return badge;
    }
}
