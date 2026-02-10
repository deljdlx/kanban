/**
 * styles.js — CSS pour le rendu Markdown.
 *
 * Applique un style coherent aux elements Markdown rendus.
 * Toutes les classes sont prefixees `mdp-` (markdown-plugin).
 */

export const STYLES = `
    /* Conteneur avec rendu Markdown */
    .mdp-rendered {
        line-height: 1.5;
    }

    /* Supprime les marges sur le premier/dernier enfant */
    .mdp-rendered > *:first-child {
        margin-top: 0;
    }
    .mdp-rendered > *:last-child {
        margin-bottom: 0;
    }

    /* Paragraphes */
    .mdp-rendered p {
        margin: 0.5em 0;
    }

    /* Titres (rarement utilises dans les descriptions, mais supportes) */
    .mdp-rendered h1,
    .mdp-rendered h2,
    .mdp-rendered h3,
    .mdp-rendered h4,
    .mdp-rendered h5,
    .mdp-rendered h6 {
        margin: 0.75em 0 0.5em;
        font-weight: 600;
        line-height: 1.3;
    }
    .mdp-rendered h1 { font-size: 1.4em; }
    .mdp-rendered h2 { font-size: 1.25em; }
    .mdp-rendered h3 { font-size: 1.1em; }
    .mdp-rendered h4,
    .mdp-rendered h5,
    .mdp-rendered h6 { font-size: 1em; }

    /* Gras, italique, barre */
    .mdp-rendered strong,
    .mdp-rendered b {
        font-weight: 600;
    }
    .mdp-rendered em,
    .mdp-rendered i {
        font-style: italic;
    }
    .mdp-rendered del,
    .mdp-rendered s {
        text-decoration: line-through;
        opacity: 0.7;
    }

    /* Listes */
    .mdp-rendered ul,
    .mdp-rendered ol {
        margin: 0.5em 0;
        padding-left: 1.5em;
    }
    .mdp-rendered li {
        margin: 0.25em 0;
    }

    /* Blockquote */
    .mdp-rendered blockquote {
        margin: 0.5em 0;
        padding: 0.5em 1em;
        border-left: 3px solid var(--color-primary);
        background: var(--color-surface-hover);
        border-radius: 0 4px 4px 0;
    }
    .mdp-rendered blockquote p {
        margin: 0;
    }

    /* Code inline */
    .mdp-rendered code {
        padding: 0.15em 0.4em;
        background: var(--color-surface-hover);
        border-radius: 3px;
        font-family: 'Fira Code', 'Consolas', monospace;
        font-size: 0.9em;
    }

    /* Bloc de code */
    .mdp-rendered pre {
        margin: 0.5em 0;
        padding: 0.75em 1em;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        overflow-x: auto;
    }
    .mdp-rendered pre code {
        padding: 0;
        background: none;
        font-size: 0.85em;
    }

    /* =========================================================
     * Coloration syntaxique (highlight.js - theme sombre custom)
     * ========================================================= */
    .mdp-rendered .hljs {
        color: #abb2bf;
    }
    /* Commentaires */
    .mdp-rendered .hljs-comment,
    .mdp-rendered .hljs-quote {
        color: #5c6370;
        font-style: italic;
    }
    /* Mots-cles (function, const, let, if, return, etc.) */
    .mdp-rendered .hljs-keyword,
    .mdp-rendered .hljs-selector-tag,
    .mdp-rendered .hljs-addition {
        color: #c678dd;
    }
    /* Chaines de caracteres */
    .mdp-rendered .hljs-string,
    .mdp-rendered .hljs-meta .hljs-string,
    .mdp-rendered .hljs-regexp,
    .mdp-rendered .hljs-selector-attr,
    .mdp-rendered .hljs-selector-pseudo {
        color: #98c379;
    }
    /* Nombres */
    .mdp-rendered .hljs-number,
    .mdp-rendered .hljs-literal {
        color: #d19a66;
    }
    /* Noms de fonctions, methodes */
    .mdp-rendered .hljs-title,
    .mdp-rendered .hljs-section,
    .mdp-rendered .hljs-name,
    .mdp-rendered .hljs-selector-id,
    .mdp-rendered .hljs-selector-class {
        color: #61afef;
    }
    /* Attributs, proprietes */
    .mdp-rendered .hljs-attr,
    .mdp-rendered .hljs-attribute,
    .mdp-rendered .hljs-variable,
    .mdp-rendered .hljs-template-variable {
        color: #e06c75;
    }
    /* Types, classes */
    .mdp-rendered .hljs-type,
    .mdp-rendered .hljs-built_in,
    .mdp-rendered .hljs-class .hljs-title {
        color: #e5c07b;
    }
    /* Tags HTML/XML */
    .mdp-rendered .hljs-tag {
        color: #e06c75;
    }
    /* Symboles, operateurs */
    .mdp-rendered .hljs-symbol,
    .mdp-rendered .hljs-bullet,
    .mdp-rendered .hljs-link {
        color: #56b6c2;
    }
    /* Meta, preprocesseur */
    .mdp-rendered .hljs-meta {
        color: #61afef;
    }
    /* Suppressions (diff) */
    .mdp-rendered .hljs-deletion {
        color: #e06c75;
        background: rgba(224, 108, 117, 0.15);
    }
    /* Ajouts (diff) */
    .mdp-rendered .hljs-addition {
        color: #98c379;
        background: rgba(152, 195, 121, 0.15);
    }
    /* Emphase */
    .mdp-rendered .hljs-emphasis {
        font-style: italic;
    }
    .mdp-rendered .hljs-strong {
        font-weight: bold;
    }

    /* Liens */
    .mdp-rendered a {
        color: var(--color-primary);
        text-decoration: none;
    }
    .mdp-rendered a:hover {
        text-decoration: underline;
    }

    /* Images */
    .mdp-rendered img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
    }

    /* Tables */
    .mdp-rendered table {
        width: 100%;
        margin: 0.5em 0;
        border-collapse: collapse;
        font-size: 0.9em;
    }
    .mdp-rendered th,
    .mdp-rendered td {
        padding: 0.4em 0.6em;
        border: 1px solid var(--color-border);
        text-align: left;
    }
    .mdp-rendered th {
        background: var(--color-surface-hover);
        font-weight: 600;
    }

    /* Ligne horizontale */
    .mdp-rendered hr {
        margin: 1em 0;
        border: none;
        border-top: 1px solid var(--color-border);
    }

    /* =========================================================
     * Diagrammes Mermaid
     * ========================================================= */
    .mdp-mermaid {
        margin: 0.5em 0;
        padding: 1em;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        overflow-x: auto;
        text-align: center;
    }
    .mdp-mermaid svg {
        max-width: 100%;
        height: auto;
    }
    .mdp-mermaid-error {
        color: var(--color-danger);
        font-size: 0.85em;
        margin: 0;
        text-align: left;
    }

    /* =========================================================
     * Images IndexedDB (placeholders et erreurs)
     * ========================================================= */
    .mdp-image {
        margin: 0.5em 0;
        padding: 1em;
        background: var(--color-surface);
        border: 1px dashed var(--color-border);
        border-radius: 6px;
        text-align: center;
        color: var(--color-text-muted);
        font-size: 0.85em;
    }
    .mdp-image--error {
        color: var(--color-danger);
        border-color: var(--color-danger);
    }

    /* Style specifique pour les descriptions de cartes (plus compact) */
    .card-description.mdp-rendered {
        font-size: 0.85em;
    }
    .card-description.mdp-rendered p {
        margin: 0.25em 0;
    }
    .card-description.mdp-rendered ul,
    .card-description.mdp-rendered ol {
        margin: 0.25em 0;
        padding-left: 1.2em;
    }
`;
