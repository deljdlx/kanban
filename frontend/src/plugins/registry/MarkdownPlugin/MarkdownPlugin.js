/**
 * MarkdownPlugin — Rendu Markdown dans les descriptions et commentaires.
 *
 * Utilise markdown-it pour le parsing et DOMPurify pour la securite XSS.
 * Ecoute les hooks render:description et render:comment pour transformer
 * le contenu texte en HTML formate.
 *
 * Coloration syntaxique via highlight.js pour les blocs de code.
 *
 * Architecture extensible :
 *   - markdown-it supporte les plugins (mermaid, custom bbcode, etc.)
 *   - Les regles custom peuvent etre ajoutees via _md.use() ou _md.inline.ruler
 */
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import StorageService from '../../../services/StorageService.js';
import hljs from 'highlight.js/lib/core';
import mermaid from 'mermaid';

// Import des langages courants (ajoutables selon les besoins)
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import css from 'highlight.js/lib/languages/css';
import scss from 'highlight.js/lib/languages/scss';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import sql from 'highlight.js/lib/languages/sql';
import markdown from 'highlight.js/lib/languages/markdown';

// Enregistrement des langages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('css', css);
hljs.registerLanguage('scss', scss);
hljs.registerLanguage('php', php);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);

/**
 * Configuration DOMPurify : tags et attributs autorises.
 * Restrictif par defaut pour eviter les injections XSS.
 */
const PURIFY_CONFIG = {
    ALLOWED_TAGS: [
        'p',
        'br',
        'strong',
        'b',
        'em',
        'i',
        'u',
        's',
        'del',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'blockquote',
        'pre',
        'code',
        'a',
        'img',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
        'hr',
        'span',
        'div',
        'input', // Pour les checkboxes markdown (- [x])
    ],
    ALLOWED_ATTR: [
        'href',
        'src',
        'alt',
        'title',
        'class',
        'target',
        'rel',
        'type',
        'checked',
        'disabled', // Pour les checkboxes
        'data-mermaid-id',
        'data-mermaid-src', // Pour les diagrammes mermaid
        'data-image-id',
        'data-image-alt', // Pour les images IndexedDB
    ],
    // Force les liens externes a s'ouvrir dans un nouvel onglet
    ADD_ATTR: ['target'],
};

/** Compteur unique pour les IDs mermaid */
let mermaidIdCounter = 0;

