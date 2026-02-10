/**
 * PickrHelper.js — Helpers pour la creation et gestion de Pickr.
 *
 * Centralise les patterns communs d'utilisation de Pickr :
 *   - Configuration standard du picker
 *   - Gestion des callbacks (change, save, clear, hide)
 *   - Destruction propre de l'instance
 *
 * Utilise par CardColorPlugin, ColumnColorPlugin, et autres plugins couleur.
 */
import { isPickrReady } from './PickrLoader.js';
import { pickrToRgba } from './colorUtils.js';

/**
 * Configuration par defaut du Pickr.
 * @type {Object}
 */
const DEFAULT_CONFIG = {
    theme: 'nano',
    position: 'bottom-middle',
    useAsButton: true,
    components: {
        preview: true,
        opacity: true,
        hue: true,
        interaction: {
            hex: true,
            rgba: true,
            input: true,
            clear: true,
            save: true,
        },
    },
};

/**
 * Configuration pour un picker de swatch (sans opacity, sans clear).
 * @type {Object}
 */
const SWATCH_CONFIG = {
    theme: 'nano',
    position: 'bottom-middle',
    useAsButton: true,
    components: {
        preview: true,
        opacity: false,
        hue: true,
        interaction: {
            hex: true,
            input: true,
            save: true,
        },
    },
};

/**
 * Cree une instance Pickr avec la configuration standard.
 *
 * @param {Object} options
 * @param {HTMLElement} options.anchor - Element d'ancrage du picker
 * @param {string} options.defaultColor - Couleur initiale
 * @param {string[]} [options.swatches] - Liste des swatches
 * @param {Function} [options.onChange] - Callback sur changement (recoit cssColor)
 * @param {Function} [options.onSave] - Callback sur save (recoit cssColor ou null)
 * @param {Function} [options.onClear] - Callback sur clear
 * @param {Function} [options.onHide] - Callback sur hide
 * @returns {Object|null} Instance Pickr ou null si pas pret
 */
export function createColorPickr({ anchor, defaultColor, swatches = [], onChange, onSave, onClear, onHide }) {
    if (!isPickrReady()) {
        console.warn('PickrHelper: Pickr pas encore charge.');
        return null;
    }

    const pickr = Pickr.create({
        ...DEFAULT_CONFIG,
        el: anchor,
        default: defaultColor,
        swatches,
    });

    if (onChange) {
        pickr.on('change', (color) => {
            onChange(pickrToRgba(color.toRGBA()));
        });
    }

    if (onSave) {
        pickr.on('save', (color, instance) => {
            const cssColor = color ? pickrToRgba(color.toRGBA()) : null;
            onSave(cssColor);
            instance.hide();
        });
    }

    if (onClear) {
        pickr.on('clear', onClear);
    }

    if (onHide) {
        pickr.on('hide', onHide);
    }

    return pickr;
}

/**
 * Cree une instance Pickr pour selectionner un swatch (hex, sans opacity).
 *
 * @param {Object} options
 * @param {HTMLElement} options.anchor - Element d'ancrage du picker
 * @param {string} [options.defaultColor='#3498db'] - Couleur initiale
 * @param {Function} options.onSave - Callback sur save (recoit hex string)
 * @param {Function} [options.onHide] - Callback sur hide
 * @returns {Object|null} Instance Pickr ou null si pas pret
 */
export function createSwatchPickr({ anchor, defaultColor = '#3498db', onSave, onHide }) {
    if (!isPickrReady()) {
        console.warn('PickrHelper: Pickr pas encore charge.');
        return null;
    }

    const pickr = Pickr.create({
        ...SWATCH_CONFIG,
        el: anchor,
        default: defaultColor,
    });

    pickr.on('save', (color, instance) => {
        if (color) {
            onSave(color.toHEXA().toString());
        }
        instance.hide();
    });

    if (onHide) {
        pickr.on('hide', onHide);
    }

    return pickr;
}

/**
 * Detruit proprement une instance Pickr.
 *
 * @param {Object|null} pickr - Instance a detruire
 */
export function destroyPickr(pickr) {
    if (pickr) {
        pickr.destroyAndRemove();
    }
}
