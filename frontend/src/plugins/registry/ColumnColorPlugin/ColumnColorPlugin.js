/**
 * ColumnColorPlugin — Permet d'attribuer une couleur de fond a chaque colonne.
 *
 * Rendu visuel : fond colore sur la colonne entiere (opacite choisie),
 * header legerement plus opaque (+0.07).
 *
 * Genere via ColorPluginFactory avec les specificites suivantes :
 *   - Persistance dans board.pluginData['column-colors']
 *   - Bouton palette 🎨 dans le header de chaque colonne
 */
import { createColorPlugin, DEFAULT_SWATCHES } from '../../lib/ColorPluginFactory.js';
import { parseColor, toRgba } from '../../lib/colorUtils.js';

export { DEFAULT_SWATCHES };

export default createColorPlugin({
    name: 'column-colors',
    label: 'Couleurs des colonnes',
    tags: ['couleur', 'colonne'],

    pluginDataKey: 'column-colors',
    swatchesStorageKey: 'kanban:columnColorSwatches',

    elementSelector: '.column[data-id]',
    elementClass: 'column',
    cssPrefix: 'colcp',
    buttonTitle: 'Couleur de la colonne',

    defaultPickrColor: '#3498db',
    modalHooks: false,

    /**
     * Applique une couleur a une colonne (fond + header avec opacite bonus).
     *
     * @param {HTMLElement} el
     * @param {string} color
     * @param {{ r: number, g: number, b: number, a: number }} parsed
     */
    applyColor(el, color, parsed) {
        const { r, g, b, a } = parsed;
        el.style.background = toRgba(r, g, b, a);

        const header = el.querySelector('.column-header');
        if (header) {
            header.style.background = toRgba(r, g, b, Math.min(a + 0.07, 1));
        }
    },

    /**
     * Retire la couleur d'une colonne.
     *
     * @param {HTMLElement} el
     */
    clearColor(el) {
        el.style.background = '';
        const header = el.querySelector('.column-header');
        if (header) {
            header.style.background = '';
        }
    },

    /**
     * Le bouton est injecte dans le header de la colonne.
     *
     * @param {HTMLElement} el
     * @returns {HTMLElement}
     */
    getButtonAnchor(el) {
        return el.querySelector('.column-header');
    },

    /**
     * Met a jour le style du bouton (bordure + couleur + classe active).
     *
     * @param {HTMLElement} btn
     * @param {string|null} color
     */
    updateButton(btn, color) {
        if (color) {
            const { r, g, b } = parseColor(color);
            const solidColor = toRgba(r, g, b, 1);
            btn.classList.add('colcp-btn--active');
            btn.style.borderColor = solidColor;
            btn.style.color = solidColor;
        } else {
            btn.classList.remove('colcp-btn--active');
            btn.style.borderColor = '';
            btn.style.color = '';
        }
    },
});
