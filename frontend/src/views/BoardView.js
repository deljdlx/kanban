/**
 * BoardView — Vue principale du plateau Kanban.
 *
 * Reçoit le Board model, crée une ColumnView par colonne, et initialise
 * SortableJS en mode horizontal pour réordonner les colonnes.
 *
 * Gère le cycle de vie des ColumnView et des instances SortableJS :
 * chaque re-render détruit proprement les instances précédentes
 * avant d'en créer de nouvelles.
 */
import Sortable from 'sortablejs';
import ColumnView from './ColumnView.js';
import PermissionService from '../services/PermissionService.js';
import BoardService from '../services/BoardService.js';
import { resolveBackgroundImageUrl, applyBackgroundStyle } from '../utils/backgroundImage.js';
import Hooks from '../plugins/HookRegistry.js';

export default class BoardView {
    /**
     * @type {import('../models/Board.js').default}
     */
    _board;

    /**
     * @type {HTMLElement|null}
     */
    _boardElement;

    /**
     * Conteneur DOM passé à render(), conservé pour le re-render.
     * @type {HTMLElement|null}
     */
    _container;

    /**
     * Instance SortableJS du board (drag horizontal des colonnes).
     * @type {import('sortablejs').default|null}
     */
    _sortable;

    /**
     * ColumnViews actives — détruites avant chaque re-render.
     * @type {ColumnView[]}
     */
    _columnViews;

    /**
     * Handler lié pour Board 'change' (stocké pour off()).
     * @type {Function}
     */
    _onBoardChangeBound;

    /**
     * @param {import('../models/Board.js').default} board - Le modèle Board
     */
    constructor(board) {
        this._board = board;
        this._boardElement = null;
        this._container = null;
        this._sortable = null;
        this._columnViews = [];

        /**
         * Flag posé par SortableJS onEnd pour indiquer que le DOM est déjà
         * à jour. Le prochain 'change' du model ne doit pas re-rendre.
         * @type {boolean}
         */
        this._sortableMoveInProgress = false;

        /**
         * Indique si render() n'a pas encore été appelé.
         * Le premier render déclenche board:displayed (navigation),
         * les suivants sont des re-renders (mutation du model).
         * @type {boolean}
         */
        this._isFirstRender = true;

        this._onBoardChangeBound = (payload) => {
            // Ignore les changements de métadonnées (nom, description, images)
            // qui ne nécessitent pas de reconstruire le plateau.
            if (payload?.meta) return;
            this._rerender();
        };
        this._board.on('change', this._onBoardChangeBound);
    }

    /**
     * Rend le board dans le conteneur donné.
     *
     * Crée l'élément .board, y ajoute chaque ColumnView, puis initialise
     * le drag & drop horizontal des colonnes.
     *
     * @param {HTMLElement} container - L'élément DOM dans lequel rendre (ex: #app)
     */
    render(container) {
        this._container = container;

        // Nettoie les instances précédentes avant de reconstruire
        this._cleanup();

        const board = document.createElement('div');
        board.className = 'board';
        board.id = 'board';

        this._board.columns.forEach((column) => {
            try {
                const columnView = new ColumnView(column, this._board);
                this._columnViews.push(columnView);
                board.appendChild(columnView.render());
            } catch (error) {
                const label = this._safeColumnLabel(column);
                console.error(`BoardView : échec du rendu de la colonne "${label}"`, error);
                board.appendChild(this._buildColumnError(column));
            }
        });

        container.innerHTML = '';
        container.appendChild(board);

        this._boardElement = board;
        this._applyBackground().catch((error) => {
            console.error("BoardView : échec du chargement de l'image de fond", error);
        });
        this._initSortable();

        const isFirstRender = this._isFirstRender;
        this._isFirstRender = false;

        Hooks.doAction('board:rendered', { board: this._board, element: board });

        if (isFirstRender) {
            Hooks.doAction('board:displayed', { board: this._board, element: board });
        }
    }

    /**
     * Applique l'image de fond du board si elle existe.
     *
     * @private
     */
    async _applyBackground() {
        if (!this._boardElement) return;

        const imageUrl = await resolveBackgroundImageUrl(this._board.backgroundImage);
        if (imageUrl && this._boardElement) {
            applyBackgroundStyle(this._boardElement, imageUrl);
        }
    }

    /**
     * Nettoie toutes les ressources : ColumnViews, Sortable, listener Board.
     * Appelé quand la vue est retirée définitivement du DOM.
     */
    destroy() {
        this._board.off('change', this._onBoardChangeBound);
        this._cleanup();
    }

    /**
     * Détruit les ColumnViews et l'instance SortableJS en cours.
     * Appelé avant chaque re-render et dans destroy().
     *
     * @private
     */
    _cleanup() {
        for (const cv of this._columnViews) {
            try {
                cv.destroy();
            } catch (error) {
                console.error("BoardView : échec du destroy d'une ColumnView", error);
            }
        }
        this._columnViews = [];

        if (this._sortable) {
            this._sortable.destroy();
            this._sortable = null;
        }
    }

    /**
     * Construit un placeholder d'erreur pour une colonne dont le rendu a échoué.
     *
     * @param {import('../models/Column.js').default} column
     * @returns {HTMLElement}
     * @private
     */
    _buildColumnError(column) {
        const el = document.createElement('div');
        el.className = 'column column--error';

        const title = document.createElement('div');
        title.className = 'column--error-title';
        title.textContent = this._safeColumnLabel(column);
        el.appendChild(title);

        const msg = document.createElement('div');
        msg.textContent = 'Erreur de rendu';
        el.appendChild(msg);

        return el;
    }

    /**
     * Retourne un label lisible pour une colonne, même si l'objet est corrompu.
     *
     * @param {*} column
     * @returns {string}
     * @private
     */
    _safeColumnLabel(column) {
        try {
            return column.title || column.id || '?';
        } catch {
            return '?';
        }
    }

    /**
     * Reconstruit le board complet (colonnes + SortableJS).
     * Appelé quand le model Board émet 'change'.
     *
     * Si _sortableMoveInProgress est vrai, SortableJS a déjà déplacé
     * l'élément dans le DOM — on n'a pas besoin de tout reconstruire.
     * On sauvegarde simplement le nouvel état.
     *
     * @private
     */
    _rerender() {
        if (this._sortableMoveInProgress) {
            this._sortableMoveInProgress = false;
            // save() est async — le résultat est géré par le auto-save error handler
            BoardService.save();
            return;
        }

        if (this._container) {
            this.render(this._container);
        }
    }

    /**
     * Initialise SortableJS pour le drag & drop horizontal des colonnes.
     *
     * Le handle est le header de la colonne — on ne peut pas drag
     * en cliquant sur le body (qui contient les cartes draggables).
     *
     * @private
     */
    _initSortable() {
        this._sortable = Sortable.create(this._boardElement, {
            animation: 200,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            handle: '.column-header',
            filter: '.column--error',
            ghostClass: 'column-ghost',
            direction: 'horizontal',
            disabled: !PermissionService.can('reorderColumns'),

            onEnd: (evt) => {
                // SortableJS a déjà déplacé le DOM — on pose le flag
                // pour que le 'change' émis par moveColumn() ne déclenche
                // pas un re-render destructif inutile.
                this._sortableMoveInProgress = true;
                this._board.moveColumn(evt.oldIndex, evt.newIndex);
            },
        });
    }
}
