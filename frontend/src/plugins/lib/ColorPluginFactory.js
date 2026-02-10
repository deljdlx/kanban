/**
 * ColorPluginFactory — Factory pour creer des plugins de coloration.
 *
 * Permet de creer facilement un plugin qui attribue des couleurs a des
 * elements (cartes, colonnes, etc.) sans dupliquer le code boilerplate.
 *
 * Le plugin genere :
 *   1. Chargement dynamique de Pickr via PickrLoader
 *   2. Un MutationObserver sur le board pour detecter les nouveaux elements
 *   3. Un bouton palette injecte dans chaque element
 *   4. Persistance dans board.pluginData (map elementId -> couleur RGBA)
 *
 * Note: Les swatches restent globaux dans IndexedDB (preferences utilisateur).
 *
 * Usage :
 *
 *   import { createColorPlugin } from '../../lib/ColorPluginFactory.js';
 *
 *   export default createColorPlugin({
 *       name: 'card-colors',
 *       label: 'Couleurs des cartes',
 *       pluginDataKey: 'card-colors',
 *       swatchesStorageKey: 'kanban:cardColorSwatches',
 *       elementSelector: '.card[data-id]',
 *       elementClass: 'card',
 *       cssPrefix: 'ccp',
 *       buttonTitle: 'Couleur',
 *       applyColor: (el, color) => { ... },
 *       getButtonAnchor: (el) => el,
 *       updateButton: (btn, color) => { ... },
 *       defaultPickrColor: 'rgba(52, 152, 219, 0.3)',
 *       modalHooks: true,  // Injecte un onglet dans les modales edit/add card
 *   });
 */
import { loadPickr } from './PickrLoader.js';
import { parseColor, toRgba } from './colorUtils.js';
import { createColorPickr, createSwatchPickr, destroyPickr } from './PickrHelper.js';
import StorageService from '../../services/StorageService.js';
import Application from '../../Application.js';

/** @type {string[]} Swatches par defaut affiches dans le picker */
export const DEFAULT_SWATCHES = [
    '#e74c3c',
    '#e67e22',
    '#f1c40f',
    '#2ecc71',
    '#1abc9c',
    '#3498db',
    '#9b59b6',
    '#e91e8e',
];

/**
 * Cree un plugin de coloration.
 *
 * @param {Object} config - Configuration du plugin
 * @param {string} config.name - Identifiant unique du plugin
 * @param {string} config.label - Label affiche dans la liste des plugins
 * @param {string} config.pluginDataKey - Cle dans board.pluginData
 * @param {string} config.swatchesStorageKey - Cle IndexedDB pour les swatches
 * @param {string} config.elementSelector - Selecteur CSS pour les elements (ex: '.card[data-id]')
 * @param {string} config.elementClass - Classe CSS pour la detection MutationObserver (ex: 'card')
 * @param {string} config.cssPrefix - Prefixe pour les classes CSS (ex: 'ccp')
 * @param {string} config.buttonTitle - Titre du bouton palette
 * @param {(el: HTMLElement, color: string|null, parsed?: {r:number,g:number,b:number,a:number}) => void} config.applyColor - Applique une couleur a un element
 * @param {(el: HTMLElement) => HTMLElement} config.getButtonAnchor - Retourne l'element ou injecter le bouton
 * @param {(btn: HTMLElement, color: string|null) => void} config.updateButton - Met a jour le style du bouton
 * @param {(el: HTMLElement, color: string|null) => void} config.clearColor - Retire la couleur d'un element
 * @param {string} [config.defaultPickrColor='rgba(52, 152, 219, 0.3)'] - Couleur par defaut du picker
 * @param {boolean} [config.modalHooks=false] - Injecter un onglet couleur dans les modales edit/add
 * @param {string[]} [config.tags=['couleur']] - Tags pour classifier le plugin
 * @returns {Object} Plugin pret a l'emploi
 */
