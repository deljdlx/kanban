/**
 * backgroundImage.js — Utilitaires pour résoudre et appliquer les images de fond.
 *
 * Factorise la logique dupliquée entre BoardView et GeneralPanel :
 * résolution IndexedDB/legacy + application des styles CSS.
 */
import ImageStorageService from '../services/ImageStorageService.js';

/**
 * Résout l'URL d'une image de fond depuis son format de stockage.
 *
 * Supporte deux formats :
 *   - IndexedDB : { id: string } → résolu via ImageStorageService
 *   - Legacy : string commençant par 'data:' → retourné tel quel
 *
 * @param {{ id: string }|string|null} bgImage - Référence à l'image
 * @returns {Promise<string|null>} URL de l'image (Object URL ou data URL)
 */
export async function resolveBackgroundImageUrl(bgImage) {
    if (!bgImage) return null;

    if (typeof bgImage === 'object' && bgImage.id) {
        return await ImageStorageService.getUrl(bgImage.id);
    }

    if (typeof bgImage === 'string' && bgImage.startsWith('data:')) {
        return bgImage;
    }

    return null;
}

/**
 * Applique ou retire une image de fond sur un élément DOM.
 *
 * @param {HTMLElement} element - Élément cible
 * @param {string|null} imageUrl - URL de l'image (null = retire le fond)
 */
export function applyBackgroundStyle(element, imageUrl) {
    if (imageUrl) {
        element.style.backgroundImage = `url(${imageUrl})`;
        element.style.backgroundSize = 'cover';
        element.style.backgroundPosition = 'center';
        element.style.backgroundRepeat = 'no-repeat';
    } else {
        element.style.backgroundImage = '';
        element.style.backgroundSize = '';
        element.style.backgroundPosition = '';
        element.style.backgroundRepeat = '';
    }
}
