/**
 * styles.js — CSS pour ClickCounterPlugin.
 *
 * Styles pour :
 *   1. Le formulaire de création dans la modal
 *   2. L'affichage du compteur dans les cartes
 *
 * Convention : toutes les variables CSS suivent le pattern --color-*
 */

export const STYLES = `
/* =========================================================
   1. Formulaire Modal (panel de création)
   ========================================================= */

.counter-widget-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.counter-widget-intro {
    color: var(--color-text-muted);
    font-size: 14px;
    margin: 0;
}

.counter-widget-form .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.counter-widget-form label {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
}

.counter-widget-form__submit {
    align-self: flex-start;
    margin-top: 8px;
}

/* =========================================================
   2. Carte Compteur (widget)
   ========================================================= */

.card--counter {
    padding: 12px !important;
}

.counter-widget {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 8px;
}

.counter-widget__label {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.counter-widget__value {
    font-size: 48px;
    font-weight: 700;
    color: var(--color-text);
    cursor: pointer;
    user-select: none;
    min-width: 80px;
    text-align: center;
    transition: transform 0.15s ease;
}

.counter-widget__value:hover {
    color: var(--color-primary);
}

.counter-widget__value--bump {
    transform: scale(1.15);
}

.counter-widget__controls {
    display: flex;
    gap: 12px;
    margin-top: 4px;
}

.counter-widget__btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 20px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
}

.counter-widget__btn:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: rgba(74, 144, 217, 0.1);
}

.counter-widget__btn:active {
    transform: scale(0.95);
}

.counter-widget__btn--plus:hover {
    border-color: var(--color-success);
    color: var(--color-success);
    background: rgba(40, 167, 69, 0.1);
}

.counter-widget__btn--minus:hover {
    border-color: var(--color-danger);
    color: var(--color-danger);
    background: rgba(220, 53, 69, 0.1);
}

/* =========================================================
   3. Vue détail (modal)
   ========================================================= */

.counter-widget--detail {
    padding: 40px;
    gap: 16px;
}

.counter-widget--detail .counter-widget__label {
    font-size: 18px;
}

.counter-widget--detail .counter-widget__value {
    font-size: 96px;
}

.counter-widget--detail .counter-widget__btn {
    width: 56px;
    height: 56px;
    font-size: 28px;
    border-width: 3px;
}

.counter-widget--detail .counter-widget__controls {
    gap: 24px;
    margin-top: 16px;
}
`;
