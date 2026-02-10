/**
 * effects.js — Registres des effets d'animation.
 *
 * Quatre registres indépendants :
 * - EFFECTS             — modales (enter + exit)
 * - CARD_DROP_EFFECTS   — drop de carte inter-colonne
 * - COLUMN_ENTER_EFFECTS — stagger des colonnes à l'ouverture d'un board
 * - CARD_ENTER_EFFECTS   — stagger des cartes à l'ouverture d'un board
 *
 * Pour ajouter un effet : ajouter une entrée dans le registre concerné.
 * Le label est affiché dans le <select> du panneau de settings.
 *
 * IMPORTANT : ne pas définir de callbacks (onComplete, etc.) ici.
 * Le plugin les ajoute via spread au moment de l'animation.
 */

/** Durée de l'animation d'entrée (ms). */
export const ENTER_DURATION = 350;

/** Durée de l'animation de sortie (ms). */
export const EXIT_DURATION = 200;

/** Nom de l'effet par défaut. */
export const DEFAULT_EFFECT = 'pop';

/**
 * Registre des effets disponibles pour les modales.
 *
 * @type {Object.<string, {label: string, enter: Object, exit: Object}>}
 */
export const EFFECTS = {
    pop: {
        label: 'Pop',
        enter: {
            opacity: [0, 1],
            scale: [0.75, 1],
            duration: ENTER_DURATION,
            ease: 'outBack',
        },
        exit: {
            opacity: [1, 0],
            scale: [1, 0.75],
            duration: EXIT_DURATION,
            ease: 'inBack',
        },
    },

    fade: {
        label: 'Fondu',
        enter: {
            opacity: [0, 1],
            duration: ENTER_DURATION,
            ease: 'outQuart',
        },
        exit: {
            opacity: [1, 0],
            duration: EXIT_DURATION,
            ease: 'inQuart',
        },
    },

    'slide-up': {
        label: 'Glissement haut',
        enter: {
            opacity: [0, 1],
            translateY: [40, 0],
            duration: ENTER_DURATION,
            ease: 'outQuart',
        },
        exit: {
            opacity: [1, 0],
            translateY: [0, 40],
            duration: EXIT_DURATION,
            ease: 'inQuart',
        },
    },

    'slide-down': {
        label: 'Glissement bas',
        enter: {
            opacity: [0, 1],
            translateY: [-40, 0],
            duration: ENTER_DURATION,
            ease: 'outQuart',
        },
        exit: {
            opacity: [1, 0],
            translateY: [0, -40],
            duration: EXIT_DURATION,
            ease: 'inQuart',
        },
    },

    zoom: {
        label: 'Zoom',
        enter: {
            opacity: [0, 1],
            scale: [0, 1],
            duration: ENTER_DURATION,
            ease: 'outQuart',
        },
        exit: {
            opacity: [1, 0],
            scale: [1, 0],
            duration: EXIT_DURATION,
            ease: 'inQuart',
        },
    },

    flip: {
        label: 'Flip',
        enter: {
            opacity: [0, 1],
            rotateX: [90, 0],
            duration: ENTER_DURATION,
            ease: 'outQuart',
        },
        exit: {
            opacity: [1, 0],
            rotateX: [0, 90],
            duration: EXIT_DURATION,
            ease: 'inQuart',
        },
    },
};

// ---------------------------------------------------------------
// Effets de drop de carte (inter-colonne)
// ---------------------------------------------------------------

/** Nom de l'effet de drop par défaut. */
export const DEFAULT_CARD_DROP_EFFECT = 'none';

/**
 * Registre des effets disponibles pour le drop de carte.
 *
 * Chaque effet définit les propriétés anime.js à appliquer sur
 * l'élément DOM de la carte après un déplacement inter-colonne.
 * Le label est affiché dans le <select> du panneau de settings.
 *
 * @type {Object.<string, {label: string, animation: Object}>}
 */
