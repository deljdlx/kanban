/**
 * styles.js — CSS pour ToastPlugin.
 */

export const STYLES = `
/* =========================================================
   Toast Container
   ========================================================= */

.toast-container {
    position: fixed;
    bottom: var(--spacing-lg);
    right: var(--spacing-lg);
    z-index: 9999;
    display: flex;
    flex-direction: column-reverse;
    gap: var(--spacing-sm);
    pointer-events: none;
}

/* =========================================================
   Toast Item
   ========================================================= */

.toast {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-card);
    pointer-events: auto;
    min-width: 250px;
    max-width: 400px;

    /* Animation */
    opacity: 0;
    transform: translateX(100%);
    transition: opacity var(--transition-normal),
                transform var(--transition-normal);
}

.toast--visible {
    opacity: 1;
    transform: translateX(0);
}

.toast--hiding {
    opacity: 0;
    transform: translateX(50%);
}

/* =========================================================
   Toast Types
   ========================================================= */

.toast--success {
    border-left: 3px solid var(--color-success);
}

.toast--success .toast__icon {
    color: var(--color-success);
}

.toast--error {
    border-left: 3px solid var(--color-danger);
}

.toast--error .toast__icon {
    color: var(--color-danger);
}

.toast--warning {
    border-left: 3px solid var(--color-warning);
}

.toast--warning .toast__icon {
    color: var(--color-warning);
}

.toast--info {
    border-left: 3px solid var(--color-primary);
}

.toast--info .toast__icon {
    color: var(--color-primary);
}

/* =========================================================
   Toast Elements
   ========================================================= */

.toast__icon {
    font-size: 1.1rem;
    font-weight: 700;
    flex-shrink: 0;
    width: 20px;
    text-align: center;
}

.toast__message {
    flex: 1;
    font-size: var(--font-size-sm);
    color: var(--color-text);
    line-height: 1.4;
}

.toast__close {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    padding: 0;
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    font-size: 1.2rem;
    line-height: 1;
    cursor: pointer;
    transition: color var(--transition-fast),
                background var(--transition-fast);
}

.toast__close:hover {
    color: var(--color-text);
    background: var(--color-surface-hover);
}

/* =========================================================
   Responsive
   ========================================================= */

@media (max-width: 480px) {
    .toast-container {
        left: var(--spacing-sm);
        right: var(--spacing-sm);
        bottom: var(--spacing-sm);
    }

    .toast {
        min-width: auto;
        max-width: none;
    }
}

/* =========================================================
   Toast Settings Panel (tsp-)
   ========================================================= */

.tsp-description {
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
}

.tsp-group {
    margin-bottom: var(--spacing-md);
}

.tsp-group__label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: var(--spacing-xs);
    padding-bottom: var(--spacing-xs);
    border-bottom: 1px solid var(--color-border);
}

.tsp-help {
    margin-bottom: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-surface-hover);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    line-height: 1.6;
}

.tsp-help code {
    background: var(--color-surface);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: var(--font-size-xs);
    color: var(--color-primary);
}

.tsp-event {
    padding: var(--spacing-xs) 0;
}

.tsp-template {
    margin-top: var(--spacing-xs);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
}

.tsp-template:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

`;
