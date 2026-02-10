/**
 * HistoryPanel — Onglet "Historique" de la modale carte.
 *
 * Affiche la timeline des actions sur la carte :
 *   - Création
 *   - Modifications (titre, description, assignee, etc.)
 *   - Commentaires ajoutés/modifiés
 *   - Déplacements entre colonnes
 */
import UserService from '../../services/UserService.js';
import { getActionConfig, CHANGE_FIELD_LABELS } from '../../config/historyActions.js';
import { formatDateTime } from '../../utils/date.js';

export default class HistoryPanel {
    /**
     * @type {import('../../models/Card.js').default}
     */
    _card;

    /**
     * Conteneur de la timeline.
     * @type {HTMLElement|null}
     */
    _timeline;

    /**
     * @param {import('../../models/Card.js').default} card
     */
    constructor(card) {
        this._card = card;
        this._timeline = null;
    }

    /**
     * Construit et retourne l'élément DOM du panel.
     *
     * @returns {HTMLElement}
     */
    build() {
        const panel = document.createElement('div');
        panel.className = 'card-detail-panel';

        this._timeline = document.createElement('div');
        this._timeline.className = 'card-detail-timeline';
        this._renderTimeline();

        panel.appendChild(this._timeline);
        return panel;
    }

    /**
     * Rafraîchit la timeline (appelé après ajout de commentaire).
     */
    refresh() {
        this._renderTimeline();
    }

    // ---------------------------------------------------------------
    // Rendu de la timeline
    // ---------------------------------------------------------------

    /**
     * @private
     */
    _renderTimeline() {
        this._timeline.innerHTML = '';

        // Affiche les entrées de la plus récente à la plus ancienne
        const entries = [...this._card.history].reverse();

        for (const entry of entries) {
            this._timeline.appendChild(this._buildTimelineItem(entry));
        }
    }

    /**
     * Construit un élément de timeline.
     *
     * @param {Object} entry
     * @returns {HTMLElement}
     * @private
     */
    _buildTimelineItem(entry) {
        const config = getActionConfig(entry.action);

        const item = document.createElement('div');
        item.className = 'card-detail-timeline-item';

        // Pastille de couleur
        const dot = document.createElement('div');
        dot.className = 'card-detail-timeline-dot';
        dot.classList.add(`card-detail-timeline-dot--${config.dotModifier}`);

        // Header : user + action + date
        const header = document.createElement('div');
        header.className = 'card-detail-timeline-header';

        const user = entry.userId ? UserService.getUserById(entry.userId) : null;
        const who = user ? user.name : 'Inconnu';

        const actionText = document.createElement('span');
        actionText.className = 'card-detail-timeline-action';
        actionText.textContent = config.label(who);

        const dateText = document.createElement('span');
        dateText.className = 'card-detail-timeline-date';
        dateText.textContent = formatDateTime(entry.date);

        header.appendChild(actionText);
        header.appendChild(dateText);

        item.appendChild(dot);
        item.appendChild(header);

        // Détail des changements
        if (entry.changes) {
            item.appendChild(this._buildChangesList(entry.changes));
        }

        return item;
    }

    /**
     * Construit la liste des changements pour une entrée.
     *
     * @param {Object} changes - Ex: { title: { from: "A", to: "B" } }
     * @returns {HTMLElement}
     * @private
     */
    _buildChangesList(changes) {
        const list = document.createElement('ul');
        list.className = 'card-detail-timeline-changes';

        for (const [field, value] of Object.entries(changes)) {
            const li = document.createElement('li');
            const label = CHANGE_FIELD_LABELS[field] || field;
            const { from, to } = value;

            if (field === 'assignee') {
                const fromUser = from ? UserService.getUserById(from) : null;
                const toUser = to ? UserService.getUserById(to) : null;
                li.textContent = `${label} : ${fromUser ? fromUser.name : '—'} → ${toUser ? toUser.name : '—'}`;
            } else if (field === 'tags') {
                li.textContent = `${label} modifiés`;
            } else {
                const fromStr = this._truncate(String(from || '—'), 40);
                const toStr = this._truncate(String(to || '—'), 40);
                li.textContent = `${label} : ${fromStr} → ${toStr}`;
            }

            list.appendChild(li);
        }

        return list;
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    /**
     * Tronque un texte s'il dépasse la limite.
     *
     * @param {string} str
     * @param {number} max
     * @returns {string}
     * @private
     */
    _truncate(str, max) {
        return str.length > max ? str.slice(0, max) + '...' : str;
    }
}
