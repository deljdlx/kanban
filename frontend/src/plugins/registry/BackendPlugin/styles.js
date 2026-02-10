/**
 * Styles pour le BackendPlugin.
 */

export const STYLES = `
.backend-settings {
    padding: 1rem;
}

.backend-settings .settings-section-title {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    font-weight: 600;
}

.backend-settings .settings-description {
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
    color: var(--color-text-muted);
}

.backend-settings .backend-form-group {
    margin-bottom: 1rem;
}

.backend-settings .backend-form-label {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
}

.backend-settings .backend-test-result {
    margin-top: 0.5rem;
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
}

.backend-settings .backend-test-result--success {
    background-color: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
}

.backend-settings .backend-test-result--error {
    background-color: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
}

.sync-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    border-radius: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
}

.sync-indicator__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: block;
}

.sync-indicator__label {
    font-weight: 500;
    color: var(--color-text-muted);
}
`;
