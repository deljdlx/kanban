/**
 * styles.js — CSS pour PomodoroPlugin.
 *
 * Styles pour :
 *   1. Le formulaire de création dans la modal (durées + label)
 *   2. L'affichage du timer dans les cartes
 *   3. Les animations (pulse quand actif, couleur quand terminé)
 *
 * Convention : toutes les classes sont préfixées `pomo-`
 */

export const STYLES = `
/* =========================================================
   1. Formulaire Modal (panel de création)
   ========================================================= */

.pomo-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.pomo-form__intro {
    color: var(--color-text-muted);
    font-size: 14px;
    margin: 0;
}

.pomo-form .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.pomo-form label {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
}

.pomo-form__durations {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
}

.pomo-form__radio {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 400;
    color: var(--color-text);
    transition: border-color 0.15s, background 0.15s;
}

.pomo-form__radio:hover {
    border-color: var(--color-primary);
    background: rgba(74, 144, 217, 0.05);
}

.pomo-form__radio:has(input:checked) {
    border-color: var(--color-primary);
    background: rgba(74, 144, 217, 0.1);
    font-weight: 500;
}

.pomo-form__radio input[type="radio"] {
    accent-color: var(--color-primary);
}

.pomo-form__submit {
    align-self: flex-start;
    margin-top: 8px;
}

/* =========================================================
   2. Widget Pomodoro (carte)
   ========================================================= */

.card--pomodoro {
    padding: 12px !important;
}

.pomo-widget {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 8px;
}

.pomo-widget__label {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.pomo-widget__time {
    font-size: 48px;
    font-weight: 700;
    font-family: 'Courier New', Courier, monospace;
    color: var(--color-text);
    min-width: 120px;
    text-align: center;
    user-select: none;
    transition: color 0.3s;
}

.pomo-widget__controls {
    display: flex;
    gap: 12px;
    margin-top: 4px;
}

.pomo-widget__btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
}

.pomo-widget__btn:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: rgba(74, 144, 217, 0.1);
}

.pomo-widget__btn:active {
    transform: scale(0.95);
}

/* =========================================================
   3. États visuels
   ========================================================= */

/* Timer en cours : animation pulse sur le temps */
.pomo-widget--running .pomo-widget__time {
    animation: pomo-pulse 1.5s ease-in-out infinite;
    color: var(--color-primary);
}

@keyframes pomo-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}

/* Timer terminé : couleur success */
.pomo-widget--completed .pomo-widget__time {
    color: var(--color-success);
}

.pomo-widget--completed .pomo-widget__btn:first-child:hover {
    border-color: var(--color-success);
    color: var(--color-success);
    background: rgba(40, 167, 69, 0.1);
}

/* =========================================================
   4. Vue détail (modal)
   ========================================================= */

.pomo-widget--detail {
    padding: 40px;
    gap: 16px;
}

.pomo-widget--detail .pomo-widget__label {
    font-size: 18px;
}

.pomo-widget--detail .pomo-widget__time {
    font-size: 96px;
    min-width: 240px;
}

.pomo-widget--detail .pomo-widget__btn {
    width: 56px;
    height: 56px;
    font-size: 26px;
    border-width: 3px;
}

.pomo-widget--detail .pomo-widget__controls {
    gap: 24px;
    margin-top: 16px;
}
`;
