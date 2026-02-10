/**
 * styles.js — CSS injecté par SnowflakeCursorPlugin.
 *
 * Toutes les classes sont préfixées `scp-` (snowflake-cursor-plugin)
 * pour éviter les collisions avec le reste de l'application.
 */

export const STYLES = `
    /* Champ de réglage (ligne label + input + valeur) */
    .scp-field {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
    }
    .scp-label {
        min-width: 90px;
        font-size: 0.85rem;
        color: var(--color-text);
    }
    .scp-range {
        flex: 1;
        accent-color: var(--color-primary);
    }
    .scp-value {
        min-width: 65px;
        text-align: right;
        font-size: 0.8rem;
        color: var(--color-text-muted);
        font-variant-numeric: tabular-nums;
    }
    .scp-color-preview {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 2px solid var(--color-border);
        flex-shrink: 0;
    }
`;
