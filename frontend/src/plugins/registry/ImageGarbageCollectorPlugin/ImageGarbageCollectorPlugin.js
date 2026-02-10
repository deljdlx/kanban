/**
 * ImageGarbageCollectorPlugin — Supprime les images orphelines en IndexedDB.
 *
 * Apres chaque sauvegarde de board (hook board:saved), un GC debounce de 10s
 * scanne toutes les references d'images dans le board (background, cover,
 * cartes, descriptions, commentaires) puis supprime celles qui ne sont
 * plus referencees nulle part.
 */
import StorageService from '../../../services/StorageService.js';
import Application from '../../../Application.js';

/** Delai avant execution du GC apres la derniere sauvegarde */
const GC_DELAY = 10_000;

/** Regex pour extraire les IDs d'images depuis le markdown : ![alt](img:<id>) */
const IMG_REGEX = /!\[[^\]]*\]\(img:([^)]+)\)/g;

const ImageGarbageCollectorPlugin = {
    /** @type {Array<{ hookName: string, callback: Function }>} */
    _registeredHooks: [],

    /** @type {number|null} Timer du debounce */
    _gcTimer: null,

    /** @type {import('../../../models/Board.js').default|null} Dernier board sauvegarde */
    _lastBoard: null,

    /**
     * Installe le plugin : ecoute board:saved pour declencher le GC.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        this._registeredHooks = [];

        const cb = (ctx) => this._onBoardSaved(ctx);
        hooks.addAction('board:saved', cb);
        this._registeredHooks.push({ hookName: 'board:saved', callback: cb });
    },

    /**
     * Desinstalle le plugin : retire les hooks et annule le timer.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        for (const { hookName, callback } of this._registeredHooks) {
            hooks.removeAction(hookName, callback);
        }
        this._registeredHooks = [];

        if (this._gcTimer) {
            clearTimeout(this._gcTimer);
            this._gcTimer = null;
        }
        this._lastBoard = null;
    },

    /**
     * Callback board:saved — stocke la ref board et relance le debounce.
     *
     * @param {{ board: import('../../../models/Board.js').default }} payload
     * @private
     */
    _onBoardSaved({ board }) {
        this._lastBoard = board;

        if (this._gcTimer) {
            clearTimeout(this._gcTimer);
        }
        this._gcTimer = setTimeout(() => this._runGC(), GC_DELAY);
    },

    /**
     * Execute le garbage collector :
     * 1. Collecte toutes les images referencees dans le board
     * 2. Recupere toutes les images stockees pour ce board
     * 3. Supprime les orphelines
     *
     * @private
     */
    async _runGC() {
        this._gcTimer = null;
        const board = this._lastBoard;
        if (!board) return;

        const boardId = Application.instance?.currentBoardId;
        if (!boardId) return;

        try {
            const referencedIds = this._collectReferencedImages(board);
            const storedImages = await StorageService.getImagesByBoard(boardId);

            const orphans = storedImages.filter((img) => !referencedIds.has(img.id));
            if (orphans.length === 0) return;

            const totalKB = orphans.reduce((sum, img) => sum + (img.size || 0), 0) / 1024;

            for (const orphan of orphans) {
                await StorageService.deleteImage(orphan.id);
            }

            console.log(`[ImageGC] Supprime ${orphans.length} image(s) orpheline(s) (${totalKB.toFixed(1)} KB)`);
        } catch (err) {
            console.error('[ImageGC] Erreur pendant le nettoyage :', err);
        }
    },

    /**
     * Parcourt le board et collecte tous les IDs d'images referencees.
     *
     * Points de reference scannes :
     *   1. board.backgroundImageId
     *   2. board.coverImageId
     *   3. card.imageId (image legacy)
     *   4. card.data.imageId (image widget)
     *   5. card.data.files[].id (fichiers joints — FileAttachmentPlugin)
     *   6. card.description (markdown img:)
     *   7. card.comments[].text (markdown img:)
     *   8. card.comments[].files[].id (fichiers joints aux commentaires)
     *
     * @param {import('../../../models/Board.js').default} board
     * @returns {Set<string>}
     * @private
     */
    _collectReferencedImages(board) {
        const ids = new Set();

        // Board-level images
        if (board.backgroundImageId) ids.add(board.backgroundImageId);
        if (board.coverImageId) ids.add(board.coverImageId);

        // Parcours des colonnes et cartes
        for (const column of board.columns) {
            for (const card of column.cards) {
                // Image legacy
                if (card.imageId) ids.add(card.imageId);

                // Image widget (dans card.data)
                const data = card.data;
                if (data?.imageId) ids.add(data.imageId);

                // Fichiers joints (FileAttachmentPlugin)
                if (data?.files && Array.isArray(data.files)) {
                    for (const file of data.files) {
                        if (file.id) ids.add(file.id);
                    }
                }

                // Description — references markdown
                if (card.description) {
                    for (const id of this._extractMarkdownImageIds(card.description)) {
                        ids.add(id);
                    }
                }

                // Commentaires — references markdown + fichiers joints
                for (const comment of card.comments) {
                    if (comment.text) {
                        for (const id of this._extractMarkdownImageIds(comment.text)) {
                            ids.add(id);
                        }
                    }

                    // Fichiers joints aux commentaires
                    if (comment.files && Array.isArray(comment.files)) {
                        for (const file of comment.files) {
                            if (file.id) ids.add(file.id);
                        }
                    }
                }
            }
        }

        return ids;
    },

    /**
     * Extrait les IDs d'images depuis un texte markdown.
     * Pattern : ![alt](img:<id>)
     *
     * @param {string} text
     * @returns {string[]}
     * @private
     */
    _extractMarkdownImageIds(text) {
        const ids = [];
        let match;
        // Reset lastIndex pour reutiliser la regex globale
        IMG_REGEX.lastIndex = 0;
        while ((match = IMG_REGEX.exec(text)) !== null) {
            ids.push(match[1]);
        }
        return ids;
    },
};

export default ImageGarbageCollectorPlugin;
