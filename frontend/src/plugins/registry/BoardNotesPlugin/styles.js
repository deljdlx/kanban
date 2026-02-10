/**
 * styles.js — CSS pour BoardNotesPlugin.
 *
 * Design épuré et cohérent avec le reste de l'application.
 */

export const STYLES = `
/* =========================================================
   1. Indicateur Header
   ========================================================= */

.board-notes-indicator {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.board-notes-indicator:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
}

.board-notes-indicator--has-notes {
    border-color: var(--color-primary);
    color: var(--color-text);
}

.board-notes-indicator-icon {
    font-size: 1rem;
    line-height: 1;
}

.board-notes-indicator-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: var(--color-primary);
    color: white;
    font-size: 0.7rem;
    font-weight: 700;
    border-radius: 10px;
}

/* =========================================================
   2. Panneau Notes
   ========================================================= */

.board-notes-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
}

.board-notes-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
}

.board-notes-empty {
    text-align: center;
    padding: var(--spacing-xl) var(--spacing-lg);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    font-style: italic;
    margin: 0;
    background: var(--color-bg);
    border-radius: var(--radius-md);
    border: 1px dashed var(--color-border);
}

/* =========================================================
   3. Note Card
   ========================================================= */

.board-notes-item {
    background: var(--color-surface-hover);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    transition: border-color var(--transition-fast),
                box-shadow var(--transition-fast);
}

.board-notes-item:hover {
    border-color: var(--color-primary);
}

.board-notes-item-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
}

.board-notes-item-title {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
    line-height: 1.3;
}

.board-notes-item-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    flex-shrink: 0;
}

.board-notes-item-author {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-primary);
}

.board-notes-item-date {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    white-space: nowrap;
}

.board-notes-item-content {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin: 0 0 var(--spacing-sm) 0;
    line-height: 1.5;
    white-space: pre-wrap;
}

.board-notes-item-actions {
    display: flex;
    gap: var(--spacing-sm);
    padding-top: var(--spacing-sm);
    border-top: 1px solid var(--color-border);
}

.board-notes-item-edit,
.board-notes-item-delete {
    padding: var(--spacing-xs) var(--spacing-md);
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.board-notes-item-edit {
    color: var(--color-primary);
    border-color: var(--color-primary);
}

.board-notes-item-edit:hover {
    background: var(--color-primary);
    color: white;
}

.board-notes-item-delete {
    color: var(--color-text-muted);
}

.board-notes-item-delete:hover {
    background: var(--color-danger);
    border-color: var(--color-danger);
    color: white;
}

/* =========================================================
   4. Éditeur de note
   ========================================================= */

.board-notes-editor-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
    padding-bottom: var(--spacing-md);
    border-bottom: 1px solid var(--color-border);
}

.board-notes-editor-title {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
}

.board-notes-editor-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
}

.board-notes-editor-content {
    min-height: 200px;
    resize: vertical;
    line-height: 1.6;
}

.board-notes-editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-sm);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--color-border);
}
`;
