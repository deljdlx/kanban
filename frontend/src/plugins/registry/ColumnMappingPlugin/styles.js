/**
 * styles.js — Styles CSS pour le ColumnMappingPlugin.
 *
 * - .mirror-cards-section : séparateur visuel entre cartes locales et miroirs
 * - .card--mirror : carte en lecture seule, atténuée, non interactive
 * - .mirror-badge : petit label indiquant le board source
 */
export const STYLES = `
.mirror-cards-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 6px;
}

/* Carte miroir : fond teinté, bordure pointillée, texte atténué */
.card--mirror {
    opacity: 1;
    cursor: default;
    position: relative;
    border: 1px dashed rgba(var(--color-primary-rgb), 0.4);
    border-left: 3px solid var(--color-primary);
    background: rgba(var(--color-primary-rgb), 0.06);
}
.card--mirror .card-title,
.card--mirror .card-description,
.card--mirror .card-tags,
.card--mirror .card-footer {
    opacity: 0.7;
}

.card--mirror .mirror-badge {
    font-size: 0.7em;
    font-weight: 600;
    color: var(--color-primary);
    opacity: 0.8;
    margin-bottom: 4px;
}

/* Bandeau source dans la modale de détail */
.card-detail-mirror-source {
    font-size: 0.8em;
    font-weight: 500;
    color: var(--color-primary);
    padding: 4px 10px;
    margin-top: 4px;
    background: rgba(var(--color-primary-rgb), 0.1);
    border-radius: 4px;
    display: inline-block;
}

/* Checklist progress dans les miroirs */
.mirror-checklist-progress {
    font-size: 0.8em;
    color: var(--color-text-muted);
    margin-top: 4px;
    opacity: 0.7;
}

/* Custom field badges dans les miroirs */
.mirror-cf-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
    opacity: 0.7;
}
.mirror-cf-badge {
    font-size: 0.75em;
    padding: 1px 6px;
    border-radius: 3px;
    background: var(--color-surface-hover);
    color: var(--color-text-muted);
}

/* Hint plugin manquant */
.mirror-plugin-hint {
    font-size: 0.75em;
    color: var(--color-text-muted);
    font-style: italic;
    margin-top: 8px;
    padding: 4px 8px;
    border-radius: 4px;
    background: var(--color-surface-hover);
}

/* Panel settings — texte de description sous le titre */
.column-mapping-panel .mapping-subtitle {
    font-size: 0.85em;
    color: var(--color-text-muted);
    margin-bottom: 12px;
}

/* Panel settings — séparateur entre liste et formulaire */
.column-mapping-panel .mapping-separator {
    border: none;
    border-top: 1px dashed var(--color-border);
    margin: 12px 0;
}

/* Panel settings — état vide (aucun mapping / aucune colonne) */
.column-mapping-panel .mapping-empty {
    font-size: 0.85em;
    color: var(--color-text-muted);
}

/* Panel settings dans Board Settings */
.column-mapping-panel .mapping-list {
    margin-bottom: 16px;
}

.column-mapping-panel .mapping-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    margin-bottom: 4px;
    font-size: 0.9em;
}

.column-mapping-panel .mapping-item-label {
    flex: 1;
}

.column-mapping-panel .mapping-remove-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    font-size: 1.1em;
    padding: 0 4px;
}

.column-mapping-panel .mapping-remove-btn:hover {
    color: var(--color-danger);
}

.column-mapping-panel .mapping-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
}


.column-mapping-panel .mapping-add-btn {
    align-self: flex-start;
    margin-top: 4px;
}

.column-mapping-panel .mapping-columns {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 8px 0;
}

.column-mapping-panel .mapping-col-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: var(--color-surface-hover);
    border-radius: 4px;
}

.column-mapping-panel .mapping-col-name {
    flex: 1;
    font-weight: 500;
    font-size: 0.9em;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-text);
}

.column-mapping-panel .mapping-col-arrow {
    color: var(--color-text-muted);
    font-size: 0.85em;
}

.column-mapping-panel .mapping-col-target,
.column-mapping-panel .mapping-col-custom-name {
    flex: 1;
}
`;
