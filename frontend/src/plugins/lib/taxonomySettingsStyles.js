/**
 * taxonomySettingsStyles.js — CSS pour le settings panel des taxonomies.
 */

export const TAXONOMY_SETTINGS_STYLES = `
    .taxonomy-settings {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm, 8px);
    }

    .taxonomy-settings-title {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: var(--spacing-xs, 4px);
    }

    .taxonomy-settings-terms {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs, 4px);
    }

    .taxonomy-settings-term {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
        background: var(--color-surface-hover);
        border-radius: var(--radius-md, 6px);
    }

    .taxonomy-settings-color {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .taxonomy-settings-label {
        font-size: 0.9rem;
        color: var(--color-text);
    }

    .taxonomy-settings-key {
        font-size: 0.75rem;
        color: var(--color-text-muted);
        margin-left: auto;
    }

    .taxonomy-settings-remove {
        width: 20px;
        height: 20px;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: var(--color-text-muted);
        font-size: 1rem;
        line-height: 1;
        cursor: pointer;
        transition: all 0.15s;
    }
    .taxonomy-settings-remove:hover {
        background: var(--color-danger);
        color: #fff;
    }

    .taxonomy-settings-add {
        display: flex;
        gap: var(--spacing-xs, 4px);
        margin-top: var(--spacing-sm, 8px);
        flex-wrap: wrap;
    }

    .taxonomy-settings-input {
        flex: 1;
        min-width: 100px;
    }

    .taxonomy-settings-color-input {
        width: 36px;
        height: 30px;
        padding: 2px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md, 6px);
        background: var(--color-bg);
        cursor: pointer;
    }
`;
