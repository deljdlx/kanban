/**
 * PickrLoader — Chargement unique et partagé de la librairie Pickr.
 *
 * Pickr est un color picker léger chargé dynamiquement depuis /pickr/.
 * Les fichiers sont dans `vendor/pickr/`, servis à la racine via Vite publicDir.
 *
 * Ce module garantit que le JS et le CSS ne sont chargés qu'une seule fois,
 * même si plusieurs plugins appellent `loadPickr()` en parallèle.
 *
 * Usage dans un plugin :
 *
 *   import { loadPickr, isPickrReady } from '../../lib/PickrLoader.js';
 *
 *   // Au install() — lance le chargement en arrière-plan
 *   loadPickr().then(() => { ... });
 *
 *   // Avant d'ouvrir un picker — vérification synchrone
 *   if (!isPickrReady()) return;
 *   Pickr.create({ ... });
 */

/** @type {string} Chemin du JS Pickr (servi depuis vendor/ via Vite publicDir) */
const PICKR_JS_URL = '/pickr/pickr.min.js';

/** @type {string} Chemin du CSS thème nano de Pickr */
const PICKR_CSS_URL = '/pickr/nano.min.css';

/**
 * Promesse de chargement mise en cache.
 * null tant que loadPickr() n'a pas été appelé.
 * @type {Promise<void>|null}
 */
let _loadPromise = null;

/** @type {boolean} true quand Pickr est chargé et disponible sur window */
let _ready = false;

/**
 * Charge un fichier CSS en injectant un <link> dans le <head>.
 * Ne charge pas deux fois le même URL.
 *
 * @param {string} url
 * @returns {Promise<void>}
 */
function loadCSS(url) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`link[href="${url}"]`)) {
            resolve();
            return;
        }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        link.onload = () => resolve();
        link.onerror = () => reject(new Error('PickrLoader : impossible de charger ' + url));
        document.head.appendChild(link);
    });
}

/**
 * Charge un fichier JS en injectant un <script> dans le <head>.
 * Ne charge pas deux fois le même URL.
 *
 * @param {string} url
 * @returns {Promise<void>}
 */
function loadScript(url) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('PickrLoader : impossible de charger ' + url));
        document.head.appendChild(script);
    });
}

/**
 * Charge Pickr (JS + CSS) une seule fois.
 *
 * Les appels suivants retournent la même promesse déjà résolue.
 * Après résolution, `window.Pickr` est disponible et `isPickrReady()` retourne true.
 *
 * @returns {Promise<void>}
 */
export function loadPickr() {
    if (!_loadPromise) {
        _loadPromise = Promise.all([loadScript(PICKR_JS_URL), loadCSS(PICKR_CSS_URL)]).then(() => {
            _ready = true;
        });
    }
    return _loadPromise;
}

/**
 * Vérifie de façon synchrone si Pickr est chargé et utilisable.
 *
 * Utile avant d'appeler `Pickr.create()` pour éviter une erreur
 * si le chargement n'est pas encore terminé.
 *
 * @returns {boolean}
 */
export function isPickrReady() {
    return _ready && typeof Pickr !== 'undefined';
}
