/**
 * Styles du FileAttachmentPlugin.
 *
 * Préfixe : fap- (File Attachment Plugin)
 *
 * Layout : grille de cards (CSS Grid auto-fill).
 */
export const STYLES = `
/* ---------------------------------------------------------------
   Grille des fichiers
   --------------------------------------------------------------- */

.fap-files-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: var(--spacing-sm, 8px);
    margin-bottom: var(--spacing-md, 12px);
}

.fap-empty {
    grid-column: 1 / -1;
    color: var(--color-text-muted);
    font-size: 0.85rem;
    text-align: center;
    padding: var(--spacing-lg, 20px) 0;
    margin: 0;
}

/* ---------------------------------------------------------------
   Card fichier
   --------------------------------------------------------------- */

.fap-file-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs, 4px);
    padding: var(--spacing-md, 12px) var(--spacing-sm, 8px);
    border-radius: var(--radius-md, 6px);
    border: 1px solid var(--color-border);
    text-align: center;
    transition: background var(--transition-fast, 0.15s),
                border-color var(--transition-fast, 0.15s);
}

.fap-file-item:hover {
    background: var(--color-bg-hover);
    border-color: var(--color-border-hover);
}

.fap-file-icon {
    font-size: 2rem;
    line-height: 1;
    margin-bottom: var(--spacing-xs, 4px);
}

.fap-file-name {
    font-size: 0.8rem;
    font-weight: 500;
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--color-text);
}

.fap-file-size {
    font-size: 0.7rem;
    color: var(--color-text-muted);
}

/* ---------------------------------------------------------------
   Description (éditable inline)
   --------------------------------------------------------------- */

.fap-file-description {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    padding: 1px 0;
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.fap-file-description--editable {
    cursor: pointer;
}

.fap-file-description--editable:hover {
    color: var(--color-text);
}

.fap-file-description--empty {
    font-style: italic;
    opacity: 0.5;
}

.fap-file-description-input {
    font-size: 0.75rem;
    width: 100%;
    padding: 2px 6px;
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-sm, 4px);
    background: var(--color-bg-input, transparent);
    color: var(--color-text);
    outline: none;
    text-align: center;
}

/* ---------------------------------------------------------------
   Boutons d'action
   --------------------------------------------------------------- */

.fap-file-actions {
    display: flex;
    gap: 4px;
    margin-top: auto;
    padding-top: var(--spacing-xs, 4px);
    opacity: 0;
    transition: opacity var(--transition-fast, 0.15s);
}

.fap-file-item:hover .fap-file-actions {
    opacity: 1;
}

.fap-btn {
    border: none;
    background: none;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: var(--radius-sm, 4px);
    font-size: 0.85rem;
    color: var(--color-text-muted);
    transition: background var(--transition-fast, 0.15s),
                color var(--transition-fast, 0.15s);
}

.fap-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
}

.fap-btn--download {
    text-decoration: none;
}

.fap-btn--delete:hover {
    color: var(--color-danger);
}

/* ---------------------------------------------------------------
   Section fichiers dans la modale détail
   --------------------------------------------------------------- */

.fap-detail-section {
    margin-bottom: var(--spacing-md, 12px);
}

.fap-detail-section .fap-files-list {
    margin-top: var(--spacing-sm, 8px);
    margin-bottom: 0;
}

.fap-detail-download {
    margin-top: auto;
    padding-top: var(--spacing-xs, 4px);
}

/* ---------------------------------------------------------------
   Badge sur carte
   --------------------------------------------------------------- */

.fap-badge {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 0.7rem;
    color: var(--color-text-muted);
    padding: 2px 6px;
    border-radius: var(--radius-sm, 4px);
    background: var(--color-bg-hover);
    margin-top: var(--spacing-xs, 4px);
}
`;
