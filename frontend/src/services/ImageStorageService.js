/**
 * ImageStorageService — Abstraction pour le stockage d'images.
 *
 * Utilise IndexedDB via StorageService pour stocker les images.
 * Les images sont compressées avant stockage pour optimiser l'espace.
 *
 * Les URLs retournées sont des Object URLs créées à la demande.
 * getUrl() est maintenant async car la récupération depuis IndexedDB
 * est asynchrone.
 *
 * @example
 * // Stocker une image
 * const result = await ImageStorageService.store(file, boardId, cardId);
 * // result = { id: 'img-xxx' }
 *
 * // Récupérer l'URL (async!)
 * const url = await ImageStorageService.getUrl('img-xxx');
 */

import StorageService from './StorageService.js';
import Container from '../Container.js';

/** @type {number} Largeur max pour la compression */
const MAX_WIDTH = 800;

/** @type {number} Qualité JPEG (0-1) */
const QUALITY = 0.7;

/** @type {number} Taille max en bytes avant warning (500KB) */
const SIZE_WARNING_THRESHOLD = 500 * 1024;

/**
 * Service de stockage d'images.
 * Singleton qui délègue à IndexedDB via StorageService.
 */
class ImageStorageServiceClass {
    constructor() {
        /**
         * Stratégie alternative (pour futur backend API).
         * @type {Object|null}
         */
        this._strategy = null;
    }

    /**
     * Change la stratégie de stockage.
     * Appeler cette méthode pour passer à un backend API.
     *
     * @param {Object|null} strategy - Doit implémenter store() et getUrl()
     */
    setStrategy(strategy) {
        this._strategy = strategy;
    }

    /**
     * Retourne la stratégie actuelle (null = IndexedDB par défaut).
     *
     * @returns {Object|null}
     */
    getStrategy() {
        return this._strategy;
    }

    /**
     * Stocke une image dans IndexedDB.
     * L'image est compressée avant stockage.
     *
     * @param {File} file - Fichier image à stocker
     * @param {string} boardId - ID du board propriétaire
     * @param {string|null} [cardId=null] - ID de la carte (null pour background)
     * @returns {Promise<{ id: string, size: number }>}
     */
    async store(file, boardId, cardId = null) {
        // Si une stratégie custom est définie, l'utiliser
        if (this._strategy) {
            return this._strategy.store(file, boardId, cardId);
        }

        // Compresse l'image
        const compressed = await this._compressImage(file);

        if (compressed.size > SIZE_WARNING_THRESHOLD) {
            console.warn(
                `[ImageStorageService] Image volumineuse (${Math.round(compressed.size / 1024)}KB). ` +
                    "Envisagez d'utiliser des images plus petites.",
            );
        }

        // Stocke dans IndexedDB
        const id = await StorageService.storeImage({
            blob: compressed.blob,
            boardId,
            cardId,
            mimeType: compressed.mimeType,
        });

        return { id, size: compressed.size };
    }

    /**
     * Récupère l'URL d'une image (async).
     * Retourne une Object URL pour afficher l'image.
     *
     * @param {string} imageId - Identifiant de l'image
     * @returns {Promise<string|null>} Object URL ou null si non trouvée
     */
    async getUrl(imageId) {
        if (!imageId) return null;

        // Si une stratégie custom est définie, l'utiliser
        if (this._strategy) {
            return this._strategy.getUrl(imageId);
        }

        return StorageService.getImageUrl(imageId);
    }

    /**
     * Supprime une image.
     *
     * @param {string} imageId - ID de l'image
     * @returns {Promise<boolean>}
     */
    async delete(imageId) {
        if (!imageId) return false;

        if (this._strategy?.delete) {
            return this._strategy.delete(imageId);
        }

        return StorageService.deleteImage(imageId);
    }

    /**
     * Vérifie si un fichier est une image valide.
     *
     * @param {File} file
     * @returns {boolean}
     */
    isValidImage(file) {
        return file && file.type.startsWith('image/');
    }

    /**
     * Compresse une image et retourne un Blob.
     *
     * @param {File} file
     * @returns {Promise<{ blob: Blob, size: number, mimeType: string }>}
     * @private
     */
    async _compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;

                    // Redimensionne si trop large
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convertit en JPEG compressé (ou PNG si transparence)
                    const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                    const quality = mimeType === 'image/jpeg' ? QUALITY : undefined;

                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error("Impossible de compresser l'image"));
                                return;
                            }
                            resolve({
                                blob,
                                size: blob.size,
                                mimeType,
                            });
                        },
                        mimeType,
                        quality,
                    );
                };

                img.onerror = () => reject(new Error("Impossible de charger l'image"));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('Impossible de lire le fichier'));
            reader.readAsDataURL(file);
        });
    }
}

const imageStorageService = new ImageStorageServiceClass();
Container.set('ImageStorageService', imageStorageService);

export { ImageStorageServiceClass };
export default imageStorageService;
