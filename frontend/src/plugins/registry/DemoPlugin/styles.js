/**
 * styles.js — CSS injecté par DemoPlugin.
 *
 * Toutes les classes sont préfixées `demo-` pour éviter
 * les collisions avec le reste de l'application.
 *
 * Le timestamp s'affiche en bas de chaque carte, discret (petit + grisé).
 */

export const STYLES = `
    .demo-timestamp {
        display: block;
        font-size: 0.7rem;
        color: var(--color-text-muted);
        margin-top: 4px;
        opacity: 0.7;
    }
`;
