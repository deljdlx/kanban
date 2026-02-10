/**
 * ImageBackendAdapter — Adapteur backend pour les images.
 *
 * Gère l'upload, le download et la suppression des images vers le backend Laravel.
 * Utilise multipart/form-data pour l'upload des blobs.
 */
export default class ImageBackendAdapter {
    /**
     * @type {string}
     */
    _baseUrl;

    /**
     * Fonction retournant les headers HTTP (ex: Authorization).
     * @type {() => Object}
     */
    _getHeaders;

    /**
     * @param {Object} config
     * @param {string} config.baseUrl - URL de base du backend (sans trailing slash)
     * @param {() => Object} config.getHeaders - Fonction retournant les headers HTTP
     */
    constructor({ baseUrl, getHeaders }) {
        this._baseUrl = baseUrl.replace(/\/+$/, '');
        this._getHeaders = getHeaders;
    }

    /**
     * Upload une image vers le backend.
     *
     * POST {baseUrl}/api/boards/{boardId}/images
     *
     * @param {string} imageId
     * @param {Blob} blob
     * @param {string} boardId
     * @param {string|null} cardId
     * @param {string} mimeType
     * @returns {Promise<void>}
     */
    async uploadImage(imageId, blob, boardId, cardId, mimeType) {
        const formData = new FormData();
        formData.append('id', imageId);
        formData.append('image', blob, `${imageId}.${this._getExtension(mimeType)}`);
        if (cardId) formData.append('cardId', cardId);

        const headers = this._getHeaders();
        // Ne pas définir Content-Type pour laisser le navigateur gérer multipart/form-data

        const response = await fetch(`${this._baseUrl}/api/boards/${boardId}/images`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed: HTTP ${response.status}`);
        }
    }

    /**
     * Télécharge une image depuis le backend.
     *
     * GET {baseUrl}/api/images/{imageId}
     *
     * @param {string} imageId
     * @param {string} boardId - ID du board (fourni par l'appelant)
     * @returns {Promise<Object|null>} Record { id, blob, boardId, cardId, mimeType, size, createdAt }
     */
    async downloadImage(imageId, boardId) {
        const headers = this._getHeaders();

        const response = await fetch(`${this._baseUrl}/api/images/${imageId}`, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`Download failed: HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const mimeType = response.headers.get('Content-Type') || 'image/png';

        // Récupère cardId depuis les headers custom (si disponible)
        const cardId = response.headers.get('X-Card-Id') || null;

        return {
            id: imageId,
            blob,
            boardId,
            cardId,
            mimeType,
            size: blob.size,
            createdAt: new Date().toISOString(),
        };
    }

    /**
     * Supprime une image du backend.
     *
     * DELETE {baseUrl}/api/images/{imageId}
     *
     * @param {string} imageId
     * @returns {Promise<void>}
     */
    async deleteImage(imageId) {
        const headers = this._getHeaders();

        const response = await fetch(`${this._baseUrl}/api/images/${imageId}`, {
            method: 'DELETE',
            headers,
        });

        if (!response.ok && response.status !== 404) {
            throw new Error(`Delete failed: HTTP ${response.status}`);
        }
    }

    /**
     * Retourne l'extension de fichier basée sur le MIME type.
     *
     * @param {string} mimeType
     * @returns {string}
     * @private
     */
    _getExtension(mimeType) {
        const map = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'image/svg+xml': 'svg',
        };
        return map[mimeType] || 'bin';
    }
}
