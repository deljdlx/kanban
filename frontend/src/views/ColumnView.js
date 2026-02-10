/**
 * ColumnView — Vue d'une colonne du Kanban.
 *
 * Orchestre les sous-composants :
 *   - DragDropHandler : gestion du drag & drop via SortableJS
 *   - CardListRenderer : rendu des cartes avec filtres
 *
 * Écoute les événements du model Column et du FilterStore
 * pour maintenir la vue synchronisée.
 */
import ModalAddCard from './ModalAddCard.js';
import ModalEditCard from './ModalEditCard.js';
import ModalCardDetail from './ModalCardDetail.js';
import ModalDeleteColumn from './ModalDeleteColumn.js';
import FilterStore from '../services/FilterStore.js';
import UserService from '../services/UserService.js';
import PermissionService from '../services/PermissionService.js';
import BoardService from '../services/BoardService.js';
import Hooks from '../plugins/HookRegistry.js';
import DragDropHandler from './column/DragDropHandler.js';
import CardListRenderer from './column/CardListRenderer.js';

export default class ColumnView {
    /**
     * @type {import('../models/Column.js').default}
     */
    _column;

    /**
     * @type {import('../models/Board.js').default}
     */
    _board;

    /**
     * @type {HTMLElement|null}
     */
    _element;

    /**
     * @type {HTMLElement|null}
     */
    _countElement;

    /**
     * @type {HTMLElement|null}
     */
    _bodyElement;

    /**
     * @type {HTMLElement|null}
     */
    _titleElement;

    /**
     * Zone d'injection plugins dans le header (vidée et re-remplie à chaque update).
     * @type {HTMLElement|null}
     */
    _headerPluginZone;

    /**
     * @type {DragDropHandler|null}
     */
    _dragDropHandler;

    /**
     * @type {CardListRenderer|null}
     */
    _cardListRenderer;

    /**
     * @type {Function}
     */
    _onColumnChangeBound;

    /**
     * @type {Function}
     */
    _onFilterChangeBound;

    /**
     * @param {import('../models/Column.js').default} column
     * @param {import('../models/Board.js').default} board
     */
    constructor(column, board) {
        this._column = column;
        this._board = board;
        this._element = null;
        this._countElement = null;
        this._bodyElement = null;
        this._titleElement = null;
        this._headerPluginZone = null;
        this._dragDropHandler = null;
        this._cardListRenderer = null;

        this._onColumnChangeBound = () => this._onColumnChange();
        this._onFilterChangeBound = () => this._onColumnChange();

        this._column.on('change', this._onColumnChangeBound);
        FilterStore.on('change', this._onFilterChangeBound);
    }

    /**
     * Construit l'élément DOM de la colonne.
     *
     * @returns {HTMLElement}
     */
    render() {
        const column = document.createElement('div');
        column.className = 'column';
        column.dataset.id = this._column.id;

        // Header
        column.appendChild(this._buildHeader());

        // Body (contient les cartes)
        const body = document.createElement('div');
        body.className = 'column-body';
        column.appendChild(body);

        this._element = column;
        this._bodyElement = body;

        // Init drag & drop
        this._dragDropHandler = new DragDropHandler(this._column.id);
        this._dragDropHandler.init(body);

        // Init card list renderer
        this._cardListRenderer = new CardListRenderer(this._column, {
            onEdit: (card) => this._openEditCardModal(card),
            onCardClick: (card) => this._openCardDetail(card),
        });

        // Render initial des cartes
        this._renderBody();

        return column;
    }

    /**
     * Nettoie les listeners et les sous-composants.
     */
    destroy() {
        this._column.off('change', this._onColumnChangeBound);
        FilterStore.off('change', this._onFilterChangeBound);

        if (this._cardListRenderer) {
            try {
                this._cardListRenderer.destroy();
            } catch (error) {
                console.error(
                    `ColumnView : échec du destroy de CardListRenderer (colonne "${this._column?.title ?? '?'}")`,
                    error,
                );
            }
            this._cardListRenderer = null;
        }

        if (this._dragDropHandler) {
            try {
                this._dragDropHandler.destroy();
            } catch (error) {
                console.error(
                    `ColumnView : échec du destroy de DragDropHandler (colonne "${this._column?.title ?? '?'}")`,
                    error,
                );
            }
            this._dragDropHandler = null;
        }
    }

    // ---------------------------------------------------------------
    // Construction du header
    // ---------------------------------------------------------------

