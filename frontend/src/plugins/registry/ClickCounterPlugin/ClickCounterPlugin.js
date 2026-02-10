/**
 * ClickCounterPlugin — Widget compteur cliquable.
 *
 * Démontre le concept de "carte spéciale" : une micro-application
 * embarquée dans une carte du Kanban.
 *
 * Pour créer un widget similaire, un plugin doit :
 *   1. Définir un CARD_TYPE unique (ex: 'widget:counter')
 *   2. Hook 'modal:addCard:opened' → registerCardType(typeId, label, buildPanel)
 *   3. Hook 'card:renderBody' → si card.type === CARD_TYPE, ctx.handled = true
 *   4. Dispatcher 'widget:create' avec cardData pour créer la carte
 *
 * Fonctionnalités :
 *   - Enregistre le type "Compteur de click" dans le sélecteur de la modal
 *   - Crée des cartes de type 'widget:counter'
 *   - Affiche un compteur cliquable au lieu du contenu standard
 *   - Persiste la valeur du compteur dans card.data.count
 */
import CardTypeRegistry from '../../../services/CardTypeRegistry.js';
import Container from '../../../Container.js';
import { generateId } from '../../../utils/id.js';

export default class ClickCounterPlugin {
    /**
     * @type {string}
     */
    static CARD_TYPE = 'widget:counter';

    /**
     * Références aux handlers de hooks (pour retrait dans uninstall).
     * @type {{ onModalOpened: Function, onRenderBody: Function, onDetailRender: Function }|null}
     */
    _handlers = null;

    /**
     * Installe le plugin : enregistre les hooks.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        // Injecte les styles (fourni par PluginAssembler)
        if (typeof this._injectStyles === 'function') {
            this._injectStyles();
        }

        // Enregistre le type de carte pour qu'il reste visible
        CardTypeRegistry.register(ClickCounterPlugin.CARD_TYPE);

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
     * Prend le contrôle du rendu dans la modal de détail.
     *
     * @param {Object} ctx
     * @param {import('../../../models/Card.js').default} ctx.card
     * @param {HTMLElement} ctx.panel
     * @private
     */
    _onDetailRender(ctx) {
        const { card, panel } = ctx;

        if (card.type !== ClickCounterPlugin.CARD_TYPE) {
            return;
        }

        ctx.handled = true;
        panel.classList.add('card-detail-panel--widget');

        // Réutilise le rendu du widget avec le mode "detail"
        this._renderWidget(card, panel, true);
    }

    /**
     * Désinstalle le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        hooks.removeAction('modal:addCard:opened', this._handlers.onModalOpened);
        hooks.removeAction('card:renderBody', this._handlers.onRenderBody);
        hooks.removeAction('modal:cardDetail:renderContent', this._handlers.onDetailRender);
        this._handlers = null;

        CardTypeRegistry.unregister(ClickCounterPlugin.CARD_TYPE);
    }

    // -------------------------------------------------------------------
    // Modal : Enregistrement du type de ticket
    // -------------------------------------------------------------------

    /**
     * Appelé quand la modal de création s'ouvre.
     * Enregistre le type "Compteur de click" dans le sélecteur.
     *
     * @param {Object} ctx
     * @param {Function} ctx.registerCardType
     * @private
     */
    _onModalOpened({ registerCardType }) {
        registerCardType(ClickCounterPlugin.CARD_TYPE, 'Compteur de click', (panel) => this._buildCounterPanel(panel));
    }

