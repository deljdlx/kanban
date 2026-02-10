/**
 * appMode — Flag de mode applicatif (solo vs multi-utilisateur).
 *
 * En mode "solo", un seul utilisateur local est émulé côté front.
 * Configurable via la variable d'environnement VITE_APP_MODE.
 */

/**
 * Mode applicatif courant.
 * @type {'solo'|'multi'}
 */
// export const APP_MODE = import.meta.env.VITE_APP_MODE || 'solo';

export const APP_MODE = import.meta.env.VITE_APP_MODE || 'multi';

/**
 * Indique si l'application est en mode solo-offline (un seul utilisateur local).
 *
 * @returns {boolean}
 */
export function isSoloMode() {
    return APP_MODE === 'solo';
}
