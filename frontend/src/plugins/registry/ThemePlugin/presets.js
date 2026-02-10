/**
 * presets.js — Données des thèmes prédéfinis et des polices.
 *
 * Fichier de données pures (pas de logique), importé par ThemePlugin.js.
 * Pour ajouter un thème : ajouter une entrée dans PRESETS.
 * Pour ajouter une police : ajouter une entrée dans FONT_PRESETS.
 */

/**
 * Thèmes prédéfinis.
 * Chaque preset est un objet partiel : seules les propriétés qui changent
 * par rapport au thème par défaut (_variables.scss) sont listées.
 *
 * @type {Object<string, { label: string, values: Object<string, string> }>}
 */
export const PRESETS = {
    default: {
        label: 'Dark Violet (défaut)',
        values: {},
    },
    light: {
        label: 'Light',
        values: {
            '--color-bg': '#f0f0f5',
            '--color-surface': '#ffffff',
            '--color-surface-hover': '#e8e8f0',
            '--color-border': '#d0d0dd',
            '--color-text': '#1a1a2e',
            '--color-text-muted': '#666',
            '--color-primary': '#6c63ff',
            '--color-primary-hover': '#5a52d9',
        },
    },
    solarized: {
        label: 'Solarized Dark',
        values: {
            '--color-bg': '#002b36',
            '--color-surface': '#073642',
            '--color-surface-hover': '#094753',
            '--color-border': '#586e75',
            '--color-text': '#eee8d5',
            '--color-text-muted': '#839496',
            '--color-primary': '#268bd2',
            '--color-primary-hover': '#1a6da0',
        },
    },
    candy: {
        label: 'Candy',
        values: {
            '--color-bg': '#fff0f5',
            '--color-surface': '#fff5f8',
            '--color-surface-hover': '#ffe0eb',
            '--color-border': '#f0b0c8',
            '--color-text': '#4a2040',
            '--color-text-muted': '#a06080',
            '--color-primary': '#ff69b4',
            '--color-primary-hover': '#e0509a',
        },
    },
    forest: {
        label: 'Forest',
        values: {
            '--color-bg': '#0a1f0a',
            '--color-surface': '#142814',
            '--color-surface-hover': '#1e3a1e',
            '--color-border': '#2d5a2d',
            '--color-text': '#d0e8c8',
            '--color-text-muted': '#7aaa70',
            '--color-primary': '#4caf50',
            '--color-primary-hover': '#388e3c',
        },
    },
    retro: {
        label: 'Retro Terminal',
        values: {
            '--color-bg': '#0c0c0c',
            '--color-surface': '#1a1a1a',
            '--color-surface-hover': '#2a2a2a',
            '--color-border': '#333333',
            '--color-text': '#33ff33',
            '--color-text-muted': '#1a991a',
            '--color-primary': '#33ff33',
            '--color-primary-hover': '#28cc28',
            '--font-family': '"Courier New", Courier, monospace',
        },
    },
};

/**
 * Polices prédéfinies avec des noms lisibles.
 *
 * @type {Array<{ label: string, value: string }>}
 */
export const FONT_PRESETS = [
    { label: 'Système', value: 'system-ui, -apple-system, sans-serif' },
    { label: 'Monospace', value: '"Courier New", Courier, monospace' },
    { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
    { label: 'Comic Sans', value: '"Comic Sans MS", "Comic Sans", cursive' },
    { label: 'Cursive', value: '"Segoe Script", "Brush Script MT", cursive' },
    { label: 'Pixel', value: '"Lucida Console", Monaco, monospace' },
];
