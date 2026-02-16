/**
 * ImageBackendAdapter — Adapteur backend pour les images.
 *
 * Gère l'upload, le download et la suppression des images vers le backend Laravel.
 * Délègue le HTTP (auth, timeout, 401) au BackendHttpClient centralisé.
 */
export default class ImageBackendAdapter {
    /**
     * Client HTTP centralisé.
     * @type {import('../../../services/BackendHttpClient.js').BackendHttpClient}
     */
    _httpClient;

    /**
     * @param {import('../../../services/BackendHttpClient.js').BackendHttpClient} httpClient
     */
    constructor(httpClient) {
        this._httpClient = httpClient;
    }

    /**
     * Upload une image vers le backend.
     *
     * POST /api/boards/{boardId}/images
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

        await this._httpClient.upload(`/api/boards/${boardId}/images`, formData);
    }

    /**
     * Télécharge une image depuis le backend.
     *
     * GET /api/images/{imageId}
     *
     * @param {string} imageId
     * @param {string} boardId - ID du board (fourni par l'appelant)
     * @returns {Promise<Object|null>} Record { id, blob, boardId, cardId, mimeType, size, createdAt }
     */
    async downloadImage(imageId, boardId) {
        let response;
        try {
            response = await this._httpClient.requestRaw('GET', `/api/images/${imageId}`);
        } catch (error) {
            // 404 → image inexistante, retourne null
            if (error.message.includes('404')) return null;
            throw error;
        }

        const blob = await response.blob();
        const mimeType = response.headers.get('Content-Type') || 'image/png';
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
     * DELETE /api/images/{imageId}
     *
     * @param {string} imageId
     * @returns {Promise<void>}
     */
    async deleteImage(imageId) {
        try {
            await this._httpClient.delete(`/api/images/${imageId}`);
        } catch (error) {
            // 404 → déjà supprimée, pas une erreur
            if (error.message.includes('404')) return;
            throw error;
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
