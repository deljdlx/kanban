/**
 * YouTubePlugin — Widget video YouTube.
 *
 * Carte avec une video YouTube embarquee.
 *
 * Structure des donnees (card.data) :
 *   {
 *     videoId: string,    // ID de la video YouTube
 *     videoUrl: string,   // URL originale
 *   }
 *
 * Formats d'URL supportes :
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/embed/VIDEO_ID
 *
 * Pour creer un widget similaire, voir ClickCounterPlugin pour le pattern.
 */
import CardTypeRegistry from '../../../services/CardTypeRegistry.js';
import { generateId } from '../../../utils/id.js';

export default class YouTubePlugin {
    /**
     * @type {string}
     */
    static CARD_TYPE = 'widget:youtube';

    /**
     * Installe le plugin : enregistre les hooks.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        if (typeof this._injectStyles === 'function') {
            this._injectStyles();
        }

        // Enregistre le type de carte pour qu'il reste visible
        CardTypeRegistry.register(YouTubePlugin.CARD_TYPE);

        // Stocke les références pour pouvoir les retirer dans uninstall()
        this._handlers = {
            onModalOpened: (ctx) => this._onModalOpened(ctx),
            onRenderBody: (ctx) => this._onRenderBody(ctx),
            onDetailRender: (ctx) => this._onDetailRender(ctx),
        };

        hooks.addAction('modal:addCard:opened', this._handlers.onModalOpened);
        hooks.addAction('card:renderBody', this._handlers.onRenderBody);
        hooks.addAction('modal:cardDetail:renderContent', this._handlers.onDetailRender);
    }

    /**
     * Desinstalle le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        hooks.removeAction('modal:addCard:opened', this._handlers.onModalOpened);
        hooks.removeAction('card:renderBody', this._handlers.onRenderBody);
        hooks.removeAction('modal:cardDetail:renderContent', this._handlers.onDetailRender);
        this._handlers = null;

        CardTypeRegistry.unregister(YouTubePlugin.CARD_TYPE);
    }

    /**
     * Prend le controle du rendu dans la modal de detail.
     *
     * @param {Object} ctx
     * @param {import('../../../models/Card.js').default} ctx.card
     * @param {HTMLElement} ctx.panel
     * @private
     */
    _onDetailRender(ctx) {
        const { card, panel } = ctx;

        if (card.type !== YouTubePlugin.CARD_TYPE) {
            return;
        }

        ctx.handled = true;
        panel.classList.add('card-detail-panel--widget');

        this._renderWidget(card, panel, true);
    }

    // -------------------------------------------------------------------
    // Modal : Enregistrement du type de ticket
    // -------------------------------------------------------------------

    /**
     * Enregistre le type "Video YouTube" dans le selecteur de la modal.
     *
     * @param {Object} ctx
     * @param {Function} ctx.registerCardType
     * @private
     */
    _onModalOpened({ registerCardType }) {
        registerCardType(YouTubePlugin.CARD_TYPE, 'Video YouTube', (panel) => this._buildPanel(panel));
    }

    /**
     * Construit le formulaire de creation d'une carte YouTube.
     *
     * @param {HTMLElement} panel
     * @private
     */
    _buildPanel(panel) {
        panel.innerHTML = `
            <div class="youtube-form">
                <p class="youtube-form__intro">
                    Ajoutez une video YouTube a votre board.
                </p>
                <div class="form-group">
                    <label>URL de la video</label>
                    <input type="url" class="input youtube-form__url"
                           placeholder="https://www.youtube.com/watch?v=..." />
                </div>
                <div class="form-group">
                    <label>Titre (optionnel)</label>
                    <input type="text" class="input youtube-form__title"
                           placeholder="Titre de la video" />
                </div>
                <div class="youtube-form__preview"></div>
                <button type="button" class="btn btn--primary youtube-form__submit" disabled>
                    Ajouter la video
                </button>
            </div>
        `;

        const urlInput = panel.querySelector('.youtube-form__url');
        const titleInput = panel.querySelector('.youtube-form__title');
        const previewEl = panel.querySelector('.youtube-form__preview');
        const createBtn = panel.querySelector('.youtube-form__submit');

        // Preview en temps reel
        urlInput.addEventListener('input', () => {
            const videoId = this._extractVideoId(urlInput.value);
            if (videoId) {
                previewEl.innerHTML = `
                    <img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg"
                         alt="Preview" class="youtube-form__thumbnail" />
                `;
                createBtn.disabled = false;
            } else {
                previewEl.innerHTML = urlInput.value.trim()
                    ? '<p class="youtube-form__error">URL YouTube invalide</p>'
                    : '';
                createBtn.disabled = true;
            }
        });

        createBtn.addEventListener('click', () => {
            const videoId = this._extractVideoId(urlInput.value);
            if (!videoId) return;

            const title = titleInput.value.trim() || 'Video YouTube';

            const cardData = {
                id: generateId('card'),
                title,
                description: '',
                tags: {},
                type: YouTubePlugin.CARD_TYPE,
                data: {
                    videoId,
                    videoUrl: urlInput.value.trim(),
                },
            };

            panel.dispatchEvent(
                new CustomEvent('widget:create', {
                    bubbles: true,
                    detail: { cardData },
                }),
            );
        });
    }

