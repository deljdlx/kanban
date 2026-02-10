/**
 * IndexedDBImageStorage — Stockage des images via idb.
 *
 * Utilise la DB unifiée pour stocker les blobs d'images.
 * Les URLs sont des Object URLs créées à la demande et cachées.
 *
 * @example
 * import imageStorage from './IndexedDBImageStorage.js';
 *
 * const id = await imageStorage.store({ blob, boardId, cardId, mimeType });
 * const url = await imageStorage.getUrl(id);
 * imageStorage.revokeAllUrls(); // Libère la mémoire
 */
import { getDB, STORES } from './Database.js';
import { generateId } from '../../utils/id.js';

const ImageStorage = {
    /**
     * Cache des Object URLs par imageId.
     * @type {Map<string, string>}
     */
    _urlCache: new Map(),

    /**
     * Backend adapter pour sync des images (null = mode offline).
     * @type {{ uploadImage: Function, downloadImage: Function, deleteImage: Function }|null}
     */
    _backendAdapter: null,

    // ---------------------------------------------------------------
    // Backend sync
    // ---------------------------------------------------------------

    /**
     * Configure l'adapteur backend pour la sync des images.
     *
     * @param {{ uploadImage: Function, downloadImage: Function, deleteImage: Function }|null} adapter
     */
    setBackendAdapter(adapter) {
        this._backendAdapter = adapter;
    },

    // ---------------------------------------------------------------
    // CRUD
    // ---------------------------------------------------------------

    /**
     * Stocke une image dans IndexedDB.
     * Si le backend est configuré, upload en parallèle.
     *
     * @param {Object} imageData
     * @param {Blob} imageData.blob - Blob de l'image
     * @param {string} imageData.boardId - ID du board
     * @param {string|null} [imageData.cardId=null] - ID de la carte
     * @param {string} imageData.mimeType - Type MIME
     * @returns {Promise<string>} ID de l'image
     */
    async store(imageData) {
        const { blob, boardId, cardId = null, mimeType } = imageData;
        const db = await getDB();

        const id = generateId('img');

        const record = {
            id,
            blob,
            boardId,
            cardId,
            mimeType,
            size: blob.size,
            createdAt: new Date().toISOString(),
        };

        await db.put(STORES.IMAGES, record);

        // Upload vers le backend en parallèle (fire-and-forget)
        if (this._backendAdapter && navigator.onLine) {
            this._backendAdapter
                .uploadImage(id, blob, boardId, cardId, mimeType)
                .catch((err) => console.warn('IndexedDBImageStorage: upload backend échoué', err));
        }

        return id;
    },

    /**
     * Récupère une image par son ID.
     *
     * @param {string} imageId
     * @returns {Promise<Object|null>}
     */
    async get(imageId) {
        const db = await getDB();
        return (await db.get(STORES.IMAGES, imageId)) || null;
    },

    /**
     * Retourne une Object URL pour afficher l'image.
     * Les URLs sont cachées pour performance.
     *
     * @param {string} imageId
     * @returns {Promise<string|null>}
     */
    async getUrl(imageId) {
        if (!imageId) return null;

        // Vérifie le cache
        if (this._urlCache.has(imageId)) {
            return this._urlCache.get(imageId);
        }

        const record = await this.get(imageId);
        if (!record?.blob) return null;

        // Crée et cache l'Object URL
        const url = URL.createObjectURL(record.blob);
        this._urlCache.set(imageId, url);

        return url;
    },

    /**
     * Supprime une image.
     * Si le backend est configuré, supprime aussi côté serveur.
     *
     * @param {string} imageId
     * @returns {Promise<boolean>}
     */
    async delete(imageId) {
        const db = await getDB();

        // Révoque l'URL cachée
        if (this._urlCache.has(imageId)) {
            URL.revokeObjectURL(this._urlCache.get(imageId));
            this._urlCache.delete(imageId);
        }

        await db.delete(STORES.IMAGES, imageId);

        // Supprime du backend en parallèle (fire-and-forget)
        if (this._backendAdapter && navigator.onLine) {
            this._backendAdapter
                .deleteImage(imageId)
                .catch((err) => console.warn('IndexedDBImageStorage: suppression backend échouée', err));
        }

        return true;
    },

    /**
     * Supprime toutes les images d'un board.
     *
     * @param {string} boardId
     * @returns {Promise<number>} Nombre d'images supprimées
     */
    async deleteByBoard(boardId) {
        const db = await getDB();
        const tx = db.transaction(STORES.IMAGES, 'readwrite');
        const index = tx.store.index('by-board');

        let deleted = 0;
        let cursor = await index.openCursor(IDBKeyRange.only(boardId));

        while (cursor) {
            const id = cursor.value.id;

            // Révoque l'URL cachée
            if (this._urlCache.has(id)) {
                URL.revokeObjectURL(this._urlCache.get(id));
                this._urlCache.delete(id);
            }

            await cursor.delete();
            deleted++;
            cursor = await cursor.continue();
        }

        await tx.done;
        return deleted;
    },

    /**
     * Récupère toutes les images d'un board.
     *
     * @param {string} boardId
     * @returns {Promise<Object[]>}
     */
    async getByBoard(boardId) {
        const db = await getDB();
        return await db.getAllFromIndex(STORES.IMAGES, 'by-board', boardId);
    },

    // ---------------------------------------------------------------
    // Cache des URLs
    // ---------------------------------------------------------------

    /**
     * Révoque toutes les Object URLs cachées.
     * Appeler lors d'un changement de board.
     */
    revokeAllUrls() {
        for (const url of this._urlCache.values()) {
            URL.revokeObjectURL(url);
        }
        this._urlCache.clear();
    },

    // ---------------------------------------------------------------
    // Conversion blob <-> dataUrl
    // ---------------------------------------------------------------

    /**
     * Convertit un blob en data URL base64.
     *
     * @param {Blob} blob
     * @returns {Promise<string>}
     */
    async blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    },

    /**
     * Convertit une data URL en blob.
     *
     * @param {string} dataUrl
     * @returns {Blob}
     */
    dataUrlToBlob(dataUrl) {
        const [header, base64] = dataUrl.split(',');
        const mimeMatch = header.match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

        const binary = atob(base64);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
        }

        return new Blob([array], { type: mimeType });
    },
};

export default ImageStorage;
