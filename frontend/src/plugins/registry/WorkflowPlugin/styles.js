/**
 * styles.js — CSS pour WorkflowPlugin.
 *
 * Styles pour la liste de règles et l'éditeur dans la modale board settings.
 * Cohérent avec le design system de l'application (variables CSS).
 */

export const STYLES = `
/* =========================================================
   1. Liste des règles
   ========================================================= */

.workflow-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--spacing-lg);
}

.workflow-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
}

.workflow-empty {
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    padding: var(--spacing-xl) 0;
}

/* =========================================================
   2. Carte de règle (dans la liste)
   ========================================================= */

.workflow-rule-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: var(--color-bg-secondary, var(--color-bg));
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    transition: border-color var(--transition-fast);
}

.workflow-rule-card:hover {
    border-color: var(--color-primary);
}

.workflow-rule-card--disabled {
    opacity: 0.5;
}

.workflow-rule-card--error {
    border-color: var(--color-error);
}

.workflow-rule-toggle {
    flex-shrink: 0;
}

.workflow-rule-info {
    flex: 1;
    min-width: 0;
    cursor: pointer;
}

.workflow-rule-name {
    font-weight: 600;
    font-size: var(--font-size-base);
    color: var(--color-text);
    margin-bottom: 2px;
}

.workflow-rule-trigger {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
}

.workflow-rule-error-badge {
    font-size: var(--font-size-xs, 11px);
    color: var(--color-error);
    margin-top: 2px;
}

.workflow-rule-actions {
    flex-shrink: 0;
    display: flex;
    gap: var(--spacing-xs);
}


/* =========================================================
   3. Éditeur de règle
   ========================================================= */

.workflow-editor {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
}

.workflow-editor-field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

.workflow-editor-field label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
}


.workflow-ctx-help {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-bg-secondary, var(--color-bg));
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-family: monospace;
    font-size: var(--font-size-xs, 11px);
    color: var(--color-text-muted);
    white-space: pre-line;
    line-height: 1.6;
}

.workflow-codemirror-container {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
    min-height: 150px;
}

.workflow-codemirror-container .cm-editor {
    min-height: 150px;
    font-size: 13px;
}

.workflow-codemirror-container .cm-editor.cm-focused {
    outline: none;
}

.workflow-error-bar {
    padding: var(--spacing-sm) var(--spacing-md);
    background: color-mix(in srgb, var(--color-error) 10%, transparent);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-sm);
    color: var(--color-error);
    font-size: var(--font-size-sm);
    font-family: monospace;
    word-break: break-word;
}

.workflow-editor-buttons {
    display: flex;
    gap: var(--spacing-sm);
    justify-content: flex-end;
    padding-top: var(--spacing-sm);
    border-top: 1px solid var(--color-border);
}

`;