    /**
     * Extrait l'ID de video depuis une URL YouTube.
     *
     * @param {string} url
     * @returns {string|null}
     * @private
     */
    _extractVideoId(url) {
        if (!url) return null;

        const patterns = [
            // https://www.youtube.com/watch?v=VIDEO_ID
            /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
            // https://youtu.be/VIDEO_ID
            /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            // https://www.youtube.com/embed/VIDEO_ID
            /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            // https://www.youtube.com/v/VIDEO_ID
            /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }

    // -------------------------------------------------------------------
    // Rendu : Video YouTube embarquee
    // -------------------------------------------------------------------

    /**
     * Prend le controle du rendu pour les cartes YouTube.
     *
     * @param {Object} ctx
     * @param {import('../../../models/Card.js').default} ctx.card
     * @param {HTMLElement} ctx.cardElement
     * @private
     */
    _onRenderBody(ctx) {
        const { card, cardElement } = ctx;

        if (card.type !== YouTubePlugin.CARD_TYPE) {
            return;
        }

        ctx.handled = true;
        cardElement.classList.add('card--widget', 'card--youtube');

        this._renderWidget(card, cardElement, false);
    }

    /**
     * Rend le widget YouTube dans un conteneur.
     *
     * @param {import('../../../models/Card.js').default} card
     * @param {HTMLElement} parent
     * @param {boolean} isDetail - true si rendu dans la modal de detail
     * @private
     */
    _renderWidget(card, parent, isDetail) {
        const data = card.data;
        const videoId = data.videoId;

        if (!videoId) {
            parent.innerHTML = '<p>Video non disponible</p>';
            return;
        }

        const container = document.createElement('div');
        container.className = 'youtube-widget';
        if (isDetail) {
            container.classList.add('youtube-widget--detail');
        }

        // Titre
        const titleEl = document.createElement('div');
        titleEl.className = 'youtube-widget__title';
        titleEl.textContent = card.title;
        container.appendChild(titleEl);

        // Conteneur video avec ratio 16:9
        const videoWrapper = document.createElement('div');
        videoWrapper.className = 'youtube-widget__video-wrapper';

        // Thumbnail cliquable (charge l'iframe au clic pour perf)
        const thumbnail = document.createElement('div');
        thumbnail.className = 'youtube-widget__thumbnail';
        thumbnail.style.backgroundImage = `url(https://img.youtube.com/vi/${videoId}/mqdefault.jpg)`;

        const playBtn = document.createElement('div');
        playBtn.className = 'youtube-widget__play-btn';
        playBtn.innerHTML = '&#9658;'; // Triangle play
        thumbnail.appendChild(playBtn);

        videoWrapper.appendChild(thumbnail);
        container.appendChild(videoWrapper);

        // Clic sur thumbnail → charge l'iframe
        thumbnail.addEventListener('click', (e) => {
            e.stopPropagation();
            this._loadIframe(videoWrapper, videoId);
        });

        parent.appendChild(container);
    }

    /**
     * Remplace la thumbnail par l'iframe YouTube.
     *
     * @param {HTMLElement} wrapper
     * @param {string} videoId
     * @private
     */
    _loadIframe(wrapper, videoId) {
        const iframe = document.createElement('iframe');
        iframe.className = 'youtube-widget__iframe';
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.frameBorder = '0';

        wrapper.innerHTML = '';
        wrapper.appendChild(iframe);
    }
}
