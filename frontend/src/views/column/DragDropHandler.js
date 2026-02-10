/**
 * DragDropHandler — Gestion du drag & drop des cartes via SortableJS.
 *
 * Responsabilités :
 *   - Initialisation de SortableJS sur le conteneur de cartes
 *   - Gestion des événements onEnd (déplacement intra/inter-colonne)
 *   - Désactivation du drag selon les permissions
 *
 * Flux drag & drop :
 *   SortableJS onEnd → BoardService.moveCard() ou moveCardInColumn()
 *   → Column model émet 'change' → ColumnView re-render
 */
import Sortable from 'sortablejs';
import UserService from '../../services/UserService.js';
import PermissionService from '../../services/PermissionService.js';
import BoardService from '../../services/BoardService.js';

export default class DragDropHandler {
    /**
     * Instance SortableJS.
     * @type {import('sortablejs').default|null}
     */
    _sortable;

    /**
     * ID de la colonne (pour les déplacements intra-colonne).
     * @type {string}
     */
    _columnId;

    /**
     * @param {string} columnId - ID de la colonne
     */
    constructor(columnId) {
        this._sortable = null;
        this._columnId = columnId;
    }

    /**
     * Initialise SortableJS sur le conteneur de cartes.
     *
     * @param {HTMLElement} bodyElement - L'élément .column-body
     */
    init(bodyElement) {
        this._sortable = Sortable.create(bodyElement, {
            group: 'cards',
            animation: 200,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            ghostClass: 'card-ghost',
            chosenClass: 'card-dragging',
            filter: '.card--error, .card--mirror',
            emptyInsertThreshold: 20,
            disabled: !PermissionService.can('moveCard'),

            onEnd: (evt) => this._onDragEnd(evt),
        });
    }

    /**
     * Détruit l'instance SortableJS.
     */
    destroy() {
        if (this._sortable) {
            this._sortable.destroy();
            this._sortable = null;
        }
    }

    /**
     * Gère la fin d'un drag & drop.
     * Synchronise le DOM (déjà déplacé par Sortable) avec les models.
     *
     * Si le déplacement est bloqué par un plugin (via card:beforeMove),
     * le DOM est restauré à son état d'avant le drag.
     *
     * @param {import('sortablejs').SortableEvent} evt
     * @private
     */
    _onDragEnd(evt) {
        const cardId = evt.item.dataset.id;
        const fromColumnId = evt.from.closest('.column').dataset.id;
        const toColumnId = evt.to.closest('.column').dataset.id;
        const currentUser = UserService.getCurrentUser();
        const userId = currentUser ? currentUser.id : null;

        let moved;
        if (fromColumnId === toColumnId) {
            moved = BoardService.moveCardInColumn(this._columnId, evt.oldIndex, evt.newIndex, userId);
        } else {
            moved = BoardService.moveCard(cardId, fromColumnId, toColumnId, evt.newIndex, userId);
        }

        // Si le déplacement a été bloqué (card:beforeMove → false),
        // on remet l'élément DOM à sa position d'origine.
        if (!moved) {
            if (fromColumnId === toColumnId) {
                // Même colonne : réinsérer à l'ancien index
                const parent = evt.from;
                parent.removeChild(evt.item);
                if (evt.oldIndex < parent.children.length) {
                    parent.insertBefore(evt.item, parent.children[evt.oldIndex]);
                } else {
                    parent.appendChild(evt.item);
                }
            } else {
                // Colonnes différentes : remettre dans la colonne source
                evt.to.removeChild(evt.item);
                if (evt.oldIndex < evt.from.children.length) {
                    evt.from.insertBefore(evt.item, evt.from.children[evt.oldIndex]);
                } else {
                    evt.from.appendChild(evt.item);
                }
            }
        }
    }
}