export const CARD_DROP_EFFECTS = {
    none: {
        label: 'Aucun',
        animation: null,
    },

    pop: {
        label: 'Pop',
        animation: {
            scale: [0.6, 1],
            opacity: [0, 1],
            duration: 500,
            ease: 'outBack',
        },
    },

    glow: {
        label: 'Flash',
        animation: {
            boxShadow: [
                '0 0 0px rgba(59, 130, 246, 0)',
                '0 0 20px rgba(59, 130, 246, 0.8)',
                '0 0 0px rgba(59, 130, 246, 0)',
            ],
            duration: 650,
            ease: 'outQuart',
        },
    },

    bounce: {
        label: 'Rebond',
        animation: {
            translateY: [-35, 0],
            opacity: [0, 1],
            duration: 650,
            ease: 'outBounce',
        },
    },
};

// ---------------------------------------------------------------
// Effets d'entrée des colonnes (stagger à l'ouverture du board)
// ---------------------------------------------------------------

/** Nom de l'effet d'entrée des colonnes par défaut. */
export const DEFAULT_COLUMN_ENTER_EFFECT = 'cascade';

/**
 * Registre des effets d'entrée des colonnes.
 *
 * Chaque effet définit les propriétés anime.js à appliquer sur
 * les éléments `.column` à l'ouverture d'un board, avec un stagger
 * entre colonnes. Le label est affiché dans le <select> du panneau
 * de settings.
 *
 * @type {Object.<string, {label: string, animation: Object|null, staggerDelay: number}>}
 */
export const COLUMN_ENTER_EFFECTS = {
    none: {
        label: 'Aucun',
        animation: null,
        staggerDelay: 0,
    },

    cascade: {
        label: 'Cascade',
        animation: {
            opacity: [0, 1],
            translateY: [30, 0],
            duration: 400,
            ease: 'outQuart',
        },
        staggerDelay: 80,
    },

    pop: {
        label: 'Pop',
        animation: {
            opacity: [0, 1],
            scale: [0.85, 1],
            duration: 400,
            ease: 'outBack',
        },
        staggerDelay: 80,
    },

    'slide-left': {
        label: 'Glissement gauche',
        animation: {
            opacity: [0, 1],
            translateX: [60, 0],
            duration: 450,
            ease: 'outQuart',
        },
        staggerDelay: 80,
    },

    fade: {
        label: 'Fondu',
        animation: {
            opacity: [0, 1],
            duration: 400,
            ease: 'outQuart',
        },
        staggerDelay: 100,
    },
};

// ---------------------------------------------------------------
// Effets d'entrée des cartes (stagger à l'ouverture du board)
// ---------------------------------------------------------------

/** Nom de l'effet d'entrée des cartes par défaut. */
export const DEFAULT_CARD_ENTER_EFFECT = 'cascade';

/**
 * Registre des effets d'entrée des cartes.
 *
 * Chaque effet définit les propriétés anime.js à appliquer sur
 * les éléments `.card` à l'ouverture d'un board, avec un stagger
 * colonne par colonne. Le label est affiché dans le <select>
 * du panneau de settings.
 *
 * @type {Object.<string, {label: string, animation: Object|null, staggerDelay: number}>}
 */
export const CARD_ENTER_EFFECTS = {
    none: {
        label: 'Aucun',
        animation: null,
        staggerDelay: 0,
    },

    cascade: {
        label: 'Cascade',
        animation: {
            opacity: [0, 1],
            translateY: [40, 0],
            duration: 600,
            ease: 'outQuart',
        },
        staggerDelay: 50,
    },

    pop: {
        label: 'Pop',
        animation: {
            opacity: [0, 1],
            scale: [0.7, 1],
            duration: 600,
            ease: 'outBack',
        },
        staggerDelay: 50,
    },

    rise: {
        label: 'Élévation',
        animation: {
            opacity: [0, 1],
            translateY: [80, 0],
            scale: [0.9, 1],
            duration: 800,
            ease: 'outQuart',
        },
        staggerDelay: 40,
    },
};
