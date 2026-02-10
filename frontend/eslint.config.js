/**
 * ESLint flat config — regles de qualite de code.
 *
 * Philosophie : detecter les erreurs, pas imposer un style.
 * Le style est gere par Prettier (voir .prettierrc).
 *
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 */
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
    // Regles recommandees ESLint (erreurs courantes, bonnes pratiques)
    js.configs.recommended,

    // Desactive les regles ESLint qui conflictent avec Prettier
    eslintConfigPrettier,

    {
        // Cible uniquement les sources JS du projet
        files: ['src/**/*.js'],

        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                // Globales navigateur
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                HTMLElement: 'readonly',
                HTMLStyleElement: 'readonly',
                HTMLInputElement: 'readonly',
                CustomEvent: 'readonly',
                Event: 'readonly',
                MutationObserver: 'readonly',
                IntersectionObserver: 'readonly',
                ResizeObserver: 'readonly',
                crypto: 'readonly',
                Notification: 'readonly',
                alert: 'readonly',
                confirm: 'readonly',
                fetch: 'readonly',
                URL: 'readonly',
                Blob: 'readonly',
                FileReader: 'readonly',
                FormData: 'readonly',
                DragEvent: 'readonly',
                ClipboardEvent: 'readonly',
                KeyboardEvent: 'readonly',
                MouseEvent: 'readonly',
                navigator: 'readonly',
                location: 'readonly',
                Node: 'readonly',
                HTMLTextAreaElement: 'readonly',
                AbortController: 'readonly',
                IDBKeyRange: 'readonly',
                indexedDB: 'readonly',
                performance: 'readonly',
                atob: 'readonly',
                btoa: 'readonly',
                Pickr: 'readonly',
                Image: 'readonly',
                sessionStorage: 'readonly',
                TextEncoder: 'readonly',
            },
        },

        rules: {
            // — Erreurs evitables —

            // Interdit les variables non utilisees (sauf prefixees par _)
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
            }],

            // Pas de console.log en prod (warn seulement, console.warn/error OK)
            'no-console': ['warn', {
                allow: ['warn', 'error'],
            }],

            // Comparaison stricte obligatoire
            'eqeqeq': ['error', 'always'],

            // Interdit var (let/const obligatoires)
            'no-var': 'error',

            // Prefer const quand la variable n'est pas reassignee
            'prefer-const': 'warn',
        },
    },

    // Config specifique pour les fichiers de test
    {
        files: ['src/**/*.test.js'],
        languageOptions: {
            globals: {
                // Globales Vitest (injectees par globals: true dans vitest.config)
                describe: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                vi: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
            },
        },
        rules: {
            // Les tests peuvent utiliser console.log pour debug
            'no-console': 'off',
        },
    },

    // Exclure les fichiers de build et node_modules
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
];
