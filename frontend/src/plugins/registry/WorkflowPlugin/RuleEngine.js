/**
 * RuleEngine — Compilation et exécution sandboxée des règles workflow.
 *
 * Le code utilisateur est wrappé dans un `new Function` avec des paramètres
 * nommés (ctx, actions, board). Le mode strict est forcé pour empêcher
 * l'accès à `window` via `this`. Les objets ctx et board sont gelés
 * (Object.freeze) pour éviter les mutations accidentelles.
 *
 * Limitations connues :
 *   - Le code utilisateur peut toujours accéder au prototype chain
 *     (ex: arguments.callee.constructor). C'est acceptable en solo-offline
 *     car l'utilisateur exécute son propre code.
 *   - Pas de protection contre les boucles infinies (nécessiterait un Worker).
 *
 * Séparé du plugin principal pour garder la logique d'exécution testable
 * et isolée de l'orchestration.
 */

/**
 * Compile le code d'une règle en une Function exécutable.
 *
 * Le code est préfixé par 'use strict' pour empêcher l'accès à `window`
 * via `this` (en strict mode, `this` est `undefined` dans une fonction).
 *
 * @param {Object} rule - Règle à compiler
 * @param {string} rule.code - Code JavaScript de la règle
 * @returns {Function} Fonction (ctx, actions, board) => void
 * @throws {SyntaxError} Si le code contient une erreur de syntaxe
 */
export function compileRule(rule) {
    return new Function('ctx', 'actions', 'board', `'use strict';\n${rule.code}`);
}

/**
 * Gèle récursivement un objet (1 niveau de profondeur).
 * Empêche les mutations accidentelles par le code utilisateur.
 *
 * @param {Object} obj
 * @returns {Object} L'objet gelé (même référence)
 */
function deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') return obj;

    Object.freeze(obj);

    for (const value of Object.values(obj)) {
        if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
            Object.freeze(value);
        }
    }

    return obj;
}

/**
 * Exécute une règle compilée avec son contexte.
 *
 * Les objets ctx et boardInfo sont gelés avant passage au code utilisateur.
 * Les erreurs d'exécution sont capturées et retournées (pas de throw).
 * Cela permet au plugin d'afficher l'erreur dans l'UI sans crasher
 * le reste de l'application.
 *
 * @param {Function} compiledFn - Fonction compilée par compileRule()
 * @param {Object} ctx          - Payload sanitizé du hook (plain objects)
 * @param {Object} actions      - API de mutation (moveCard, toast, etc.)
 * @param {Object} boardInfo    - Infos read-only du board
 * @returns {{ ok: boolean, error?: Error }}
 */
export function executeRule(compiledFn, ctx, actions, boardInfo) {
    try {
        compiledFn(deepFreeze(ctx), actions, deepFreeze(boardInfo));
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err };
    }
}
