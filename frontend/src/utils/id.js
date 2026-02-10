/**
 * id.js — Factory centralisée de génération d'IDs.
 *
 * Tous les IDs d'entités (board, col, card, comment, img, note, rule, etc.)
 * passent par `generateId(prefix)`. En mode offline, utilise crypto.randomUUID().
 *
 * Pour brancher un backend qui fournit ses propres IDs :
 *   setIdGenerator((prefix) => fetchIdFromServer(prefix))
 *
 * @example
 * import { generateId } from '../utils/id.js';
 * const cardId = generateId('card');   // → 'card-a1b2c3d4'
 * const colId  = generateId('col');    // → 'col-e5f67890'
 */

/**
 * Génère un identifiant court (8 caractères hex-like via UUID).
 *
 * @param {string} prefix - Préfixe de l'entité (ex: 'card', 'col', 'board')
 * @returns {string}
 */
let _generator = (prefix) => {
    const uuid = crypto.randomUUID().slice(0, 8);
    return prefix ? `${prefix}-${uuid}` : uuid;
};

/**
 * Génère un ID unique pour une entité.
 *
 * @param {string} [prefix=''] - Préfixe du type d'entité
 * @returns {string}
 */
export function generateId(prefix = '') {
    return _generator(prefix);
}

/**
 * Remplace le générateur d'IDs (pour brancher un backend).
 *
 * @param {function(string): string} generator
 */
export function setIdGenerator(generator) {
    _generator = generator;
}