    /**
     * Construit le formulaire de création d'un compteur.
     *
     * @param {HTMLElement} panel
     * @private
     */
    _buildCounterPanel(panel) {
        panel.innerHTML = `
            <div class="counter-widget-form">
                <p class="counter-widget-intro">
                    Créez une carte interactive contenant un compteur cliquable.
                </p>
                <div class="form-group">
                    <label>Libellé</label>
                    <input type="text" class="input counter-widget-form__label"
                           placeholder="Ex: Cafés bus, Bugs résolus..." />
                </div>
                <div class="form-group">
                    <label>Valeur initiale</label>
                    <input type="number" class="input counter-widget-form__start" value="0" min="0" />
                </div>
                <button type="button" class="btn btn--primary counter-widget-form__submit">
                    Créer le compteur
                </button>
            </div>
        `;

        const labelInput = panel.querySelector('.counter-widget-form__label');
        const startInput = panel.querySelector('.counter-widget-form__start');
        const createBtn = panel.querySelector('.counter-widget-form__submit');

        createBtn.addEventListener('click', () => {
            const label = labelInput.value.trim() || 'Compteur';
            const startValue = parseInt(startInput.value, 10) || 0;

            const cardData = {
                id: generateId('card'),
                title: label,
                description: '',
                tags: {},
                type: ClickCounterPlugin.CARD_TYPE,
                data: {
                    count: startValue,
                    label: label,
                },
            };

            // Dispatch un événement custom pour que la modal le récupère
            const event = new CustomEvent('widget:create', {
                bubbles: true,
                detail: { cardData },
            });
            panel.dispatchEvent(event);
        });
    }

    // -------------------------------------------------------------------
    // Rendu : Compteur cliquable
    // -------------------------------------------------------------------

    /**
     * Appelé pour chaque carte à rendre.
     * Si c'est un widget:counter, prend le contrôle du rendu.
     *
     * @param {Object} ctx
     * @param {import('../../../models/Card.js').default} ctx.card
     * @param {HTMLElement} ctx.cardElement
     * @private
     */
    _onRenderBody(ctx) {
        const { card, cardElement } = ctx;

        if (card.type !== ClickCounterPlugin.CARD_TYPE) {
            return;
        }

        ctx.handled = true;
        cardElement.classList.add('card--widget', 'card--counter');

        this._renderWidget(card, cardElement, false);
    }

    /**
     * Rend le widget compteur dans un conteneur.
     *
     * @param {import('../../../models/Card.js').default} card
     * @param {HTMLElement} parent
     * @param {boolean} isDetail - true si rendu dans la modal de détail
     * @private
     */
    _renderWidget(card, parent, isDetail) {
        const data = card.data;
        const count = data.count ?? 0;
        const label = data.label || 'Compteur';

        const container = document.createElement('div');
        container.className = 'counter-widget';
        if (isDetail) {
            container.classList.add('counter-widget--detail');
        }

        const labelEl = document.createElement('div');
        labelEl.className = 'counter-widget__label';
        labelEl.textContent = label;

        const valueEl = document.createElement('div');
        valueEl.className = 'counter-widget__value';
        valueEl.textContent = count;

        const controls = document.createElement('div');
        controls.className = 'counter-widget__controls';

        const minusBtn = document.createElement('button');
        minusBtn.className = 'counter-widget__btn counter-widget__btn--minus';
        minusBtn.textContent = '-';
        minusBtn.title = 'Décrémenter';

        const plusBtn = document.createElement('button');
        plusBtn.className = 'counter-widget__btn counter-widget__btn--plus';
        plusBtn.textContent = '+';
        plusBtn.title = 'Incrémenter';

        controls.appendChild(minusBtn);
        controls.appendChild(plusBtn);

        container.appendChild(labelEl);
        container.appendChild(valueEl);
        container.appendChild(controls);

        parent.appendChild(container);

        // Event handlers
        plusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._updateCounter(card, valueEl, 1);
        });

        minusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._updateCounter(card, valueEl, -1);
        });

        valueEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this._updateCounter(card, valueEl, 1);
        });
    }

    /**
     * Met à jour la valeur du compteur et sauvegarde.
     *
     * @param {import('../../../models/Card.js').default} card
     * @param {HTMLElement} valueEl
     * @param {number} delta
     * @private
     */
    async _updateCounter(card, valueEl, delta) {
        const currentCount = card.data.count ?? 0;
        const newCount = Math.max(0, currentCount + delta);

        // Met à jour les données de la carte
        card.updateData({ count: newCount });

        // Met à jour l'affichage
        valueEl.textContent = newCount;

        // Animation de feedback
        valueEl.classList.add('counter-widget__value--bump');
        setTimeout(() => {
            valueEl.classList.remove('counter-widget__value--bump');
        }, 150);

        await Container.get('BoardService').save();
    }
}