    /**
     * @returns {HTMLElement}
     * @private
     */
    _buildHeader() {
        const header = document.createElement('div');
        header.className = 'column-header';

        const title = document.createElement('h2');
        title.textContent = this._column.title;
        this._titleElement = title;

        const count = document.createElement('span');
        count.className = 'count';
        count.textContent = this._column.count;
        this._countElement = count;

        header.appendChild(title);
        header.appendChild(count);

        // Bouton renommer
        if (PermissionService.can('renameColumn')) {
            const editTitleBtn = document.createElement('button');
            editTitleBtn.className = 'column-edit-title-btn';
            editTitleBtn.textContent = '✎';
            editTitleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._enterTitleEditMode();
            });
            header.appendChild(editTitleBtn);
        }

        // Bouton supprimer colonne
        if (PermissionService.can('deleteColumn')) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'column-delete-btn';
            deleteBtn.textContent = '🗑';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._openDeleteColumnModal();
            });
            header.appendChild(deleteBtn);
        }

        // Bouton ajouter carte
        if (PermissionService.can('addCard')) {
            const addBtn = document.createElement('button');
            addBtn.className = 'column-add-btn';
            addBtn.textContent = '+';
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._openAddCardModal();
            });
            header.appendChild(addBtn);
        }

        // Zone d'injection plugins dans le header.
        // Conteneur persistant vidé et re-rempli à chaque column change,
        // pour que les plugins reflètent l'état courant (ex: WIP « 3/5 »).
        const pluginZone = document.createElement('span');
        pluginZone.className = 'column-header-plugin-zone';
        header.appendChild(pluginZone);
        this._headerPluginZone = pluginZone;

        this._renderHeaderPluginZone();

        return header;
    }

    // ---------------------------------------------------------------
    // Événements
    // ---------------------------------------------------------------

    /**
     * @private
     */
    _onColumnChange() {
        if (this._titleElement) {
            this._titleElement.textContent = this._column.title;
        }
        this._renderHeaderPluginZone();
        this._renderBody();
    }

    /**
     * Vide et re-remplit la zone plugin du header.
     * Appelé au render initial et à chaque column change,
     * pour que les plugins reflètent l'état courant.
     *
     * @private
     */
    _renderHeaderPluginZone() {
        if (!this._headerPluginZone) return;
        this._headerPluginZone.innerHTML = '';
        Hooks.doAction('column:renderHeader', {
            container: this._headerPluginZone,
            column: this._column,
            board: this._board,
        });
    }

    /**
     * @private
     */
    _renderBody() {
        if (!this._bodyElement || !this._cardListRenderer) return;
        this._cardListRenderer.render(this._bodyElement, this._countElement);

        // Zone d'injection plugins après les cartes.
        // Ex: un plugin affiche un résumé ou des statistiques en bas de colonne.
        // Rappelé à chaque re-render (ajout/suppression/déplacement de carte).
        Hooks.doAction('column:renderBody', {
            body: this._bodyElement,
            column: this._column,
            board: this._board,
        });
    }

    // ---------------------------------------------------------------
    // Édition du titre inline
    // ---------------------------------------------------------------

    /**
     * @private
     */
    _enterTitleEditMode() {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'column-title-input';
        input.value = this._column.title;
        input.setAttribute('draggable', 'false');

        let cancelled = false;

        const save = () => {
            if (cancelled) return;
            const newTitle = input.value.trim();
            if (newTitle && newTitle !== this._column.title) {
                BoardService.updateColumnTitle(this._column.id, newTitle);
            }
            restore();
        };

        const cancel = () => {
            cancelled = true;
            restore();
        };

        const restore = () => {
            input.removeEventListener('blur', save);
            input.removeEventListener('keydown', onKeydown);
            if (input.parentNode) {
                input.replaceWith(this._titleElement);
            }
        };

        const onKeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                save();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
            }
        };

        input.addEventListener('keydown', onKeydown);
        input.addEventListener('blur', save);

        this._titleElement.replaceWith(input);
        input.focus();
        input.select();
    }

    // ---------------------------------------------------------------
    // Modales
    // ---------------------------------------------------------------

    /**
     * Ouvre la modale de confirmation de suppression de colonne.
     * Si la colonne contient des cartes, propose un dropdown pour
     * choisir la colonne cible de migration.
     *
     * @private
     */
    _openDeleteColumnModal() {
        const otherColumns = this._board.columns.filter((c) => c.id !== this._column.id);
        const modal = new ModalDeleteColumn(this._column, otherColumns, (targetColumnId) => {
            BoardService.removeColumn(this._column.id, targetColumnId);
        });
        modal.open();
    }

    /**
     * @private
     */
    _openAddCardModal() {
        const modal = new ModalAddCard((cardData) => {
            BoardService.addCard(this._column.id, cardData, 0);
        });
        modal.open();
    }

    /**
     * @param {import('../models/Card.js').default} card
     * @private
     */
    _openCardDetail(card) {
        const modal = new ModalCardDetail(card, {
            onEdit: () => this._openEditCardModalAndReturn(card),
            onDelete: () => {
                BoardService.removeCard(this._column.id, card.id);
            },
        });
        modal.open();
    }

    /**
     * @param {import('../models/Card.js').default} card
     * @private
     */
    _openEditCardModalAndReturn(card) {
        const modal = new ModalEditCard(
            card,
            (data) => {
                this._updateCard(card, data);
            },
            {
                onClose: () => this._openCardDetail(card),
                onDelete: () => BoardService.removeCard(this._column.id, card.id),
            },
        );
        modal.open();
    }

    /**
     * @param {import('../models/Card.js').default} card
     * @private
     */
    _openEditCardModal(card) {
        const modal = new ModalEditCard(
            card,
            (data) => {
                this._updateCard(card, data);
            },
            {
                onDelete: () => BoardService.removeCard(this._column.id, card.id),
            },
        );
        modal.open();
    }

    /**
     * @param {import('../models/Card.js').default} card
     * @param {Object} data
     * @private
     */
    _updateCard(card, data) {
        const currentUser = UserService.getCurrentUser();
        const filteredData = Hooks.applyFilters('card:beforeUpdate', data, card);
        card.update({
            ...filteredData,
            userId: currentUser ? currentUser.id : null,
        });
        Hooks.doAction('card:updated', { card });
        this._renderBody();
        // save() async — errors handled internally by BoardService
        BoardService.save();
    }
}
