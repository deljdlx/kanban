/**
 * styles.js — CSS pour BoardStatsPlugin.
 */

export const STYLES = `
/* =========================================================
   1. Formulaire Modal
   ========================================================= */

.boardstats-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.boardstats-form__intro {
    color: var(--color-text-muted);
    font-size: 14px;
    margin: 0;
}

.boardstats-form__submit {
    align-self: flex-start;
    margin-top: 8px;
}

/* =========================================================
   2. Carte Stats (widget)
   ========================================================= */

.card--boardstats {
    padding: 12px !important;
    background: linear-gradient(135deg,
        var(--color-surface) 0%,
        var(--color-bg) 100%) !important;
}

.boardstats-widget {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.boardstats-widget__error {
    color: var(--color-text-muted);
    font-size: 12px;
    text-align: center;
    margin: 0;
}

/* Header avec total */
.boardstats-widget__header {
    display: flex;
    align-items: baseline;
    gap: 6px;
}

.boardstats-widget__total {
    font-size: 32px;
    font-weight: 700;
    color: var(--color-primary);
    line-height: 1;
}

.boardstats-widget__label {
    font-size: 14px;
    color: var(--color-text-muted);
}

/* Barre de progression globale */
.boardstats-widget__progress {
    position: relative;
    height: 24px;
    background: var(--color-bg);
    border-radius: 12px;
    overflow: hidden;
}

.boardstats-widget__progress-bar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: linear-gradient(90deg,
        var(--color-success) 0%,
        var(--color-success-light) 100%);
    border-radius: 12px;
    transition: width 0.3s ease;
}

.boardstats-widget__progress-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text);
    text-shadow: 0 0 2px rgba(255, 255, 255, 0.8);
}

/* Répartition par colonne */
.boardstats-widget__columns {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.boardstats-widget__column {
    display: grid;
    grid-template-columns: 1fr auto 60px;
    align-items: center;
    gap: 8px;
    font-size: 11px;
}

.boardstats-widget__column-name {
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.boardstats-widget__column-count {
    font-weight: 600;
    color: var(--color-text-muted);
    min-width: 20px;
    text-align: right;
}

.boardstats-widget__column-bar {
    height: 6px;
    background: var(--color-bg);
    border-radius: 3px;
    overflow: hidden;
}

.boardstats-widget__column-bar-fill {
    height: 100%;
    background: var(--color-primary);
    border-radius: 3px;
    transition: width 0.3s ease;
}

/* =========================================================
   3. Vue détail (modal)
   ========================================================= */

.boardstats-widget--detail {
    padding: 20px;
    gap: 20px;
}

.boardstats-widget--detail .boardstats-widget__total {
    font-size: 56px;
}

.boardstats-widget--detail .boardstats-widget__label {
    font-size: 18px;
}

.boardstats-widget--detail .boardstats-widget__progress {
    height: 32px;
    border-radius: 16px;
}

.boardstats-widget--detail .boardstats-widget__progress-label {
    font-size: 14px;
}

.boardstats-widget--detail .boardstats-widget__column {
    font-size: 14px;
    gap: 12px;
    grid-template-columns: 1fr auto 120px;
}

.boardstats-widget--detail .boardstats-widget__column-bar {
    height: 10px;
    border-radius: 5px;
}

.card-detail-panel--widget {
    display: flex;
    align-items: center;
    justify-content: center;
}
`;
