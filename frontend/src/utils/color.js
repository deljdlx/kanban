/**
 * color.js — Utilitaires de conversion de couleurs.
 *
 * Fonctions partagées pour convertir les couleurs hex (#rrggbb)
 * utilisées dans les configs (taxonomies, etc.) vers des formats
 * exploitables en CSS (rgb, rgba).
 */

/**
 * Convertit une couleur hex (#rrggbb) en composantes RGB.
 *
 * Principe : la couleur hex est un entier 24 bits (RRGGBB).
 * On décale les bits vers la droite pour isoler chaque canal,
 * puis on masque avec 255 (0xFF) pour ne garder que 8 bits.
 *
 *   #3a7bff → 0x3a7bff
 *   R = (0x3a7bff >> 16) & 0xff = 0x3a = 58
 *   G = (0x3a7bff >>  8) & 0xff = 0x7b = 123
 *   B =  0x3a7bff        & 0xff = 0xff = 255
 *
 * @param {string} hex - Couleur au format "#rrggbb"
 * @returns {{ r: number, g: number, b: number }}
 */
export function hexToRgb(hex) {
    const int = parseInt(hex.slice(1), 16);
    return {
        r: (int >> 16) & 255,
        g: (int >> 8) & 255,
        b: int & 255,
    };
}

/**
 * Convertit une couleur hex en string `rgba(r, g, b, alpha)`.
 *
 * Raccourci utilisé partout pour appliquer une couleur de tag
 * en fond semi-transparent.
 *
 * @param {string} hex   - Couleur au format "#rrggbb"
 * @param {number} alpha - Opacité entre 0 et 1
 * @returns {string} Ex: "rgba(58, 123, 255, 0.2)"
 */
export function hexToRgba(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
