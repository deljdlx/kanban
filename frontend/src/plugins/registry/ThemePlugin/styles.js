/**
 * styles.js — CSS injecté par ThemePlugin.
 *
 * Toutes les classes sont préfixées `tp-` (theme-plugin)
 * pour éviter les collisions avec le reste de l'application.
 */

export const STYLES = `
    .tp-field {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
    }
    .tp-field .label {
        min-width: 100px;
        margin-bottom: 0;
    }

    /* Preset grid */
    .tp-preset-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        margin-bottom: 12px;
    }
    .tp-preset-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px 4px;
        border: 2px solid var(--color-border);
        border-radius: var(--radius-md, 8px);
        background: none;
        cursor: pointer;
        transition: border-color 0.12s;
    }
    .tp-preset-btn:hover {
        border-color: var(--color-primary);
    }
    .tp-preset-btn--active {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 1px var(--color-primary);
    }
    .tp-preset-preview {
        width: 100%;
        height: 28px;
        border-radius: 4px;
        border: 1px solid;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .tp-preset-name {
        font-size: 0.65rem;
        color: var(--color-text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
    }

    /* Font grid */
    .tp-font-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        margin-bottom: 12px;
    }
    .tp-font-btn {
        padding: 6px 4px;
        border: 2px solid var(--color-border);
        border-radius: var(--radius-md, 8px);
        background: none;
        color: var(--color-text);
        font-size: 0.75rem;
        cursor: pointer;
        transition: border-color 0.12s;
        text-align: center;
    }
    .tp-font-btn:hover {
        border-color: var(--color-primary);
    }
    .tp-font-btn--active {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 1px var(--color-primary);
    }

    /* Color picker */
    .tp-color-preview {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 2px solid var(--color-border);
        flex-shrink: 0;
    }
    .tp-color-btn {
        padding: 4px 12px;
        border: 1px solid var(--color-border);
        border-radius: 6px;
        background: var(--color-surface);
        color: var(--color-text);
        font-size: 0.8rem;
        cursor: pointer;
        transition: border-color 0.12s;
    }
    .tp-color-btn:hover {
        border-color: var(--color-primary);
    }

    /* Range */
    .tp-range {
        flex: 1;
        accent-color: var(--color-primary);
    }
    .tp-value {
        min-width: 45px;
        text-align: right;
        font-size: 0.8rem;
        color: var(--color-text-muted);
        font-variant-numeric: tabular-nums;
    }
`;
