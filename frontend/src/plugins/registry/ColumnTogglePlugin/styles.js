/**
 * styles.js — Styles CSS du ColumnTogglePlugin.
 *
 * Structure DOM :
 *   div.coltoggle-dropdown [.coltoggle-dropdown--open]
 *     button.coltoggle-dropdown-trigger
 *     div.coltoggle-dropdown-panel
 *       div.coltoggle-dropdown-list
 *         label.coltoggle-dropdown-item  (xN)
 *           input[type=checkbox]
 *           span
 *       button.coltoggle-dropdown-reset
 */
export const STYLES = /* css */ `

/* ---------------------------------------------------------------
   Colonne masquée
   --------------------------------------------------------------- */
.coltoggle-hidden {
    display: none !important;
}

/* ---------------------------------------------------------------
   Dropdown container
   --------------------------------------------------------------- */
.coltoggle-dropdown {
    position: relative;
}

/* ---------------------------------------------------------------
   Trigger button
   --------------------------------------------------------------- */
.coltoggle-dropdown-trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
    font-size: 0.85rem;
    white-space: nowrap;
    transition: background 0.15s, border-color 0.15s;
}

.coltoggle-dropdown-trigger:hover {
    background: var(--color-surface-hover);
    border-color: var(--color-text-muted);
}

/* Badge quand des colonnes sont masquées */
.coltoggle-dropdown-trigger--active {
    border-color: var(--color-primary);
    color: var(--color-primary);
    font-weight: 600;
}

/* ---------------------------------------------------------------
   Panel (dropdown body)
   --------------------------------------------------------------- */
.coltoggle-dropdown-panel {
    display: none;
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 200px;
    max-height: 320px;
    overflow-y: auto;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    z-index: 100;
    padding: 8px 0;
}

.coltoggle-dropdown--open .coltoggle-dropdown-panel {
    display: block;
}

/* ---------------------------------------------------------------
   List & items
   --------------------------------------------------------------- */
.coltoggle-dropdown-list {
    padding: 0 8px;
}

.coltoggle-dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--color-text);
    transition: background 0.1s;
}

.coltoggle-dropdown-item:hover {
    background: var(--color-surface-hover);
}

.coltoggle-dropdown-item input[type="checkbox"] {
    margin: 0;
    cursor: pointer;
    accent-color: var(--color-primary);
}

.coltoggle-dropdown-item--disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.coltoggle-dropdown-item--disabled input[type="checkbox"] {
    cursor: not-allowed;
}

/* ---------------------------------------------------------------
   Reset button
   --------------------------------------------------------------- */
.coltoggle-dropdown-reset {
    display: block;
    width: calc(100% - 16px);
    margin: 8px 8px 4px;
    padding: 6px;
    border: none;
    border-top: 1px solid var(--color-border);
    background: none;
    color: var(--color-primary);
    font-size: 0.8rem;
    cursor: pointer;
    text-align: center;
    border-radius: 4px;
    transition: background 0.1s;
}

.coltoggle-dropdown-reset:hover {
    background: var(--color-surface-hover);
}

.coltoggle-dropdown-reset:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}
`;