const MarkdownPlugin = {
    /** @type {HTMLStyleElement|null} */
    _styleEl: null,

    /** @type {MarkdownIt|null} Instance markdown-it */
    _md: null,

    /** @type {boolean} Activer le rendu dans les cartes (vue board) */
    _enableInCards: true,

    /** @type {boolean} Activer le rendu dans les modales */
    _enableInModals: true,

    /** @type {boolean} Mermaid initialise */
    _mermaidInitialized: false,

    /**
     * References aux callbacks de hooks pour le cleanup.
     * @type {{ onRenderDescription: Function|null, onRenderComment: Function|null }}
     */
    _hooks: {
        onRenderDescription: null,
        onRenderComment: null,
    },

    /**
     * Installe le plugin : initialise markdown-it et enregistre les hooks.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     * @returns {Promise<void>}
     */
    async install(hooks) {
        await this._loadSettings();
        this._initMarkdownIt();
        this._initMermaid();
        this._injectStyles();

        // Hook : rendu des descriptions
        this._hooks.onRenderDescription = ({ element, text, context }) => {
            if (!text) return;
            if (context === 'card' && !this._enableInCards) return;
            if (context === 'modal' && !this._enableInModals) return;

            this._renderMarkdown(element, text);
        };
        hooks.addAction('render:description', this._hooks.onRenderDescription);

        // Hook : rendu des commentaires
        this._hooks.onRenderComment = ({ element, text, context }) => {
            if (!text) return;
            if (context === 'modal' && !this._enableInModals) return;

            this._renderMarkdown(element, text);
        };
        hooks.addAction('render:comment', this._hooks.onRenderComment);
    },

    /**
     * Desinstalle le plugin : retire les hooks et styles.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        if (this._hooks.onRenderDescription) {
            hooks.removeAction('render:description', this._hooks.onRenderDescription);
            this._hooks.onRenderDescription = null;
        }
        if (this._hooks.onRenderComment) {
            hooks.removeAction('render:comment', this._hooks.onRenderComment);
            this._hooks.onRenderComment = null;
        }
        if (this._styleEl) {
            this._styleEl.remove();
            this._styleEl = null;
        }

        // Libère l'instance markdown-it pour éviter l'accumulation en mémoire
        this._md = null;
        this._mermaidInitialized = false;
    },

    // ---------------------------------------------------------------
    // Initialisation
    // ---------------------------------------------------------------

    /**
     * Initialise Mermaid avec un theme sombre.
     *
     * @private
     */
    _initMermaid() {
        if (this._mermaidInitialized) return;

        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
                primaryColor: '#6c63ff',
                primaryTextColor: '#e0e0e0',
                primaryBorderColor: '#2a2a4a',
                lineColor: '#5c6370',
                secondaryColor: '#2a2a4a',
                tertiaryColor: '#1a1a2e',
                background: '#1a1a2e',
                mainBkg: '#1a1a2e',
                nodeBorder: '#6c63ff',
                clusterBkg: '#2a2a4a',
                clusterBorder: '#6c63ff',
                titleColor: '#e0e0e0',
                edgeLabelBackground: '#1a1a2e',
            },
            fontFamily: 'var(--font-family, sans-serif)',
        });
        this._mermaidInitialized = true;
    },

    /**
     * Initialise l'instance markdown-it avec les options de base.
     * C'est ici qu'on peut ajouter des plugins markdown-it supplementaires.
     *
     * @private
     */
    _initMarkdownIt() {
        this._md = new MarkdownIt({
            html: false, // Pas de HTML brut (securite)
            breaks: true, // Convertit les retours a la ligne en <br>
            linkify: true, // Auto-detection des URLs
            typographer: true, // Guillemets intelligents, etc.
            highlight: (str, lang) => {
                // Mermaid : retourne un placeholder qui sera rendu apres
                if (lang === 'mermaid') {
                    const id = `mermaid-${++mermaidIdCounter}`;
                    // Encode le contenu en base64 pour eviter les problemes d'echappement
                    const encoded = btoa(unescape(encodeURIComponent(str)));
                    return `<div class="mdp-mermaid" data-mermaid-id="${id}" data-mermaid-src="${encoded}"></div>`;
                }

                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(str, { language: lang }).value;
                    } catch {
                        // Fallback si erreur de highlighting
                    }
                }
                // Pas de langage ou langage inconnu : pas de highlighting
                return '';
            },
        });

        // Force les liens a s'ouvrir dans un nouvel onglet
        const defaultRender =
            this._md.renderer.rules.link_open ||
            function (tokens, idx, options, env, self) {
                return self.renderToken(tokens, idx, options);
            };

        this._md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
            tokens[idx].attrSet('target', '_blank');
            tokens[idx].attrSet('rel', 'noopener noreferrer');
            return defaultRender(tokens, idx, options, env, self);
        };

        // Override image : les src "img:xxx" deviennent des placeholders async
        const defaultImageRender =
            this._md.renderer.rules.image ||
            function (tokens, idx, options, env, self) {
                return self.renderToken(tokens, idx, options);
            };

        this._md.renderer.rules.image = (tokens, idx, options, env, self) => {
            const token = tokens[idx];
            const src = token.attrGet('src');

            // Image stockee en local (IndexedDB) → placeholder async
            if (src && src.startsWith('img:')) {
                const imageId = src.slice(4).replace(/"/g, '&quot;');
                const alt = (token.content || '').replace(/"/g, '&quot;');
                return `<div class="mdp-image" data-image-id="${imageId}" data-image-alt="${alt}"></div>`;
            }

            return defaultImageRender(tokens, idx, options, env, self);
        };
    },

    // ---------------------------------------------------------------
    // Rendu
    // ---------------------------------------------------------------

    /**
     * Transforme le texte Markdown en HTML et l'injecte dans l'element.
     *
     * @param {HTMLElement} element - Element DOM cible
     * @param {string} text - Texte Markdown brut
     * @private
     */
    _renderMarkdown(element, text) {
        const rawHtml = this._md.render(text);
        const safeHtml = DOMPurify.sanitize(rawHtml, PURIFY_CONFIG);
        element.innerHTML = safeHtml;
        element.classList.add('mdp-rendered');

        // Rendu asynchrone des blocs speciaux
        this._renderMermaidBlocks(element);
        this._resolveImageBlocks(element);
    },

    /**
     * Trouve et rend tous les blocs Mermaid dans l'element.
     *
     * @param {HTMLElement} container - Element contenant les placeholders
     * @private
     */
    async _renderMermaidBlocks(container) {
        const blocks = container.querySelectorAll('.mdp-mermaid[data-mermaid-src]');
        if (blocks.length === 0) return;

        for (const block of blocks) {
            const id = block.dataset.mermaidId;
            const encoded = block.dataset.mermaidSrc;

            try {
                // Decode le contenu base64
                const code = decodeURIComponent(escape(atob(encoded)));
                const { svg } = await mermaid.render(id, code);
                block.innerHTML = svg;
                block.classList.add('mdp-mermaid--rendered');
            } catch (err) {
                // Affiche l'erreur dans le bloc
                block.innerHTML = `<pre class="mdp-mermaid-error">Erreur Mermaid: ${err.message}</pre>`;
                block.classList.add('mdp-mermaid--error');
            }
        }
    },

    /**
     * Resout les placeholders d'images IndexedDB dans le DOM.
     * Remplace chaque <div data-image-id="xxx"> par un <img src="blob:...">
     * en chargeant l'URL depuis StorageService.
     *
     * @param {HTMLElement} container - Element contenant les placeholders
     * @private
     */
    async _resolveImageBlocks(container) {
        const blocks = container.querySelectorAll('.mdp-image[data-image-id]');
        if (blocks.length === 0) return;

        for (const block of blocks) {
            const imageId = block.dataset.imageId;
            const alt = block.dataset.imageAlt || '';

            try {
                const url = await StorageService.getImageUrl(imageId);
                if (url) {
                    const img = document.createElement('img');
                    img.src = url;
                    img.alt = alt;
                    block.replaceWith(img);
                } else {
                    block.textContent = '[image introuvable]';
                    block.classList.add('mdp-image--error');
                }
            } catch {
                block.textContent = '[erreur image]';
                block.classList.add('mdp-image--error');
            }
        }
    },

    // ---------------------------------------------------------------
    // Persistence
    // ---------------------------------------------------------------

    /**
     * Charge les settings depuis IndexedDB.
     * @returns {Promise<void>}
     * @private
     */
    async _loadSettings() {
        const stored = await StorageService.get('kanban:markdown:settings', null);
        if (stored) {
            this._enableInCards = stored.enableInCards ?? true;
            this._enableInModals = stored.enableInModals ?? true;
        }
    },

    /**
     * Sauvegarde les settings dans IndexedDB.
     * @returns {Promise<void>}
     * @private
     */
    async _saveSettings() {
        await StorageService.set('kanban:markdown:settings', {
            enableInCards: this._enableInCards,
            enableInModals: this._enableInModals,
        });
    },
};

export default MarkdownPlugin;
