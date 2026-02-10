/**
 * CardColorPlugin — Permet d'attribuer une couleur a chaque carte.
 *
 * Rendu visuel : border-left solide + fond colore avec opacite.
 *
 * Genere via ColorPluginFactory avec les specificites suivantes :
 *   - Persistance dans board.pluginData['card-colors']
 *   - Onglet "Couleur" dans les modales edit/add card
 *   - Bouton palette 🎨 dans chaque carte
 */
import { createColorPlugin, DEFAULT_SWATCHES } from '../../lib/ColorPluginFactory.js';
import { parseColor, toRgba } from '../../lib/colorUtils.js';

export { DEFAULT_SWATCHES };

export default createColorPlugin({
    name: 'card-colors',
    label: 'Couleurs des cartes',
    tags: ['couleur', 'carte'],

    pluginDataKey: 'card-colors',
    swatchesStorageKey: 'kanban:cardColorSwatches',

    elementSelector: '.card[data-id]',
    elementClass: 'card',
    cssPrefix: 'ccp',
    buttonTitle: 'Couleur',

    defaultPickrColor: 'rgba(52, 152, 219, 0.3)',
    modalHooks: true,

    /**
     * Applique une couleur a une carte (bordure gauche + fond avec opacite).
     *
     * @param {HTMLElement} el
     * @param {string} color
     * @param {{ r: number, g: number, b: number, a: number }} parsed
     */
    applyColor(el, color, parsed) {
        const { r, g, b, a } = parsed;
        // Bordure gauche en couleur solide
        el.style.borderLeft = `4px solid ${toRgba(r, g, b, 1)}`;
        // Fond avec l'opacite choisie
        el.style.background = toRgba(r, g, b, a);
    },

    /**
     * Retire la couleur d'une carte.
     *
     * @param {HTMLElement} el
     */
    clearColor(el) {
        el.style.borderLeft = '';
        el.style.background = '';
    },

    /**
     * Le bouton est injecte dans la zone d'actions (.card-actions) de la carte.
     *
     * @param {HTMLElement} el
     * @returns {HTMLElement|null}
     */
    getButtonAnchor(el) {
        return el.querySelector('.card-actions') || el;
    },

    /**
     * Met a jour le style du bouton pour refleter la couleur.
     *
     * @param {HTMLElement} btn
     * @param {string|null} color
     */
    updateButton(btn, color) {
        if (color) {
            const { r, g, b } = parseColor(color);
            btn.style.color = toRgba(r, g, b, 1);
        } else {
            btn.style.color = '';
        }
    },
});
