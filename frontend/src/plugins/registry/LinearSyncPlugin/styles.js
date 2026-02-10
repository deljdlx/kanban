/**
 * styles.js — CSS du LinearSyncPlugin.
 *
 * Prefixe : lsync- pour eviter les collisions.
 * Utilise les CSS variables du design system (--spacing-*, --font-size-*, etc.)
 */

export const STYLES = `
/* ---------------------------------------------------------------
   Bouton sync dans le header
   --------------------------------------------------------------- */

.lsync-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 18px;
    cursor: pointer;
    transition: background var(--transition-fast), transform var(--transition-fast);
}

.lsync-btn:hover {
    background: var(--color-surface-hover);
}

.lsync-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

@keyframes lsync-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}

.lsync-btn--syncing {
    animation: lsync-spin 1s linear infinite;
}

/* ---------------------------------------------------------------
   Panneau settings
   --------------------------------------------------------------- */

.lsync-settings {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
}

.lsync-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
}

.lsync-section-title {
    margin: 0;
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
}

.lsync-row {
    display: flex;
    gap: var(--spacing-sm);
    align-items: center;
}

.lsync-row .input {
    flex: 1;
}

/* ---------------------------------------------------------------
   Tableau de mapping states → colonnes
   --------------------------------------------------------------- */

.lsync-mapping-table {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.lsync-mapping-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) 0;
}

.lsync-state-label {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 160px;
    font-size: var(--font-size-xs);
    color: var(--color-text);
}

.lsync-state-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
}

.lsync-arrow {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    flex-shrink: 0;
}

.lsync-col-select {
    flex: 1;
    min-width: 140px;
}

/* ---------------------------------------------------------------
   Divers
   --------------------------------------------------------------- */

.lsync-last-sync {
    margin: var(--spacing-xs) 0 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
}

.lsync-error {
    color: var(--color-danger);
    font-size: var(--font-size-xs);
    margin: var(--spacing-xs) 0;
}
`;
