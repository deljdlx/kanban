/**
 * CardListRenderer — Rendu de la liste des cartes d'une colonne.
 *
 * Responsabilités :
 *   - Création des CardView pour chaque carte
 *   - Application des filtres (FilterStore)
 *   - Mise à jour du compteur (visible/total)
 *   - Hooks card:beforeDestroy et card:rendered
 */
import CardView from '../CardView.js';
import FilterStore from '../../services/FilterStore.js';
import CardTypeRegistry from '../../services/CardTypeRegistry.js';
import Hooks from '../../plugins/HookRegistry.js';

export default class CardListRenderer {
    /**
     * Référence au model Column.
     * @type {import('../../models/Column.js').default}
     */
    _column;

    /**
     * Références aux CardViews rendues (pour cleanup).
     * @type {CardView[]}
     */
    _cardViews;

    /**
     * Callbacks pour les actions sur les cartes.
     * @type {{ onEdit: Function, onCardClick: Function }}
     */
    _callbacks;

    /**
     * @param {import('../../models/Column.js').default} column
     * @param {Object} callbacks
     * @param {Function} callbacks.onEdit - Appelé au clic sur "Éditer"
     * @param {Function} callbacks.onCardClick - Appelé au clic sur la carte
     */
    constructor(column, callbacks) {
        this._column = column;
        this._cardViews = [];
        this._callbacks = callbacks;
    }

    /**
     * Rend les cartes dans le conteneur.
     * Applique les filtres et met à jour le compteur.
     *
     * @param {HTMLElement} bodyElement - Conteneur .column-body
     * @param {HTMLElement} countElement - Élément .count pour afficher le nombre
     */
    render(bodyElement, countElement) {
        // Notifie les plugins avant de détruire les éléments DOM des cartes
        const cardElements = bodyElement.querySelectorAll('.card[data-id]');
        for (const el of cardElements) {
            Hooks.doAction('card:beforeDestroy', { cardId: el.dataset.id, element: el });
        }

        // Détruit les anciennes CardViews pour retirer leurs listeners
        this._destroyCardViews();

        bodyElement.innerHTML = '';

        const hasFilters = FilterStore.hasActiveFilters();
        let visibleCount = 0;

        this._column.cards.forEach((card) => {
            try {
                const cardView = new CardView(card, {
                    onEdit: this._callbacks.onEdit,
                    onCardClick: this._callbacks.onCardClick,
                });
                const el = cardView.render();
                this._cardViews.push(cardView);

                // Masque la carte si elle ne passe pas les filtres
                if (hasFilters && !FilterStore.matchCard(card)) {
                    el.classList.add('card--hidden');
                } else {
                    visibleCount++;
                }

                bodyElement.appendChild(el);
                Hooks.doAction('card:rendered', { card, element: el });
            } catch (error) {
                const label = this._safeLabel(card);
                console.error(`CardListRenderer : échec du rendu de la carte "${label}"`, error);
                bodyElement.appendChild(this._buildCardError(card));
            }
        });

        // Met à jour le compteur
        this._updateCount(countElement, visibleCount, hasFilters);

        // Rafraîchit les styles du CardTypeRegistry
        CardTypeRegistry.refresh();
    }

    /**
     * Détruit toutes les CardViews.
     */
    destroy() {
        this._destroyCardViews();
    }

    /**
     * @private
     */
    _destroyCardViews() {
        for (const cv of this._cardViews) {
            try {
                cv.destroy();
            } catch (error) {
                console.error("CardListRenderer : échec du destroy d'une CardView", error);
            }
        }
        this._cardViews = [];
    }

    /**
     * Construit un placeholder d'erreur pour une carte dont le rendu a échoué.
     *
     * @param {import('../../models/Card.js').default} card
     * @returns {HTMLElement}
     * @private
     */
    _buildCardError(card) {
        const el = document.createElement('div');
        el.className = 'card card--error';

        const label = this._safeLabel(card);
        const truncated = label.length > 30 ? label.slice(0, 30) + '...' : label;
        el.textContent = `Erreur de rendu : ${truncated}`;

        return el;
    }

    /**
     * Retourne un label lisible pour une carte, même si l'objet est corrompu.
     *
     * @param {*} card
     * @returns {string}
     * @private
     */
    _safeLabel(card) {
        try {
            return card.title || card.id || '?';
        } catch {
            return '?';
        }
    }

    /**
     * Met à jour l'affichage du compteur.
     *
     * @param {HTMLElement} countElement
     * @param {number} visibleCount
     * @param {boolean} hasFilters
     * @private
     */
    _updateCount(countElement, visibleCount, hasFilters) {
        if (!countElement) return;

        if (hasFilters) {
            countElement.textContent = visibleCount + '/' + this._column.count;
        } else {
            countElement.textContent = this._column.count;
        }
    }
}
