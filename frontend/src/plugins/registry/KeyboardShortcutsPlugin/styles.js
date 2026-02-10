/**
 * styles.js — CSS pour le plugin KeyboardShortcuts.
 *
 * Toutes les classes sont préfixées `.ksp-` pour éviter les collisions.
 * Utilise les variables du design system (--color-*, --spacing-*, etc.).
 */
export const STYLES = `
    /* =========================================================
     * Description en haut du panneau de réglages
     * ========================================================= */
    .ksp-description {
        font-size: 0.85rem;
        color: var(--color-text-muted);
        margin-bottom: var(--spacing-md, 16px);
        line-height: 1.4;
    }

    /* =========================================================
     * Ligne de raccourci (label + bouton touche)
     * ========================================================= */
    .ksp-shortcut-row {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        padding: var(--spacing-xs, 4px) 0;
    }

    .ksp-shortcut-label {
        flex: 1;
        font-size: 0.9rem;
        color: var(--color-text);
    }

    /* =========================================================
     * Bouton touche (style kbd)
     * ========================================================= */
    .ksp-shortcut-key {
        display: inline-block;
        min-width: 60px;
        padding: 4px 10px;
        font-family: monospace;
        font-size: 0.8rem;
        text-align: center;
        color: var(--color-text);
        background: var(--color-surface-alt);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm, 4px);
        cursor: pointer;
        transition: border-color 0.2s, box-shadow 0.2s;
    }

    .ksp-shortcut-key:hover {
        border-color: var(--color-primary);
    }

    /* =========================================================
     * Mode capture (recording)
     * ========================================================= */
    .ksp-shortcut-key--recording {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.3);
        animation: ksp-pulse 1s ease-in-out infinite;
    }

    @keyframes ksp-pulse {
        0%, 100% { box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.3); }
        50% { box-shadow: 0 0 0 4px rgba(108, 99, 255, 0.15); }
    }

    /* =========================================================
     * Warning de conflit
     * ========================================================= */
    .ksp-shortcut-conflict {
        font-size: 0.75rem;
        color: var(--color-danger);
        padding-left: 0;
        margin-top: 2px;
    }

`;
