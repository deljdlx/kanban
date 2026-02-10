/**
 * styles.js — CSS injecté par CardColorPlugin.
 *
 * Toutes les classes sont préfixées `ccp-` (card-color-plugin)
 * pour éviter les collisions avec le reste de l'application.
 */

export const STYLES = `
    /* Bouton 🎨 dans la zone d'actions des cartes */
    .ccp-btn {
        width: 28px;
        height: 28px;
        padding: 0;
        border: none;
        border-radius: var(--radius-sm, 4px);
        background: var(--color-surface);
        color: var(--color-text-muted);
        font-size: 12px;
        cursor: pointer;
        opacity: 0.6;
        transition: color 0.15s, background 0.15s, opacity 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .ccp-btn:hover {
        background: var(--color-primary);
        color: #fff;
        opacity: 1;
    }

    /* Champ couleur dans les modales */
    .ccp-modal-field {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
    }
    .ccp-modal-preview {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 2px solid var(--color-border);
        background: var(--color-surface-hover);
        flex-shrink: 0;
    }
    .ccp-modal-btn {
        padding: 4px 12px;
        border: 1px solid var(--color-border);
        border-radius: 6px;
        background: var(--color-surface);
        color: var(--color-text);
        font-size: 0.8rem;
        cursor: pointer;
        transition: background 0.12s, border-color 0.12s;
    }
    .ccp-modal-btn:hover {
        border-color: var(--color-primary);
    }
    .ccp-modal-btn--clear {
        color: var(--color-text-muted);
    }
    .ccp-modal-btn--clear:hover {
        border-color: #e74c3c;
        color: #e74c3c;
    }

    /* Grille de swatches dans le settings panel */
    .ccp-swatches-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 8px 0;
    }
    .ccp-swatch {
        position: relative;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: 2px solid var(--color-border);
        cursor: default;
    }
    .ccp-swatch-remove {
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
    .ccp-swatch:hover .ccp-swatch-remove {
        display: block;
    }
    .ccp-swatch-add {
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-surface-hover);
        color: var(--color-text-muted);
        font-size: 18px;
        cursor: pointer;
        border-style: dashed;
    }
    .ccp-swatch-add:hover {
        border-color: var(--color-primary);
        color: var(--color-primary);
    }
`;
