/**
 * styles.js — CSS injecte par CustomFieldsPlugin.
 *
 * Toutes les classes sont prefixees `cfp-` (custom-fields-plugin)
 * pour eviter les collisions avec le reste de l'application.
 */

export const STYLES = `
    /* =======================================================
     * BADGES SUR LES CARTES
     * ======================================================= */

    .cfp-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        margin-top: 4px;
    }

    .cfp-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 1px 5px;
        font-size: 0.65rem;
        line-height: 1.3;
        color: var(--color-text-muted);
        background: var(--color-surface-hover);
        border-radius: var(--radius-sm, 4px);
        user-select: none;
        max-width: 140px;
        overflow: hidden;
    }

    .cfp-badge-label {
        opacity: 0.7;
        white-space: nowrap;
    }

    .cfp-badge-value {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
    }

    /* =======================================================
     * CARD DETAIL — section champs personnalises
     * ======================================================= */

    .cfp-detail-separator {
        border: none;
        border-top: 1px solid var(--color-border);
        margin: 12px 0 8px;
    }

    .cfp-detail-title {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-text-muted);
        margin: 0 0 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .cfp-detail-field {
        margin-bottom: 6px;
    }

    .cfp-detail-field-label {
        font-size: 0.75rem;
        color: var(--color-text-muted);
        margin-bottom: 2px;
    }

    .cfp-detail-field-value {
        font-size: 0.85rem;
        color: var(--color-text);
    }

    /* =======================================================
     * MODALES — formulaire de champs
     * ======================================================= */

    .cfp-fields-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .cfp-field-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .cfp-field-label {
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--color-text);
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .cfp-field-label-icon {
        opacity: 0.6;
        font-size: 0.75rem;
    }

    .cfp-field-input {
        font-size: 0.85rem;
    }

    .cfp-checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 0.85rem;
        color: var(--color-text);
    }

    .cfp-checkbox-input {
        width: 16px;
        height: 16px;
        cursor: pointer;
    }

    .cfp-url-link {
        color: var(--color-primary);
        text-decoration: none;
        font-size: 0.85rem;
    }
    .cfp-url-link:hover {
        text-decoration: underline;
    }

    /* =======================================================
     * SETTINGS PANEL — gestion des definitions de champs
     * ======================================================= */

    .cfp-settings-list {
        margin-bottom: 16px;
    }

    .cfp-settings-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border-radius: var(--radius-sm, 4px);
        background: var(--color-surface-hover);
        margin-bottom: 4px;
    }

    .cfp-settings-item-icon {
        font-size: 0.85rem;
        opacity: 0.7;
        flex-shrink: 0;
        width: 20px;
        text-align: center;
    }

    .cfp-settings-item-label {
        flex: 1;
        font-size: 0.85rem;
        color: var(--color-text);
    }

    .cfp-settings-item-type {
        font-size: 0.7rem;
        color: var(--color-text-muted);
        padding: 1px 6px;
        background: var(--color-surface);
        border-radius: var(--radius-sm, 4px);
    }

    .cfp-settings-toggle {
        position: relative;
        width: 32px;
        height: 18px;
        background: var(--color-border);
        border-radius: 9px;
        cursor: pointer;
        transition: background 0.2s;
        flex-shrink: 0;
        border: none;
        padding: 0;
    }
    .cfp-settings-toggle.active {
        background: var(--color-primary);
    }
    .cfp-settings-toggle::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 14px;
        height: 14px;
        background: #fff;
        border-radius: 50%;
        transition: transform 0.2s;
    }
    .cfp-settings-toggle.active::after {
        transform: translateX(14px);
    }

    .cfp-settings-edit,
    .cfp-settings-remove {
        flex-shrink: 0;
    }

    /* Formulaire d'edition inline */
    .cfp-settings-edit-form {
        padding: 8px 8px 8px 28px;
        border-left: 2px solid var(--color-primary);
        margin-bottom: 4px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .cfp-settings-edit-actions {
        display: flex;
        gap: 8px;
    }

    .cfp-settings-empty {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        font-style: italic;
        margin: 8px 0;
    }

    /* Formulaire d'ajout */
    .cfp-settings-add {
        border-top: 1px solid var(--color-border);
        padding-top: 12px;
    }

    .cfp-settings-add-title {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--color-text);
        margin: 0 0 8px;
    }

    .cfp-settings-add-row {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
        align-items: flex-end;
    }

    .cfp-settings-add-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
    }

    .cfp-settings-add-field label {
        font-size: 0.75rem;
        color: var(--color-text-muted);
    }

    .cfp-settings-config-zone {
        margin-bottom: 8px;
    }

    /* =======================================================
     * CONFIG — zone de configuration type-specifique
     * ======================================================= */

    .cfp-config-row {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
    }

    .cfp-config-label {
        font-size: 0.75rem;
        color: var(--color-text-muted);
        flex-shrink: 0;
    }

    .cfp-config-input {
        width: 80px;
        font-size: 0.8rem;
    }

    .cfp-config-select-options {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .cfp-config-options-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .cfp-config-option-row {
        display: flex;
        gap: 4px;
        align-items: center;
    }

    .cfp-config-option-row .input {
        flex: 1;
    }

    .cfp-config-option-remove {
        width: 24px;
        height: 24px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm, 4px);
        background: transparent;
        color: var(--color-text-muted);
        font-size: 0.9rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        padding: 0;
    }
    .cfp-config-option-remove:hover {
        border-color: #e74c3c;
        color: #e74c3c;
    }

    .cfp-config-add-option {
        align-self: flex-start;
    }
`;
