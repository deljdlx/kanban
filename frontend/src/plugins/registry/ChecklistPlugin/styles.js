/**
 * styles.js — CSS pour ChecklistPlugin.
 *
 * Styles pour :
 *   1. Le formulaire de création dans la modal
 *   2. L'affichage de la checklist dans les cartes
 */

export const STYLES = `
/* =========================================================
   1. Formulaire Modal
   ========================================================= */

.checklist-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.checklist-form__intro {
    color: var(--color-text-muted);
    font-size: 14px;
    margin: 0;
}

.checklist-form__items {
    font-family: inherit;
    line-height: 1.5;
}

.checklist-form__submit {
    align-self: flex-start;
    margin-top: 8px;
}

/* =========================================================
   2. Carte Checklist (widget)
   ========================================================= */

.card--checklist {
    padding: 12px !important;
}

.checklist-widget {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.checklist-widget__title {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.checklist-widget__progress {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-muted);
    padding: 4px 0;
    position: relative;
}

.checklist-widget__progress::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    width: var(--progress, 0%);
    background: var(--color-primary);
    border-radius: 1px;
    transition: width 0.3s ease;
}

.checklist-widget__progress--complete {
    color: var(--color-success);
}

.checklist-widget__progress--complete::after {
    background: var(--color-success);
}

.checklist-widget__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 200px;
    overflow-y: auto;
}

.checklist-widget__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    border-radius: 4px;
    transition: background 0.15s ease;
}

.checklist-widget__item:hover {
    background: var(--color-bg-hover);
}

.checklist-widget__item:hover .checklist-widget__delete {
    opacity: 1;
}

.checklist-widget__checkbox {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--color-primary);
}

.checklist-widget__label {
    flex: 1;
    font-size: 13px;
    color: var(--color-text);
    word-break: break-word;
}

.checklist-widget__item--checked .checklist-widget__label {
    text-decoration: line-through;
    color: var(--color-text-muted);
}

.checklist-widget__delete {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    border: none;
    background: none;
    color: var(--color-text-muted);
    font-size: 16px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease, color 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
}

.checklist-widget__delete:hover {
    color: var(--color-danger);
    background: rgba(220, 53, 69, 0.1);
}

/* Zone d'ajout */
.checklist-widget__add {
    display: flex;
    gap: 4px;
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px solid var(--color-border);
}

.checklist-widget__add-input {
    flex: 1;
}

.checklist-widget__add-btn {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
}

.checklist-widget__add-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: rgba(74, 144, 217, 0.1);
}

/* =========================================================
   3. Vue détail (modal)
   ========================================================= */

.checklist-widget--detail {
    padding: 20px;
    gap: 16px;
    max-width: 500px;
    margin: 0 auto;
}

.checklist-widget--detail .checklist-widget__title {
    font-size: 20px;
}

.checklist-widget--detail .checklist-widget__progress {
    font-size: 16px;
    padding: 8px 0;
}

.checklist-widget--detail .checklist-widget__list {
    max-height: 400px;
    gap: 8px;
}

.checklist-widget--detail .checklist-widget__item {
    padding: 8px 12px;
    font-size: 15px;
}

.checklist-widget--detail .checklist-widget__checkbox {
    width: 20px;
    height: 20px;
}

.checklist-widget--detail .checklist-widget__add-input {
    padding: 10px 12px;
    font-size: 14px;
}

.checklist-widget--detail .checklist-widget__add-btn {
    width: 36px;
    height: 36px;
    font-size: 20px;
}
`;
