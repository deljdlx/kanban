/**
 * styles.js — CSS pour la palette de commandes.
 *
 * Toutes les classes sont préfixées `.cp-` pour éviter les collisions.
 * Utilise les variables du design system (--color-*, --spacing-*, etc.).
 */
export const STYLES = `
    /* =========================================================
     * Overlay plein écran (fond semi-transparent)
     * ========================================================= */
    .cp-overlay {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(0, 0, 0, 0.55);
        display: none;
    }

    .cp-overlay--visible {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding-top: 20vh;
    }

    /* =========================================================
     * Panel central
     * ========================================================= */
    .cp-panel {
        width: 100%;
        max-width: 560px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg, 12px);
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    /* =========================================================
     * Header (input de recherche)
     * ========================================================= */
    .cp-header {
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        border-bottom: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
    }

    .cp-search-icon {
        color: var(--color-text-muted);
        font-size: var(--font-size-lg, 1.1rem);
        flex-shrink: 0;
    }

    .cp-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--color-text);
        font-size: var(--font-size-md, 0.95rem);
        font-family: var(--font-family, system-ui, -apple-system, sans-serif);
        padding: var(--spacing-sm, 8px) 0;
    }

    .cp-input::placeholder {
        color: var(--color-text-muted);
    }

    /* =========================================================
     * Liste de résultats
     * ========================================================= */
    .cp-results {
        max-height: 400px;
        overflow-y: auto;
        padding: var(--spacing-xs, 4px) 0;
    }

    .cp-result {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        cursor: pointer;
        transition: background var(--transition-fast, 120ms ease);
    }

    .cp-result:hover,
    .cp-result--active {
        background: var(--color-surface-hover);
    }

    .cp-result-icon {
        flex-shrink: 0;
        width: 20px;
        text-align: center;
        color: var(--color-text-muted);
        font-size: var(--font-size-sm, 0.85rem);
    }

    .cp-result-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    .cp-result-label {
        color: var(--color-text);
        font-size: var(--font-size-md, 0.95rem);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .cp-result-description {
        color: var(--color-text-muted);
        font-size: var(--font-size-xs, 0.75rem);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* =========================================================
     * État vide
     * ========================================================= */
    .cp-empty {
        padding: var(--spacing-lg, 24px) var(--spacing-md, 16px);
        text-align: center;
        color: var(--color-text-muted);
        font-size: var(--font-size-sm, 0.85rem);
    }

    /* =========================================================
     * Hints (raccourcis clavier en bas)
     * ========================================================= */
    .cp-hints {
        display: flex;
        gap: var(--spacing-md, 16px);
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        border-top: 1px solid var(--color-border);
        flex-wrap: wrap;
    }

    .cp-hint {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-xs, 4px);
        color: var(--color-text-muted);
        font-size: var(--font-size-xs, 0.75rem);
    }

    .cp-hint kbd {
        display: inline-block;
        padding: 1px 5px;
        background: var(--color-bg);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm, 4px);
        font-family: var(--font-family, system-ui, -apple-system, sans-serif);
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--color-text-muted);
        line-height: 1.4;
    }
`;
