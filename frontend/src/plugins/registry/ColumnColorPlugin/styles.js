/**
 * styles.js — CSS injecte par ColumnColorPlugin.
 *
 * Toutes les classes sont prefixees `colcp-` (column-color-plugin)
 * pour eviter les collisions avec le reste de l'application.
 */

export const STYLES = `
    /* Bouton palette dans le header de colonne */
    .colcp-btn {
        width: 24px;
        height: 24px;
        padding: 0;
        border: 1px solid var(--color-border);
        border-radius: 50%;
        background: var(--color-surface);
        color: var(--color-text-muted);
        font-size: 12px;
        cursor: pointer;
        transition: transform 0.15s, border-color 0.15s, background 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .colcp-btn:hover {
        transform: scale(1.1);
        border-color: var(--color-primary);
        background: var(--color-surface-hover);
    }

    /* Grille de swatches dans le settings panel */
    .colcp-swatches-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 8px 0;
    }
    .colcp-swatch {
        position: relative;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: 2px solid var(--color-border);
        cursor: default;
    }
    .colcp-swatch-remove {
        display: none;
        position: absolute;
        top: -6px;
        right: -6px;
        width: 16px;
        height: 16px;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: #e74c3c;
        color: #fff;
        font-size: 11px;
        line-height: 16px;
        text-align: center;
        cursor: pointer;
        z-index: 1;
    }
    .colcp-swatch:hover .colcp-swatch-remove {
        display: block;
    }
    .colcp-swatch-add {
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-surface-hover);
        color: var(--color-text-muted);
        font-size: 18px;
        cursor: pointer;
        border-style: dashed;
    }
    .colcp-swatch-add:hover {
        border-color: var(--color-primary);
        color: var(--color-primary);
    }
`;
