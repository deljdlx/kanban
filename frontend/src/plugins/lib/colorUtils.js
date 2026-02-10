/**
 * colorUtils.js — Utilitaires de manipulation de couleurs.
 *
 * Fonctions partagees pour parser et formater les couleurs
 * entre differents formats (hex, rgba, composants).
 */

/**
 * Parse une couleur HEXA (#rrggbb ou #rrggbbaa) ou RGBA en composants.
 *
 * @param {string} color - Couleur en format hex ou rgba
 * @returns {{ r: number, g: number, b: number, a: number }}
 *
 * @example
 * parseColor('#ff0000')        // { r: 255, g: 0, b: 0, a: 1 }
 * parseColor('#ff000080')      // { r: 255, g: 0, b: 0, a: 0.5 }
 * parseColor('rgba(255,0,0,0.5)') // { r: 255, g: 0, b: 0, a: 0.5 }
 */
export function parseColor(color) {
    // Format rgba(r, g, b, a) ou rgb(r, g, b)
    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
        return {
            r: parseInt(rgbaMatch[1], 10),
            g: parseInt(rgbaMatch[2], 10),
            b: parseInt(rgbaMatch[3], 10),
            a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1,
        };
    }

    // Format hex : #rrggbb ou #rrggbbaa
    const cleaned = color.replace('#', '');
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    const a = cleaned.length === 8 ? parseInt(cleaned.substring(6, 8), 16) / 255 : 1;

    return { r, g, b, a };
}

/**
 * Convertit les composants RGBA en string CSS.
 *
 * @param {number} r - Rouge (0-255)
 * @param {number} g - Vert (0-255)
 * @param {number} b - Bleu (0-255)
 * @param {number} a - Alpha (0-1)
 * @returns {string} Format 'rgba(r, g, b, a)'
 *
 * @example
 * toRgba(255, 0, 0, 0.5) // 'rgba(255, 0, 0, 0.50)'
 */
export function toRgba(r, g, b, a) {
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

/**
 * Convertit une couleur Pickr (tableau RGBA) en string CSS.
 *
 * @param {number[]} pickrColor - Tableau [r, g, b, a] retourne par Pickr
 * @returns {string} Format 'rgba(r, g, b, a)'
 *
 * @example
 * pickrToRgba([255.4, 128.2, 0, 0.75]) // 'rgba(255, 128, 0, 0.75)'
 */
export function pickrToRgba(pickrColor) {
    return toRgba(Math.round(pickrColor[0]), Math.round(pickrColor[1]), Math.round(pickrColor[2]), pickrColor[3]);
}
