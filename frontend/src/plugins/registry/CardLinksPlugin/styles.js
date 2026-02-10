/**
 * styles.js — CSS injecté par CardLinksPlugin.
 *
 * Toutes les classes sont préfixées `clp-` (card-links-plugin)
 * pour éviter les collisions avec le reste de l'application.
 */

export const STYLES = `
    /* Badge 🔗 N en bas de carte */
    .clp-badge {
        display: inline-block;
        padding: 2px 6px;
        margin-top: 4px;
        font-size: 0.7rem;
        color: var(--color-text-muted);
        background: var(--color-surface-hover);
        border-radius: var(--radius-sm, 4px);
        user-select: none;
    }

    /* Pulsation du highlight */
    @keyframes clp-pulse {
        0%   { box-shadow: 0 0 0 2px var(--color-primary), 0 0 4px  var(--color-primary); }
        50%  { box-shadow: 0 0 0 3px var(--color-primary), 0 0 12px var(--color-primary); }
        100% { box-shadow: 0 0 0 2px var(--color-primary), 0 0 4px  var(--color-primary); }
    }

    /* Highlight au survol : box-shadow violet avec pulsation */
    .card.clp-highlight {
        animation: clp-pulse 1.2s ease-in-out infinite;
    }

    /* Container liste des liens dans la modal */
    .clp-links-list {
        margin-bottom: 12px;
    }

    /* Ligne : titre + bouton retirer */
    .clp-link-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 8px;
        border-radius: var(--radius-sm, 4px);
        background: var(--color-surface-hover);
        margin-bottom: 4px;
        font-size: 0.85rem;
        color: var(--color-text);
    }

    /* Bouton "Retirer" */
    .clp-remove-btn {
        padding: 2px 8px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm, 4px);
        background: transparent;
        color: var(--color-text-muted);
        font-size: 0.75rem;
        cursor: pointer;
        transition: color 0.12s, border-color 0.12s;
    }
    .clp-remove-btn:hover {
        border-color: #e74c3c;
        color: #e74c3c;
    }

    /* Input de recherche */
    .clp-search-input {
        width: 100%;
        margin-bottom: 8px;
    }

    /* Container résultats (scrollable) */
    .clp-search-results {
        max-height: 200px;
        overflow-y: auto;
    }

    /* Résultat cliquable */
    .clp-search-item {
        padding: 6px 8px;
        border-radius: var(--radius-sm, 4px);
        font-size: 0.85rem;
        color: var(--color-text);
        cursor: pointer;
        transition: background 0.12s, color 0.12s;
    }
    .clp-search-item:hover {
        background: var(--color-surface-hover);
        color: var(--color-primary);
    }

    /* Message "Aucun lien" / "Aucune carte trouvée" */
    .clp-empty-message {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        font-style: italic;
        margin: 4px 0;
    }

    /* Titre de section dans le panel */
    .clp-section-title {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--color-text);
        margin: 0 0 8px;
    }
`;