export function createColorPlugin(config) {
    const {
        name,
        label,
        pluginDataKey,
        swatchesStorageKey,
        elementSelector,
        elementClass,
        cssPrefix,
        buttonTitle,
        applyColor,
        getButtonAnchor,
        updateButton,
        clearColor,
        defaultPickrColor = 'rgba(52, 152, 219, 0.3)',
        modalHooks = false,
        tags = ['couleur'],
    } = config;

    const btnClass = `${cssPrefix}-btn`;
    const modalFieldClass = `${cssPrefix}-modal-field`;
    const modalPreviewClass = `${cssPrefix}-modal-preview`;
    const modalBtnClass = `${cssPrefix}-modal-btn`;

    return {
        name,
        label,
        tags,

        /** @type {MutationObserver|null} */
        _boardObserver: null,

        /** @type {Object|null} Instance Pickr active */
        _activePickr: null,

        /** @type {string|null} ID de l'element dont le picker est ouvert */
        _activeElementId: null,

        /** @type {Object<string, string>} Map elementId -> couleur RGBA */
        _colors: {},

        /** @type {string[]} Swatches courants */
        _swatches: [...DEFAULT_SWATCHES],

        /** @type {Object|null} HookRegistry */
        _hooksRegistry: null,

        /** @type {import('../../models/Board.js').default|null} */
        _board: null,

        /** @type {Array<{ hookName: string, callback: Function }>} Hooks enregistrés pour uninstall */
        _registeredHooks: [],

        /**
         * Installe le plugin.
         *
         * @param {import('../HookRegistry.js').default} hooks
         * @returns {Promise<void>}
         */
        async install(hooks) {
            this._hooksRegistry = hooks;
            this._registeredHooks = [];
            await this._initAsync();

            // Styles injectes par PluginAssembler
            if (typeof this._injectStyles === 'function') {
                this._injectStyles();
            }

            loadPickr().catch((err) => console.error(`${name}:`, err));

            this._listen(hooks, 'board:willChange', () => this._resetBoardState());

            this._listen(hooks, 'board:didChange', ({ board }) => {
                this._board = board;
                this._loadColors();
            });

            this._listen(hooks, 'board:rendered', ({ element }) => {
                this._setupBoardObserver(element);
                this._processAllElements();
            });

            // Hooks modaux (optionnels)
            if (modalHooks) {
                this._listen(hooks, 'modal:editCard:opened', ({ cardId, addTab, onClose }) => {
                    const panel = addTab('Couleur', { order: 15 });
                    this._injectColorField(panel, cardId, onClose);
                });

                this._listen(hooks, 'modal:addCard:opened', ({ addTab, onClose }) => {
                    const panel = addTab('Couleur', { order: 15 });
                    this._injectColorField(panel, null, onClose);
                });
            }
        },

        /**
         * Enregistre un hook et le track pour uninstall automatique.
         *
         * @param {import('../HookRegistry.js').default} hooks
         * @param {string} hookName
         * @param {Function} callback
         * @private
         */
        _listen(hooks, hookName, callback) {
            hooks.addAction(hookName, callback);
            this._registeredHooks.push({ hookName, callback });
        },

        /**
         * Desinstalle le plugin.
         *
         * @param {import('../HookRegistry.js').default} hooks
         */
        uninstall(hooks) {
            this._resetBoardState();

            for (const { hookName, callback } of this._registeredHooks) {
                hooks.removeAction(hookName, callback);
            }
            this._registeredHooks = [];

            this._hooksRegistry = null;
            this._board = null;
        },

        /**
         * Remet a zero l'etat lie au board courant.
         * @private
         */
        _resetBoardState() {
            this._destroyPickr();

            if (this._boardObserver) {
                this._boardObserver.disconnect();
                this._boardObserver = null;
            }

            // Retire les boutons et les couleurs de tous les elements
            document.querySelectorAll(`.${btnClass}`).forEach((btn) => btn.remove());
            document.querySelectorAll(elementSelector).forEach((el) => {
                clearColor(el);
            });
        },

        // ---------------------------------------------------------------
        // Persistence
        // ---------------------------------------------------------------

        /**
         * Charge les couleurs depuis board.pluginData.
         * @private
         */
        _loadColors() {
            if (!this._board) {
                this._board = Application.instance?.currentBoard || null;
            }

            if (this._board) {
                this._colors = this._board.pluginData[pluginDataKey] || {};
            } else {
                this._colors = {};
            }
        },

        /**
         * Sauvegarde les couleurs dans board.pluginData.
         * @private
         */
        _saveColors() {
            if (!this._board) return;
            this._board.setPluginData(pluginDataKey, { ...this._colors });
        },

        /**
         * Initialisation async : charge les swatches depuis IndexedDB.
         * @private
         */
        async _initAsync() {
            await this._loadSwatches();
        },

        /**
         * @returns {Promise<void>}
         * @private
         */
        async _loadSwatches() {
            this._swatches = await StorageService.get(swatchesStorageKey, [...DEFAULT_SWATCHES]);
        },

        /**
         * @returns {Promise<void>}
         * @private
         */
        async _saveSwatches() {
            await StorageService.set(swatchesStorageKey, this._swatches);
        },

        /**
         * @returns {string[]}
         * @private
         */
        _getSwatches() {
            return this._swatches;
        },

        // ---------------------------------------------------------------
        // Observation du board
        // ---------------------------------------------------------------

        /**
         * Configure l'observer sur le board pour detecter les nouveaux elements.
         *
         * @param {HTMLElement} boardEl
         * @private
         */
        _setupBoardObserver(boardEl) {
            if (this._boardObserver) {
                this._boardObserver.disconnect();
            }

            this._boardObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType !== Node.ELEMENT_NODE) continue;

                        if (node.classList.contains(elementClass) && node.dataset.id) {
                            this._processElement(node);
                        }

                        const nested = node.querySelectorAll(elementSelector);
                        nested.forEach((el) => this._processElement(el));
                    }
                }
            });

            this._boardObserver.observe(boardEl, { childList: true, subtree: true });
        },

        /** @private */
        _processAllElements() {
            document.querySelectorAll(elementSelector).forEach((el) => {
                this._processElement(el);
            });
        },

        /**
         * Traite un element : applique sa couleur et injecte le bouton.
         *
         * @param {HTMLElement} el
         * @private
         */
        _processElement(el) {
            const elementId = el.dataset.id;
            const color = this._colors[elementId] || null;
            this._applyColorToElement(el, color);

            const anchor = getButtonAnchor(el);
            if (!anchor || anchor.querySelector(`.${btnClass}`)) return;

            const btn = document.createElement('button');
            btn.className = btnClass;
            btn.title = buttonTitle;
            btn.textContent = '🎨';
            updateButton(btn, color);

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this._openPickrOnElement(el, btn);
            });

            anchor.appendChild(btn);
        },

        // ---------------------------------------------------------------
        // Application des couleurs
        // ---------------------------------------------------------------

        /**
         * Applique une couleur a un element DOM.
         *
         * @param {HTMLElement} el
         * @param {string|null} color
         * @private
         */
        _applyColorToElement(el, color) {
            if (color) {
                const parsed = parseColor(color);
                applyColor(el, color, parsed);
            } else {
                clearColor(el);
            }
        },

        /**
         * Applique une couleur a un element par son ID.
         *
         * @param {string} elementId
         * @param {string|null} color
         * @private
         */
        _applyColorById(elementId, color) {
            const el = document.querySelector(
                `.board ${elementSelector.replace('[data-id]', `[data-id="${elementId}"]`)}`,
            );
            if (el) {
                this._applyColorToElement(el, color);
                const btn = getButtonAnchor(el).querySelector(`.${btnClass}`);
                if (btn) {
                    updateButton(btn, color);
                }
            }
        },

        /**
         * Sauvegarde et applique une couleur pour un element.
         *
         * @param {string} elementId
         * @param {string|null} color
         * @private
         */
        _setColorById(elementId, color) {
            if (color) {
                this._colors[elementId] = color;
            } else {
                delete this._colors[elementId];
            }
            this._applyColorById(elementId, color);
            this._saveColors();
        },

        /**
         * Applique toutes les couleurs sauvegardees aux elements du DOM.
         * Utilise par le settingsPanel apres un reset.
         *
         * @private
         */
        _applyAllColors() {
            document.querySelectorAll(elementSelector).forEach((el) => {
                const elementId = el.dataset.id;
                const color = this._colors[elementId] || null;
                this._applyColorToElement(el, color);

                const btn = getButtonAnchor(el)?.querySelector(`.${btnClass}`);
                if (btn) {
                    updateButton(btn, color);
                }
            });
        },

        /**
         * Reinitialise les couleurs (vide la map).
         * Utilise par le settingsPanel.
         */
        resetColors() {
            this._colors = {};
            if (this._board) {
                this._board.setPluginData(pluginDataKey, {});
            }
            this._applyAllColors();
        },

        // ---------------------------------------------------------------
        // Champ couleur dans les modales (si modalHooks = true)
        // ---------------------------------------------------------------

        /**
         * Injecte un champ "Couleur" dans le panneau d'une modale.
         *
         * @param {HTMLElement} panel
         * @param {string|null} cardId
         * @param {Function} [onClose]
         * @private
         */
        _injectColorField(panel, cardId, onClose) {
            const currentColor = cardId ? this._colors[cardId] || null : null;

            const labelEl = document.createElement('label');
            labelEl.className = 'label';
            labelEl.textContent = 'Couleur';

            const container = document.createElement('div');
            container.className = modalFieldClass;

            const preview = document.createElement('div');
            preview.className = modalPreviewClass;
            if (currentColor) {
                preview.style.background = currentColor;
            }

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = modalBtnClass;
            btn.textContent = currentColor ? 'Modifier' : 'Choisir';

            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = `${modalBtnClass} ${modalBtnClass}--clear`;
            clearBtn.textContent = 'Retirer';
            if (!currentColor) {
                clearBtn.classList.add('hidden');
            }

            container.appendChild(preview);
            container.appendChild(btn);
            container.appendChild(clearBtn);
            panel.appendChild(labelEl);
            panel.appendChild(container);

            let chosenColor = currentColor;

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._openPickrInModal(cardId, btn, preview, clearBtn, (color) => {
                    chosenColor = color;
                });
            });

            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                chosenColor = null;
                preview.style.background = '';
                btn.textContent = 'Choisir';
                clearBtn.classList.add('hidden');
                if (cardId) {
                    this._setColorById(cardId, null);
                }
            });

            // Pour la creation : ecoute card:created pour appliquer la couleur
            if (!cardId && this._hooksRegistry) {
                const onCreated = ({ card }) => {
                    if (chosenColor) {
                        this._setColorById(card.id, chosenColor);
                    }
                };

                this._hooksRegistry.addAction('card:created', onCreated);

                if (onClose) {
                    onClose(() => this._hooksRegistry.removeAction('card:created', onCreated));
                }
            }
        },

        // ---------------------------------------------------------------
        // Pickr
        // ---------------------------------------------------------------

        /**
         * Ouvre le color picker ancre sur un element.
         *
         * @param {HTMLElement} el
         * @param {HTMLElement} anchorBtn
         * @private
         */
        _openPickrOnElement(el, anchorBtn) {
            const elementId = el.dataset.id;

            // Toggle : si deja ouvert sur cet element, on ferme
            if (this._activeElementId === elementId) {
                this._destroyPickr();
                return;
            }

            this._destroyPickr();
            this._activeElementId = elementId;

            const currentColor = this._colors[elementId] || defaultPickrColor;

            this._activePickr = createColorPickr({
                anchor: anchorBtn,
                defaultColor: currentColor,
                swatches: this._getSwatches(),
                onChange: (cssColor) => this._applyColorToElement(el, cssColor),
                onSave: (cssColor) => this._setColorById(elementId, cssColor),
                onClear: () => this._setColorById(elementId, null),
                onHide: () => this._destroyPickr(),
            });

            if (this._activePickr) {
                this._activePickr.show();
            }
        },

        /**
         * Ouvre le picker dans une modale.
         *
         * @param {string|null} cardId
         * @param {HTMLElement} anchorBtn
         * @param {HTMLElement} preview
         * @param {HTMLElement} clearBtn
         * @param {Function} onColorChange
         * @private
         */
        _openPickrInModal(cardId, anchorBtn, preview, clearBtn, onColorChange) {
            this._destroyPickr();
            this._activeElementId = cardId;

            const currentColor = (cardId && this._colors[cardId]) || defaultPickrColor;

            this._activePickr = createColorPickr({
                anchor: anchorBtn,
                defaultColor: currentColor,
                swatches: this._getSwatches(),
                onChange: (cssColor) => {
                    preview.style.background = cssColor;
                    if (cardId) this._applyColorById(cardId, cssColor);
                },
                onSave: (cssColor) => {
                    if (cssColor) {
                        onColorChange(cssColor);
                        preview.style.background = cssColor;
                        anchorBtn.textContent = 'Modifier';
                        clearBtn.classList.remove('hidden');
                        if (cardId) this._setColorById(cardId, cssColor);
                    } else {
                        onColorChange(null);
                        preview.style.background = '';
                        anchorBtn.textContent = 'Choisir';
                        clearBtn.classList.add('hidden');
                        if (cardId) this._setColorById(cardId, null);
                    }
                },
                onClear: () => {
                    onColorChange(null);
                    preview.style.background = '';
                    anchorBtn.textContent = 'Choisir';
                    clearBtn.classList.add('hidden');
                    if (cardId) this._setColorById(cardId, null);
                },
                onHide: () => this._destroyPickr(),
            });

            if (this._activePickr) {
                this._activePickr.show();
            }
        },

        /**
         * Ouvre un Pickr pour ajouter un swatch.
         *
         * @param {HTMLElement} anchorEl
         * @param {Function} onSave
         * @private
         */
        _openSwatchPickr(anchorEl, onSave) {
            this._destroyPickr();

            this._activePickr = createSwatchPickr({
                anchor: anchorEl,
                onSave,
                onHide: () => this._destroyPickr(),
            });

            if (this._activePickr) {
                this._activePickr.show();
            }
        },

        /** @private */
        _destroyPickr() {
            destroyPickr(this._activePickr);
            this._activePickr = null;
            this._activeElementId = null;
        },
    };
}
