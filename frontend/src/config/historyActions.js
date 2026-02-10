/**
 * historyActions.js — Registre central des actions d'historique.
 *
 * Source de vérité unique pour l'affichage des entrées de l'historique.
 * Pour ajouter un nouveau type d'action :
 *   1. Ajouter une clé ici
 *   2. Appeler card.record('ma_action', ...) dans le modèle concerné
 *   → La vue se met à jour automatiquement, pas de map à modifier.
 *
 * Chaque action déclare :
 *   - label(who)   : texte affiché dans la timeline (ex: "Alice a créé le ticket")
 *   - dotModifier  : suffixe CSS pour la pastille (→ .card-detail-timeline-dot--xxx)
 */

/** @type {Object<string, { label: function(string): string, dotModifier: string }>} */
const HISTORY_ACTIONS = {
    created: {
        label: (who) => `${who} a créé le ticket`,
        dotModifier: 'created',
    },
    updated: {
        label: (who) => `${who} a modifié le ticket`,
        dotModifier: 'updated',
    },
    commented: {
        label: (who) => `${who} a commenté le ticket`,
        dotModifier: 'commented',
    },
    comment_edited: {
        label: (who) => `${who} a modifié un commentaire`,
        dotModifier: 'commented',
    },
    moved: {
        label: (who) => `${who} a déplacé le ticket`,
        dotModifier: 'moved',
    },
    reordered: {
        label: (who) => `${who} a réordonné le ticket`,
        dotModifier: 'moved',
    },
};

/**
 * Labels français pour les champs de changement affichés dans le détail.
 * Utilisé par la vue pour afficher "Colonne : X → Y" au lieu de "column : X → Y".
 *
 * @type {Object<string, string>}
 */
export const CHANGE_FIELD_LABELS = {
    title: 'Titre',
    description: 'Description',
    assignee: 'Assigné à',
    tags: 'Tags',
    comment: 'Commentaire',
    column: 'Colonne',
    position: 'Position',
};

/**
 * Retourne la config d'une action, ou un fallback générique.
 *
 * @param {string} action
 * @returns {{ label: function(string): string, dotModifier: string }}
 */
export function getActionConfig(action) {
    return (
        HISTORY_ACTIONS[action] || {
            label: (who) => `${who} — ${action}`,
            dotModifier: 'updated',
        }
    );
}

export default HISTORY_ACTIONS;
