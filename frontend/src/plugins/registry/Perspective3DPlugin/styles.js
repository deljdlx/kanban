/**
 * styles.js — CSS pour Perspective3DPlugin.
 */

export const STYLES = `
    /* Container avec perspective */
    #board-container {
        overflow: visible;
    }

    /* Board en mode 3D */
    .board {
        transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    }

    /* Colonnes en mode 3D */
    .p3d-column-hover .column {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        /* Note: preserve-3d retiré car interfère avec SortableJS */
    }

    /* Cartes en mode 3D */
    .p3d-card-hover .card {
        transition: transform 0.25s ease, box-shadow 0.25s ease;
        /* Note: preserve-3d retiré des cartes car interfère avec SortableJS */
    }

    /*
     * Fix critique : force transform-style: flat sur column-body
     * pour que SortableJS puisse calculer correctement les hit-zones.
     * L'effet 3D global vient du .board (rotateX/Y), pas des enfants.
     */
    .p3d-card-hover .column-body,
    .p3d-column-hover .column-body {
        transform-style: flat !important;
    }

    /* Évite les conflits de z-index pendant le hover */
    .p3d-card-hover .card,
    .p3d-column-hover .column {
        position: relative;
    }

    /* Styles du settings panel */
    .p3d-settings {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md, 12px);
    }

    .p3d-setting {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs, 4px);
    }

    .p3d-setting-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .p3d-setting-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--color-text);
    }

    .p3d-setting-value {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        font-family: monospace;
    }

    .p3d-slider {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: var(--color-border);
        outline: none;
        -webkit-appearance: none;
        cursor: pointer;
    }

    .p3d-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--color-primary);
        cursor: pointer;
        transition: transform 0.15s;
    }

    .p3d-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
    }

    .p3d-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--color-primary);
        cursor: pointer;
        border: none;
    }

    .p3d-divider {
        height: 1px;
        background: var(--color-border);
        margin: var(--spacing-xs, 4px) 0;
    }

    .p3d-preset-row {
        display: flex;
        gap: var(--spacing-xs, 4px);
        flex-wrap: wrap;
    }

`;
