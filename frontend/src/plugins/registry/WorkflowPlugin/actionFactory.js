/**
 * actionFactory — Construit l'objet `actions` injecté dans le code utilisateur.
 *
 * Chaque méthode est une mutation encapsulée : elle retrouve les instances
 * model nécessaires, effectue l'opération, et déclenche les hooks associés.
 *
 * Toutes les mutations sont exécutées dans le contexte 'automation'
 * par le WorkflowPlugin (via withContext). L'actionFactory ne gère pas
 * le contexte lui-même.
 */
/** @type {string} Clé dans board.pluginData pour les couleurs de cartes (CardColorPlugin) */
const CARD_COLORS_KEY = 'card-colors';

/**
 * Construit l'objet actions pour une exécution de règle.
 *
 * @param {import('../../HookRegistry.js').default} hooks - HookRegistry
 * @param {import('../../../models/Board.js').default} board - Board courant
 * @returns {Object} API de mutation disponible dans le code utilisateur
 */
export function buildActions(hooks, board) {
    return {
        /**
         * Déplace une carte vers une colonne cible (identifiée par son titre).
         * Cherche la carte dans toutes les colonnes, puis la déplace.
         *
         * @param {string} cardId - Id de la carte à déplacer
         * @param {string} targetColumnTitle - Titre de la colonne cible
         */
        moveCard(cardId, targetColumnTitle) {
            const result = board.getCardById(cardId);
            if (!result) {
                console.warn(`[Workflow] moveCard : carte "${cardId}" introuvable`);
                return;
            }

            const toColumn = board.getColumnByTitle(targetColumnTitle);
            if (!toColumn) {
                console.warn(`[Workflow] moveCard : colonne "${targetColumnTitle}" introuvable`);
                return;
            }

            if (result.column.id === toColumn.id) return;

            board.moveCard(cardId, result.column.id, toColumn.id, toColumn.count);
            // Auto-save via board 'change' event (debounced 300ms)
        },

        /**
         * Attribue une couleur à une carte.
         * Écrit dans board.pluginData (même source que CardColorPlugin).
         *
         * @param {string} cardId - Id de la carte
         * @param {string} color - Couleur CSS (hex, rgba, etc.)
         */
        setCardColor(cardId, color) {
            const colors = { ...(board.pluginData[CARD_COLORS_KEY] || {}) };
            colors[cardId] = color;
            board.setPluginData(CARD_COLORS_KEY, colors);
        },

        /**
         * Retire la couleur d'une carte.
         *
         * @param {string} cardId - Id de la carte
         */
        removeCardColor(cardId) {
            const colors = { ...(board.pluginData[CARD_COLORS_KEY] || {}) };
            delete colors[cardId];
            board.setPluginData(CARD_COLORS_KEY, colors);
        },

        /**
         * Affiche un toast de notification.
         *
         * @param {string} message - Message à afficher
         * @param {string} [type='info'] - Type : 'info', 'success', 'warning', 'error'
         */
        toast(message, type = 'info') {
            hooks.doAction('toast:show', { message, type });
        },

        /**
         * Log dans la console avec préfixe [Workflow].
         *
         * @param {...*} args - Arguments à logger
         */
        log(...args) {
            console.log('[Workflow]', ...args);
        },
    };
}
