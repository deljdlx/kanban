/**
 * ChecklistPlugin — Widget checklist (mini todo-list).
 *
 * Carte interactive avec une liste d'éléments cochables.
 *
 * Structure des données (card.data) :
 *   {
 *     items: [
 *       { id: string, text: string, checked: boolean },
 *       ...
 *     ]
 *   }
 *
 * Pour créer un widget similaire, voir ClickCounterPlugin pour le pattern.
 */
import CardTypeRegistry from '../../../services/CardTypeRegistry.js';
import Container from '../../../Container.js';
import { generateId } from '../../../utils/id.js';

export default class ChecklistPlugin {
    /**
     * @type {string}
     */
    static CARD_TYPE = 'widget:checklist';

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
        if (typeof this._injectStyles === 'function') {
            this._injectStyles();
        }

        // Enregistre le type de carte pour qu'il reste visible
        CardTypeRegistry.register(ChecklistPlugin.CARD_TYPE);

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
     * Désinstalle le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        hooks.removeAction('modal:addCard:opened', this._handlers.onModalOpened);
        hooks.removeAction('card:renderBody', this._handlers.onRenderBody);
        hooks.removeAction('modal:cardDetail:renderContent', this._handlers.onDetailRender);
        this._handlers = null;

        CardTypeRegistry.unregister(ChecklistPlugin.CARD_TYPE);
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

        if (card.type !== ChecklistPlugin.CARD_TYPE) {
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
     * Enregistre le type "Checklist" dans le sélecteur de la modal.
     *
     * @param {Object} ctx
     * @param {Function} ctx.registerCardType
     * @private
     */
    _onModalOpened({ registerCardType }) {
        registerCardType(ChecklistPlugin.CARD_TYPE, 'Checklist', (panel) => this._buildPanel(panel));
    }

    /**
     * Construit le formulaire de création d'une checklist.
     *
     * @param {HTMLElement} panel
     * @private
     */
    _buildPanel(panel) {
        panel.innerHTML = `
            <div class="checklist-form">
                <p class="checklist-form__intro">
                    Créez une carte avec une liste d'éléments à cocher.
                </p>
                <div class="form-group">
                    <label>Titre de la liste</label>
                    <input type="text" class="input checklist-form__title"
                           placeholder="Ex: Courses, Todo, Idées..." />
                </div>
                <div class="form-group">
                    <label>Éléments (un par ligne)</label>
                    <textarea class="textarea checklist-form__items" rows="5"
                              placeholder="Pain&#10;Lait&#10;Oeufs"></textarea>
                </div>
                <button type="button" class="btn btn--primary checklist-form__submit">
                    Créer la checklist
                </button>
            </div>
        `;

        const titleInput = panel.querySelector('.checklist-form__title');
        const itemsTextarea = panel.querySelector('.checklist-form__items');
        const createBtn = panel.querySelector('.checklist-form__submit');

        createBtn.addEventListener('click', () => {
            const title = titleInput.value.trim() || 'Checklist';
            const rawItems = itemsTextarea.value.trim();

            // Parse les lignes en items
            const items = rawItems
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
                .map((text) => ({
                    id: generateId('item'),
                    text,
                    checked: false,
                }));

            const cardData = {
                id: generateId('card'),
                title,
                description: '',
                tags: {},
                type: ChecklistPlugin.CARD_TYPE,
                data: { items },
            };

            panel.dispatchEvent(
                new CustomEvent('widget:create', {
                    bubbles: true,
                    detail: { cardData },
                }),
            );
        });
    }

    // -------------------------------------------------------------------
    // Rendu : Checklist interactive
    // -------------------------------------------------------------------

    /**
     * Prend le contrôle du rendu pour les cartes checklist.
     *
     * @param {Object} ctx
     * @param {import('../../../models/Card.js').default} ctx.card
     * @param {HTMLElement} ctx.cardElement
     * @private
     */
    _onRenderBody(ctx) {
        const { card, cardElement } = ctx;

        if (card.type !== ChecklistPlugin.CARD_TYPE) {
            return;
        }

        ctx.handled = true;
        cardElement.classList.add('card--widget', 'card--checklist');

        this._renderWidget(card, cardElement, false);
    }

    /**
     * Rend le widget checklist dans un conteneur.
     *
     * @param {import('../../../models/Card.js').default} card
     * @param {HTMLElement} parent
     * @param {boolean} isDetail - true si rendu dans la modal de détail
     * @private
     */
    _renderWidget(card, parent, isDetail) {
        // Container principal
        const container = document.createElement('div');
        container.className = 'checklist-widget';
        if (isDetail) {
            container.classList.add('checklist-widget--detail');
        }

        // Titre
        const titleEl = document.createElement('div');
        titleEl.className = 'checklist-widget__title';
        titleEl.textContent = card.title;
        container.appendChild(titleEl);

        // Compteur de progression
        const progressEl = document.createElement('div');
        progressEl.className = 'checklist-widget__progress';
        container.appendChild(progressEl);

        // Liste des items
        const listEl = document.createElement('ul');
        listEl.className = 'checklist-widget__list';
        container.appendChild(listEl);

        // Render initial des items
        this._renderItems(card, listEl, progressEl);

        // Zone d'ajout
        const addZone = document.createElement('div');
        addZone.className = 'checklist-widget__add';

        const addInput = document.createElement('input');
        addInput.type = 'text';
        addInput.className = 'input input--sm checklist-widget__add-input';
        addInput.placeholder = 'Ajouter...';

        const addBtn = document.createElement('button');
        addBtn.className = 'checklist-widget__add-btn';
        addBtn.textContent = '+';
        addBtn.title = 'Ajouter un élément';

        addZone.appendChild(addInput);
        addZone.appendChild(addBtn);
        container.appendChild(addZone);

        // Event: ajouter un item
        const addItem = () => {
            const text = addInput.value.trim();
            if (!text) return;

            const newItem = {
                id: generateId('item'),
                text,
                checked: false,
            };

            const items = card.data.items || [];
            card.updateData({ items: [...items, newItem] });

            addInput.value = '';
            this._renderItems(card, listEl, progressEl);
            this._save();
        };

        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addItem();
        });

        addInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.stopPropagation();
                e.preventDefault();
                addItem();
            }
        });

        addInput.addEventListener('click', (e) => e.stopPropagation());

        parent.appendChild(container);
    }

    /**
     * Rend la liste des items et met à jour le compteur.
     *
     * @param {import('../../../models/Card.js').default} card
     * @param {HTMLElement} listEl
     * @param {HTMLElement} progressEl
     * @private
     */
    _renderItems(card, listEl, progressEl) {
        const items = card.data.items || [];

        // Clear et rebuild
        listEl.innerHTML = '';

        for (const item of items) {
            const li = document.createElement('li');
            li.className = 'checklist-widget__item';
            if (item.checked) {
                li.classList.add('checklist-widget__item--checked');
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.checked;
            checkbox.className = 'checklist-widget__checkbox';

            const label = document.createElement('span');
            label.className = 'checklist-widget__label';
            label.textContent = item.text;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'checklist-widget__delete';
            deleteBtn.textContent = '×';
            deleteBtn.title = 'Supprimer';

            li.appendChild(checkbox);
            li.appendChild(label);
            li.appendChild(deleteBtn);
            listEl.appendChild(li);

            // Event: toggle check
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this._toggleItem(card, item.id, listEl, progressEl);
            });

            checkbox.addEventListener('click', (e) => e.stopPropagation());

            // Event: supprimer
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._deleteItem(card, item.id, listEl, progressEl);
            });
        }

        // Met à jour le compteur
        this._updateProgress(items, progressEl);
    }

    /**
     * Met à jour l'affichage du compteur de progression.
     *
     * @param {Array} items
     * @param {HTMLElement} progressEl
     * @private
     */
    _updateProgress(items, progressEl) {
        const total = items.length;
        const checked = items.filter((i) => i.checked).length;

        if (total === 0) {
            progressEl.textContent = 'Liste vide';
            progressEl.style.setProperty('--progress', '0%');
        } else {
            const percent = Math.round((checked / total) * 100);
            progressEl.textContent = `${checked}/${total}`;
            progressEl.style.setProperty('--progress', `${percent}%`);

            if (checked === total) {
                progressEl.classList.add('checklist-widget__progress--complete');
            } else {
                progressEl.classList.remove('checklist-widget__progress--complete');
            }
        }
    }

    /**
     * Toggle l'état checked d'un item.
     *
     * @param {import('../../../models/Card.js').default} card
     * @param {string} itemId
     * @param {HTMLElement} listEl
     * @param {HTMLElement} progressEl
     * @private
     */
    _toggleItem(card, itemId, listEl, progressEl) {
        const items = card.data.items || [];
        const updatedItems = items.map((item) => (item.id === itemId ? { ...item, checked: !item.checked } : item));

        card.updateData({ items: updatedItems });
        this._renderItems(card, listEl, progressEl);
        this._save();
    }

    /**
     * Supprime un item de la liste.
     *
     * @param {import('../../../models/Card.js').default} card
     * @param {string} itemId
     * @param {HTMLElement} listEl
     * @param {HTMLElement} progressEl
     * @private
     */
    _deleteItem(card, itemId, listEl, progressEl) {
        const items = card.data.items || [];
        const updatedItems = items.filter((item) => item.id !== itemId);

        card.updateData({ items: updatedItems });
        this._renderItems(card, listEl, progressEl);
        this._save();
    }

    /**
     * Sauvegarde le board.
     *
     * @private
     */
    async _save() {
        await Container.get('BoardService').save();
    }
}
