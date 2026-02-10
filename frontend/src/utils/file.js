/**
 * file.js — Utilitaires pour l'affichage de fichiers.
 *
 * Fonctions pures sans dépendance, utilisées par FileAttachmentPlugin
 * et CommentsPanel pour formater les métadonnées fichier.
 */

/**
 * Retourne une icône emoji selon le type MIME.
 *
 * @param {string} mimeType
 * @returns {string}
 */
export function getFileIcon(mimeType) {
    if (!mimeType) return '\u{1F4CE}';
    if (mimeType === 'application/pdf') return '\u{1F4C4}';
    if (mimeType.startsWith('image/')) return '\u{1F5BC}\uFE0F';
    if (mimeType.startsWith('video/')) return '\u{1F3AC}';
    if (mimeType.startsWith('audio/')) return '\u{1F3B5}';
    if (mimeType.startsWith('text/')) return '\u{1F4DD}';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '\u{1F4CA}';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '\u{1F4FD}\uFE0F';
    if (mimeType.includes('document') || mimeType.includes('word')) return '\u{1F4C3}';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return '\u{1F4E6}';
    return '\u{1F4CE}';
}

/**
 * Formate une taille en octets en chaîne lisible (ex: "1.2 MB", "340 KB").
 *
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
