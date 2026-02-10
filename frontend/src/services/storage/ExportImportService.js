/**
 * ExportImportService — Export et import des données Kanban.
 *
 * Exporte toutes les données (boards depuis IndexedDB, images,
 * settings depuis localStorage) dans un fichier JSON portable.
 *
 * @example
 * const json = await ExportImportService.exportAll();
 * downloadFile(JSON.stringify(json), 'kanban-backup.json');
 */
import { getDB, STORES, META_KEYS } from './Database.js';
import boardStorage from './BoardStorage.js';
import imageStorage from './IndexedDBImageStorage.js';
import { generateId } from '../../utils/id.js';

/** Version du format d'export */
const EXPORT_VERSION = 1;

const ExportImportService = {
    /**
     * Exporte toutes les données de l'application.
     *
     * @param {Object} [options={}]
     * @param {boolean} [options.includeImages=true]
     * @returns {Promise<Object>}
     */
    async exportAll(options = {}) {
        const { includeImages = true } = options;

        const db = await getDB();
        const registry = await boardStorage.getRegistry();
        const exportedAt = new Date().toISOString();

        // Export des boards depuis IndexedDB
        const boards = await db.getAll(STORES.BOARDS);

        // Export des images
        const images = [];
        if (includeImages) {
            const allImages = await db.getAll(STORES.IMAGES);
            for (const img of allImages) {
                try {
                    const dataUrl = await imageStorage.blobToDataUrl(img.blob);
                    images.push({
                        id: img.id,
                        boardId: img.boardId,
                        cardId: img.cardId,
                        mimeType: img.mimeType,
                        size: img.size,
                        createdAt: img.createdAt,
                        dataUrl,
                    });
                } catch (error) {
                    console.warn('[ExportImportService] Erreur export image:', img.id, error);
                }
            }
        }

        // Export des settings depuis IndexedDB (store meta)
        const settings = {};
        const allMeta = await db.getAll(STORES.META);
        for (const record of allMeta) {
            // Exclut le registre des boards (déjà exporté séparément)
            if (record.key !== META_KEYS.REGISTRY && record.key.startsWith('setting:')) {
                const settingKey = record.key.replace('setting:', '');
                settings[settingKey] = record.value;
            }
        }

        return {
            version: EXPORT_VERSION,
            exportedAt,
            registry: {
                activeBoard: registry.activeBoard,
            },
            settings,
            boards,
            images,
        };
    },

    /**
     * Importe des données dans l'application.
     * ATTENTION : Remplace toutes les données existantes !
     *
     * @param {Object} data
     * @param {Object} [options={}]
     * @param {boolean} [options.merge=false]
     * @returns {Promise<{ success: boolean, stats: Object }>}
     */
    async importAll(data, options = {}) {
        const { merge = false } = options;

        if (!data || data.version !== EXPORT_VERSION) {
            throw new Error("Format d'export non supporté");
        }

        const db = await getDB();
        const stats = {
            boardsImported: 0,
            imagesImported: 0,
            settingsImported: 0,
        };

        // Si pas de merge, nettoyer les données existantes
        if (!merge) {
            const existingRegistry = await boardStorage.getRegistry();
            for (const meta of existingRegistry.boards) {
                await boardStorage.deleteBoard(meta.id);
            }
        }

        // Import des images
        if (data.images?.length > 0) {
            for (const img of data.images) {
                try {
                    const blob = imageStorage.dataUrlToBlob(img.dataUrl);
                    await db.put(STORES.IMAGES, {
                        id: img.id,
                        blob,
                        boardId: img.boardId,
                        cardId: img.cardId,
                        mimeType: img.mimeType,
                        size: blob.size,
                        createdAt: img.createdAt || new Date().toISOString(),
                    });
                    stats.imagesImported++;
                } catch (error) {
                    console.warn('[ExportImportService] Erreur import image:', img.id, error);
                }
            }
        }

        // Import des boards
        if (data.boards?.length > 0) {
            const registry = await boardStorage.getRegistry();

            for (const boardData of data.boards) {
                // Valide la structure avant import pour éviter un crash au chargement
                const check = this._validateBoardStructure(boardData);
                if (!check.valid) {
                    console.warn(`[ExportImportService] Board ignoré (${check.reason}):`, boardData?.id);
                    continue;
                }

                const exists = registry.boards.some((b) => b.id === boardData.id);
                if (!exists) {
                    registry.boards.push({
                        id: boardData.id,
                        name: boardData.name,
                        description: boardData.description || '',
                        coverImageId: boardData.coverImage?.id || null,
                        createdAt: boardData.createdAt || new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        cardCount: this._countCards(boardData),
                        columnCount: boardData.columns?.length || 0,
                    });
                }

                await db.put(STORES.BOARDS, boardData);
                stats.boardsImported++;
            }

            if (data.registry?.activeBoard) {
                registry.activeBoard = data.registry.activeBoard;
            } else if (registry.boards.length > 0 && !registry.activeBoard) {
                registry.activeBoard = registry.boards[0].id;
            }

            await boardStorage.saveRegistry(registry);
        }

        // Import des settings dans IndexedDB
        if (data.settings) {
            for (const [key, value] of Object.entries(data.settings)) {
                await boardStorage.setSetting(key, value);
                stats.settingsImported++;
            }
        }

        return { success: true, stats };
    },

    /**
     * Exporte un seul board.
     *
     * @param {string} boardId
     * @returns {Promise<Object>}
     */
    async exportBoard(boardId) {
        const db = await getDB();
        const boardData = await db.get(STORES.BOARDS, boardId);

        if (!boardData) {
            throw new Error(`Board non trouvé : ${boardId}`);
        }

        const boardImages = await imageStorage.getByBoard(boardId);
        const images = [];
        for (const img of boardImages) {
            try {
                const dataUrl = await imageStorage.blobToDataUrl(img.blob);
                images.push({
                    id: img.id,
                    boardId: img.boardId,
                    cardId: img.cardId,
                    mimeType: img.mimeType,
                    size: img.size,
                    createdAt: img.createdAt,
                    dataUrl,
                });
            } catch (error) {
                console.warn('[ExportImportService] Erreur export image:', img.id, error);
            }
        }

        return {
            version: EXPORT_VERSION,
            exportedAt: new Date().toISOString(),
            type: 'single-board',
            board: boardData,
            images,
        };
    },

    /**
     * Importe un board.
     *
     * @param {Object} data
     * @param {Object} [options={}]
     * @param {string} [options.newName]
     * @returns {Promise<{ success: boolean, boardId: string }>}
     */
    async importBoard(data, options = {}) {
        const { newName = null } = options;

        if (!data || data.version !== EXPORT_VERSION) {
            throw new Error("Format d'export non supporté");
        }

        const boardData = data.board;
        if (!boardData) {
            throw new Error('Données de board manquantes');
        }

        // Valide la structure avant import pour éviter un crash au chargement
        const check = this._validateBoardStructure(boardData);
        if (!check.valid) {
            throw new Error(`Structure de board invalide : ${check.reason}`);
        }

        const db = await getDB();
        const newBoardId = generateId('board');
        const imageIdMap = new Map();

        // Import des images avec nouveaux IDs
        if (data.images?.length > 0) {
            for (const img of data.images) {
                try {
                    const blob = imageStorage.dataUrlToBlob(img.dataUrl);
                    const newImageId = generateId('img');
                    imageIdMap.set(img.id, newImageId);

                    await db.put(STORES.IMAGES, {
                        id: newImageId,
                        blob,
                        boardId: newBoardId,
                        cardId: img.cardId,
                        mimeType: img.mimeType,
                        size: blob.size,
                        createdAt: img.createdAt || new Date().toISOString(),
                    });
                } catch (error) {
                    console.warn('[ExportImportService] Erreur import image:', img.id, error);
                }
            }
        }

        // Met à jour les références d'images
        const updatedBoardData = this._remapImageReferences(boardData, imageIdMap);
        updatedBoardData.id = newBoardId;
        updatedBoardData.name = newName || `${boardData.name} (importé)`;

        // Ajoute au registre
        const registry = await boardStorage.getRegistry();
        registry.boards.push({
            id: newBoardId,
            name: updatedBoardData.name,
            description: updatedBoardData.description || '',
            coverImageId: updatedBoardData.coverImage?.id || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            cardCount: this._countCards(updatedBoardData),
            columnCount: updatedBoardData.columns?.length || 0,
        });
        await boardStorage.saveRegistry(registry);

        await db.put(STORES.BOARDS, updatedBoardData);

        return { success: true, boardId: newBoardId };
    },

    /**
     * Valide la structure minimale d'un board avant import.
     * Rejette les données malformées qui crasheraient l'app au chargement.
     *
     * @param {Object} boardData - Données brutes du board
     * @returns {{ valid: boolean, reason?: string }}
     * @private
     */
    _validateBoardStructure(boardData) {
        if (!boardData || typeof boardData !== 'object') {
            return { valid: false, reason: "boardData n'est pas un objet" };
        }
        if (!boardData.id || typeof boardData.id !== 'string') {
            return { valid: false, reason: 'boardData.id manquant ou invalide' };
        }
        if (!Array.isArray(boardData.columns)) {
            return { valid: false, reason: "boardData.columns n'est pas un tableau" };
        }
        for (let i = 0; i < boardData.columns.length; i++) {
            const col = boardData.columns[i];
            if (!col || typeof col !== 'object') {
                return { valid: false, reason: `columns[${i}] n'est pas un objet` };
            }
            if (!col.id || typeof col.id !== 'string') {
                return { valid: false, reason: `columns[${i}].id manquant ou invalide` };
            }
            if (typeof col.title !== 'string') {
                return { valid: false, reason: `columns[${i}].title manquant ou invalide` };
            }
            if (!Array.isArray(col.cards)) {
                return { valid: false, reason: `columns[${i}].cards n'est pas un tableau` };
            }
            for (let j = 0; j < col.cards.length; j++) {
                const card = col.cards[j];
                if (!card || typeof card !== 'object') {
                    return { valid: false, reason: `columns[${i}].cards[${j}] n'est pas un objet` };
                }
                if (!card.id || typeof card.id !== 'string') {
                    return { valid: false, reason: `columns[${i}].cards[${j}].id manquant ou invalide` };
                }
                if (typeof card.title !== 'string') {
                    return { valid: false, reason: `columns[${i}].cards[${j}].title manquant ou invalide` };
                }
            }
        }
        return { valid: true };
    },

    /**
     * @private
     */
    _countCards(boardData) {
        if (!boardData.columns) return 0;
        return boardData.columns.reduce((sum, col) => sum + (col.cards?.length || 0), 0);
    },

    /**
     * @private
     */
    _remapImageReferences(boardData, imageIdMap) {
        const data = JSON.parse(JSON.stringify(boardData));

        if (data.backgroundImage?.id && imageIdMap.has(data.backgroundImage.id)) {
            data.backgroundImage.id = imageIdMap.get(data.backgroundImage.id);
        }

        if (data.coverImage?.id && imageIdMap.has(data.coverImage.id)) {
            data.coverImage.id = imageIdMap.get(data.coverImage.id);
        }

        if (data.columns) {
            for (const col of data.columns) {
                if (col.cards) {
                    for (const card of col.cards) {
                        if (card.image?.id && imageIdMap.has(card.image.id)) {
                            card.image.id = imageIdMap.get(card.image.id);
                        }
                        if (card.data?.imageId && imageIdMap.has(card.data.imageId)) {
                            card.data.imageId = imageIdMap.get(card.data.imageId);
                        }

                        // Fichiers joints (FileAttachmentPlugin)
                        if (card.data?.files && Array.isArray(card.data.files)) {
                            for (const file of card.data.files) {
                                if (file.id && imageIdMap.has(file.id)) {
                                    file.id = imageIdMap.get(file.id);
                                }
                            }
                        }

                        // Remap img:<id> dans la description et le résumé markdown
                        if (card.description) {
                            card.description = this._remapImageMarkdown(card.description, imageIdMap);
                        }
                        if (card.summary) {
                            card.summary = this._remapImageMarkdown(card.summary, imageIdMap);
                        }

                        // Remap img:<id> dans les commentaires + fichiers joints
                        if (card.comments) {
                            for (const comment of card.comments) {
                                if (comment.text) {
                                    comment.text = this._remapImageMarkdown(comment.text, imageIdMap);
                                }

                                // Fichiers joints aux commentaires
                                if (comment.files && Array.isArray(comment.files)) {
                                    for (const file of comment.files) {
                                        if (file.id && imageIdMap.has(file.id)) {
                                            file.id = imageIdMap.get(file.id);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return data;
    },

    /**
     * Remplace les references img:<oldId> par img:<newId> dans un texte markdown.
     *
     * @param {string} text - Texte markdown
     * @param {Map<string, string>} imageIdMap - Map ancien ID → nouveau ID
     * @returns {string}
     * @private
     */
    _remapImageMarkdown(text, imageIdMap) {
        return text.replace(/!\[([^\]]*)\]\(img:([^)]+)\)/g, (match, alt, oldId) => {
            const newId = imageIdMap.get(oldId);
            return newId ? `![${alt}](img:${newId})` : match;
        });
    },
};

export default ExportImportService;
