/**
 * ImageDropPlugin — Widget image avec drag & drop.
 *
 * Permet de créer une carte image en déposant un fichier sur une colonne.
 * Utilise le pattern widget standard pour le rendu.
 *
 * Structure des données (card.data) :
 *   {
 *     imageId: string,   // ID unique de l'image (référence IndexedDB)
 *   }
 *
 * Note: avec IndexedDB, l'URL est résolue dynamiquement via
 * ImageStorageService.getUrl() qui est maintenant async.
 *
 * Rétrocompatibilité : supporte aussi l'ancien format card.image = { id, url }
 * et card.data.imageUrl (base64 inline).
 */
import Card from '../../../models/Card.js';
import ImageStorageService from '../../../services/ImageStorageService.js';
import CardTypeRegistry from '../../../services/CardTypeRegistry.js';
import Application from '../../../Application.js';
import { formatShortDateTime } from '../../../utils/date.js';
import { generateId } from '../../../utils/id.js';

const ImageDropPlugin = {
    /** @type {string} */
    CARD_TYPE: 'widget:image',

    /** @type {Object|null} Référence au board */
    _board: null,

    /** @type {Object|null} Référence au HookRegistry */
    _hooksRegistry: null,

    /**
     * Références aux callbacks de hooks (pour removeAction à l'uninstall).
     * @type {{ onBoardWillChange: Function|null, onBoardRendered: Function|null, onRenderBody: Function|null, onDetailRender: Function|null, onTypeActivated: Function|null }}
     */
    _handlers: {
        onBoardWillChange: null,
        onBoardRendered: null,
        onRenderBody: null,
        onDetailRender: null,
        onTypeActivated: null,
    },

    /**
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        this._hooksRegistry = hooks;

        if (typeof this._injectStyles === 'function') {
            this._injectStyles();
        }

        // Enregistre le type de carte
        CardTypeRegistry.register(this.CARD_TYPE);

        // Cleanup avant switch de board
        this._handlers.onBoardWillChange = () => this._resetBoardState();
        hooks.addAction('board:willChange', this._handlers.onBoardWillChange);

        // Hook pour récupérer le board et attacher les listeners de drop
        this._handlers.onBoardRendered = ({ board, element }) => {
            this._board = board;
            this._attachDropListeners(element);
        };
        hooks.addAction('board:rendered', this._handlers.onBoardRendered);

        // Hook pour le rendu des cartes
        this._handlers.onRenderBody = (ctx) => this._onRenderBody(ctx);
        hooks.addAction('card:renderBody', this._handlers.onRenderBody);

        // Hook pour le rendu dans la modal de détail
        this._handlers.onDetailRender = (ctx) => this._onDetailRender(ctx);
        hooks.addAction('modal:cardDetail:renderContent', this._handlers.onDetailRender);

        // Hook pour se ré-attacher aux cartes existantes (après réactivation)
        this._handlers.onTypeActivated = (ctx) => this._onTypeActivated(ctx);
        hooks.addAction('card:typeActivated', this._handlers.onTypeActivated);
    },

    /**
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        this._resetBoardState();

        CardTypeRegistry.unregister(this.CARD_TYPE);

        if (this._handlers.onBoardWillChange) {
            hooks.removeAction('board:willChange', this._handlers.onBoardWillChange);
            this._handlers.onBoardWillChange = null;
        }
        if (this._handlers.onBoardRendered) {
            hooks.removeAction('board:rendered', this._handlers.onBoardRendered);
            this._handlers.onBoardRendered = null;
        }
        if (this._handlers.onRenderBody) {
            hooks.removeAction('card:renderBody', this._handlers.onRenderBody);
            this._handlers.onRenderBody = null;
        }
        if (this._handlers.onDetailRender) {
            hooks.removeAction('modal:cardDetail:renderContent', this._handlers.onDetailRender);
            this._handlers.onDetailRender = null;
        }
        if (this._handlers.onTypeActivated) {
            hooks.removeAction('card:typeActivated', this._handlers.onTypeActivated);
            this._handlers.onTypeActivated = null;
        }

        this._hooksRegistry = null;
    },

    /**
     * Remet à zéro l'état lié au board courant.
     * Appelé lors du switch de board et dans uninstall().
     *
     * @private
     */
    _resetBoardState() {
        // Retire les overlays de drop et les markers
        document.querySelectorAll('.imgdrop-overlay').forEach((el) => el.remove());
        document.querySelectorAll('.column[data-imgdrop-attached]').forEach((el) => {
            delete el.dataset.imgdropAttached;
        });

        this._board = null;
    },

    // ---------------------------------------------------------------
    // Détection du type (widget ou legacy)
    // ---------------------------------------------------------------

    /**
     * Vérifie si une carte est une carte image (nouveau ou ancien format).
     *
     * @param {import('../../../models/Card.js').default} card
     * @returns {boolean}
     */
    _isImageCard(card) {
        // Nouveau format widget
        if (card.type === this.CARD_TYPE) {
            return true;
        }
        // Ancien format legacy (card.image)
        if (card.image?.id || card.image?.url) {
            return true;
        }
        return false;
    },

    /**
     * Récupère l'URL de l'image d'une carte (nouveau ou ancien format).
     * ASYNC car IndexedDB requiert une lecture asynchrone.
     *
     * @param {import('../../../models/Card.js').default} card
     * @returns {Promise<string|null>}
     */
    async _getImageUrl(card) {
        // Nouveau format IndexedDB (card.data.imageId)
        if (card.type === this.CARD_TYPE && card.data?.imageId) {
            return await ImageStorageService.getUrl(card.data.imageId);
        }

        // Ancien format legacy avec URL inline (rétrocompatibilité)
        if (card.type === this.CARD_TYPE && card.data?.imageUrl) {
            return card.data.imageUrl;
        }

        // Ancien format card.image avec ID IndexedDB
        if (card.image?.id && !card.image?.url) {
            return await ImageStorageService.getUrl(card.image.id);
        }

        // Ancien format card.image avec URL inline
        if (card.image?.url) {
            return card.image.url;
        }

        return null;
    },

    // ---------------------------------------------------------------
    // Drop listeners sur les colonnes
    // ---------------------------------------------------------------

    /**
     * Attache les listeners de drop sur chaque colonne.
     *
     * @param {HTMLElement} boardEl
     * @private
     */
    _attachDropListeners(boardEl) {
        const columns = boardEl.querySelectorAll('.column[data-id]');

        columns.forEach((columnEl) => {
            // Évite les doublons
            if (columnEl.dataset.imgdropAttached) return;
            columnEl.dataset.imgdropAttached = 'true';

            // Overlay pour le feedback visuel
            let overlay = columnEl.querySelector('.imgdrop-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'imgdrop-overlay';
                overlay.innerHTML = "<span>Déposer l'image ici</span>";
                columnEl.appendChild(overlay);
            }

            columnEl.addEventListener('dragenter', (e) => {
                if (this._hasImageFile(e)) {
                    e.preventDefault();
                    columnEl.classList.add('imgdrop-active');
                }
            });

            columnEl.addEventListener('dragover', (e) => {
                if (this._hasImageFile(e)) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                }
            });

            columnEl.addEventListener('dragleave', (e) => {
                if (!columnEl.contains(e.relatedTarget)) {
                    columnEl.classList.remove('imgdrop-active');
                }
            });

            columnEl.addEventListener('drop', (e) => {
                columnEl.classList.remove('imgdrop-active');

                const file = this._getImageFile(e);
                if (file) {
                    e.preventDefault();
                    e.stopPropagation();
                    this._handleDrop(columnEl, file);
                }
            });
        });
    },

    /**
     * @param {DragEvent} e
     * @returns {boolean}
     * @private
     */
    _hasImageFile(e) {
        if (!e.dataTransfer?.types) return false;
        return e.dataTransfer.types.includes('Files');
    },

    /**
     * @param {DragEvent} e
     * @returns {File|null}
     * @private
     */
    _getImageFile(e) {
        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) return null;

        const file = files[0];
        return ImageStorageService.isValidImage(file) ? file : null;
    },

    /**
     * Gère le drop d'une image sur une colonne.
     *
     * @param {HTMLElement} columnEl
     * @param {File} file
     * @private
     */
    async _handleDrop(columnEl, file) {
        const columnId = columnEl.dataset.id;
        const column = this._board?.getColumnById(columnId);

        if (!column) {
            console.error('ImageDropPlugin: Colonne non trouvée', columnId);
            return;
        }

        columnEl.classList.add('imgdrop-loading');

        try {
            // Récupère le boardId courant pour associer l'image au board
            const boardId = Application.instance?.currentBoardId;
            const cardId = generateId('card');

            // Stocke l'image dans IndexedDB
            const imageData = await ImageStorageService.store(file, boardId, cardId);

            const title = formatShortDateTime(new Date().toISOString());

            // Nouveau format widget (seulement imageId, pas d'URL inline)
            const cardData = {
                id: cardId,
                title,
                description: '',
                tags: {},
                type: this.CARD_TYPE,
                data: {
                    imageId: imageData.id,
                },
            };

            const filteredData = this._hooksRegistry.applyFilters('card:beforeCreate', cardData);
            const card = new Card(filteredData);
            column.addCard(card, 0);

            this._hooksRegistry.doAction('card:created', { card, column });
        } catch (error) {
            console.error('ImageDropPlugin: Erreur lors du drop', error);
        } finally {
            columnEl.classList.remove('imgdrop-loading');
        }
    },

    // ---------------------------------------------------------------
    // Rendu des cartes
    // ---------------------------------------------------------------

    /**
     * Prend le contrôle du rendu pour les cartes image.
     *
     * Note : Les hooks render sont synchrones, mais _renderWidget() est async
     * (résolution URL depuis IndexedDB). On affiche un placeholder immédiat
     * puis on met à jour quand l'URL est résolue.
     *
     * @param {Object} ctx
     * @private
     */
    _onRenderBody(ctx) {
        const { card, cardElement } = ctx;

        if (!this._isImageCard(card)) {
            return;
        }

        ctx.handled = true;
        cardElement.classList.add('card--widget', 'card--image');

        // Placeholder immédiat + async update
        this._renderWidgetWithPlaceholder(card, cardElement, false);
    },

    /**
     * Prend le contrôle du rendu dans la modal de détail.
     *
     * @param {Object} ctx
     * @private
     */
    _onDetailRender(ctx) {
        const { card, panel } = ctx;

        if (!this._isImageCard(card)) {
            return;
        }

        ctx.handled = true;
        panel.classList.add('card-detail-panel--widget');

        // Placeholder immédiat + async update
        this._renderWidgetWithPlaceholder(card, panel, true);
    },

    /**
     * Appelé par CardTypeRegistry quand le type est (ré)activé.
     *
     * @param {Object} ctx
     * @private
     */
    _onTypeActivated({ cardType, cardId, element }) {
        if (cardType !== this.CARD_TYPE) {
            return;
        }

        // Le rendu sera fait par card:renderBody au prochain cycle
        // Rien de spécial à faire ici pour ce plugin
    },

    /**
     * Affiche un placeholder puis lance le rendu async.
     * Évite le flash de contenu vide pendant la résolution de l'URL.
     *
     * @param {import('../../../models/Card.js').default} card
     * @param {HTMLElement} parent
     * @param {boolean} isDetail
     * @private
     */
    _renderWidgetWithPlaceholder(card, parent, isDetail) {
        // Placeholder immédiat (skeleton)
        const placeholder = document.createElement('div');
        placeholder.className = 'image-widget image-widget--loading';
        if (isDetail) {
            placeholder.classList.add('image-widget--detail');
        }
        placeholder.innerHTML = '<div class="image-widget__skeleton"></div>';
        parent.appendChild(placeholder);

        // Charge l'image en arrière-plan puis remplace le placeholder
        this._renderWidget(card, parent, isDetail, placeholder).catch((err) => {
            console.error('ImageDropPlugin: erreur rendu widget', err);
            placeholder.innerHTML = '<p class="image-widget__error">Erreur de chargement</p>';
        });
    },

    /**
     * Rend le widget image dans un conteneur.
     * ASYNC car la résolution de l'URL depuis IndexedDB est asynchrone.
     *
     * @param {import('../../../models/Card.js').default} card
     * @param {HTMLElement} parent
     * @param {boolean} isDetail
     * @param {HTMLElement} [placeholder] - Élément placeholder à remplacer
     * @private
     */
    async _renderWidget(card, parent, isDetail, placeholder = null) {
        const imageUrl = await this._getImageUrl(card);

        // Si placeholder fourni mais plus dans le DOM (re-render entre temps), abort
        if (placeholder && !parent.contains(placeholder)) {
            return;
        }

        if (!imageUrl) {
            if (placeholder) {
                placeholder.innerHTML = '<p class="image-widget__error">Image non disponible</p>';
                placeholder.classList.remove('image-widget--loading');
            } else {
                parent.innerHTML = '<p class="image-widget__error">Image non disponible</p>';
            }
            return;
        }

        const container = document.createElement('div');
        container.className = 'image-widget';
        if (isDetail) {
            container.classList.add('image-widget--detail');
        }

        // Titre (seulement en mode card, pas en détail)
        if (!isDetail) {
            const titleEl = document.createElement('div');
            titleEl.className = 'image-widget__title';
            titleEl.textContent = card.title;
            container.appendChild(titleEl);
        }

        // Image
        const img = document.createElement('img');
        img.className = 'image-widget__img';
        img.src = imageUrl;
        img.alt = card.title;
        img.loading = 'lazy';

        // En mode détail, clic pour ouvrir en plein écran
        if (isDetail) {
            img.style.cursor = 'pointer';
            img.title = 'Cliquer pour agrandir';
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                this._openFullscreen(imageUrl);
            });
        }

        container.appendChild(img);

        // Remplace le placeholder ou ajoute au parent
        if (placeholder) {
            placeholder.replaceWith(container);
        } else {
            parent.appendChild(container);
        }
    },

    /**
     * Ouvre l'image en plein écran.
     *
     * @param {string} imageUrl
     * @private
     */
    _openFullscreen(imageUrl) {
        const overlay = document.createElement('div');
        overlay.className = 'image-widget__fullscreen';

        const img = document.createElement('img');
        img.src = imageUrl;

        overlay.appendChild(img);
        overlay.addEventListener('click', () => overlay.remove());

        document.body.appendChild(overlay);
    },
};

export default ImageDropPlugin;
