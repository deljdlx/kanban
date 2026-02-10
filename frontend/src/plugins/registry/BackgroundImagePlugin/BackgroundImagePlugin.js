/**
 * BackgroundImagePlugin — Ajoute le drag & drop d'image sur le board.
 *
 * Ce plugin ajoute une fonctionnalité de commodité : glisser-déposer
 * une image directement sur le board pour la définir comme fond.
 *
 * L'image de fond est stockée dans IndexedDB via ImageStorageService.
 * Le modèle Board stocke uniquement une référence { id } vers l'image.
 *
 * Hook utilisé :
 *   - board:rendered : pour attacher les listeners de drop
 */
import ImageStorageService from '../../../services/ImageStorageService.js';
import Application from '../../../Application.js';

const BackgroundImagePlugin = {
    /**
     * Référence au board.
     * @type {import('../../../models/Board.js').default|null}
     */
    _board: null,

    /**
     * Handlers DOM pour cleanup.
     * @type {{ dragover: Function|null, drop: Function|null, onBoardWillChange: Function|null, onBoardRendered: Function|null }}
     */
    _handlers: {
        dragover: null,
        drop: null,
        onBoardWillChange: null,
        onBoardRendered: null,
    },

    /**
     * Installe le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        // Cleanup avant switch de board
        this._handlers.onBoardWillChange = () => this._resetBoardState();
        hooks.addAction('board:willChange', this._handlers.onBoardWillChange);

        this._handlers.onBoardRendered = ({ board, element }) => {
            this._board = board;
            this._attachDomListeners(element);
        };
        hooks.addAction('board:rendered', this._handlers.onBoardRendered);
    },

    /**
     * Désinstalle le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        this._resetBoardState();

        if (this._handlers.onBoardWillChange) {
            hooks.removeAction('board:willChange', this._handlers.onBoardWillChange);
        }
        if (this._handlers.onBoardRendered) {
            hooks.removeAction('board:rendered', this._handlers.onBoardRendered);
        }
    },

    /**
     * Remet à zéro l'état lié au board courant.
     * Appelé lors du switch de board et dans uninstall().
     *
     * @private
     */
    _resetBoardState() {
        this._detachDomListeners();
        this._board = null;
    },

    /**
     * Attache les listeners de drag & drop sur le board.
     *
     * @param {HTMLElement} boardEl
     * @private
     */
    _attachDomListeners(boardEl) {
        this._handlers.dragover = (e) => {
            if (!e.dataTransfer?.types?.includes('Files')) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        };

        this._handlers.drop = (e) => {
            const file = e.dataTransfer?.files?.[0];
            if (!file || !file.type.startsWith('image/')) return;

            e.preventDefault();
            e.stopPropagation();
            this._readAndApply(file, boardEl);
        };

        boardEl.addEventListener('dragover', this._handlers.dragover);
        boardEl.addEventListener('drop', this._handlers.drop);
    },

    /**
     * Retire les listeners DOM.
     *
     * @private
     */
    _detachDomListeners() {
        const board = document.querySelector('.board');
        if (!board) return;

        if (this._handlers.dragover) {
            board.removeEventListener('dragover', this._handlers.dragover);
        }
        if (this._handlers.drop) {
            board.removeEventListener('drop', this._handlers.drop);
        }
    },

    /**
     * Lit un fichier image et l'applique comme fond.
     * Stocke l'image dans IndexedDB et garde une référence dans board.backgroundImage.
     *
     * @param {File} file
     * @param {HTMLElement} boardEl
     * @private
     */
    async _readAndApply(file, boardEl) {
        try {
            // Récupère le boardId pour associer l'image au board
            const boardId = Application.instance?.currentBoardId;

            // Stocke dans IndexedDB
            const imageData = await ImageStorageService.store(file, boardId, null);

            // Stocke la référence dans le modèle (déclenche auto-save)
            if (this._board) {
                this._board.backgroundImage = { id: imageData.id };
            }

            // Récupère l'URL pour l'affichage immédiat
            const imageUrl = await ImageStorageService.getUrl(imageData.id);

            // Applique immédiatement au DOM
            if (imageUrl) {
                boardEl.style.backgroundImage = `url(${imageUrl})`;
                boardEl.style.backgroundSize = 'cover';
                boardEl.style.backgroundPosition = 'center';
                boardEl.style.backgroundRepeat = 'no-repeat';
            }
        } catch (error) {
            console.error("BackgroundImagePlugin: Erreur lors du stockage de l'image", error);
        }
    },
};

export default BackgroundImagePlugin;
