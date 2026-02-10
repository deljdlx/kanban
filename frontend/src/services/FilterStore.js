/**
 * FilterStore — Stocke les filtres actifs du board.
 *
 * Singleton EventEmitter. Les vues écoutent 'change' pour
 * re-render quand les filtres bougent.
 *
 * Filtres disponibles :
 *   - assignee  : ID d'un user (ou null = tous)
 *   - author    : ID d'un user (ou null = tous)
 *   - tags      : { taxonomy: [term, ...], ... } — intersection par taxonomie
 *
 * Une carte passe le filtre si :
 *   - assignee est null OU correspond à card.assignee
 *   - author est null OU correspond à card.author
 *   - Pour chaque taxonomie dans tags : la carte possède au moins un des termes cochés
 *     (si aucun terme coché pour une taxonomie, pas de filtre sur celle-ci)
 */
import EventEmitter from '../lib/EventEmitter.js';

class FilterStore extends EventEmitter {
    /**
     * @type {{ assignee: string|null, author: string|null, tags: Object<string, string[]> }}
     */
    _filters;

    constructor() {
        super();
        this._filters = {
            assignee: null,
            author: null,
            tags: {},
        };
    }

    /**
     * Retourne une copie des filtres actifs.
     * @returns {{ assignee: string|null, author: string|null, tags: Object<string, string[]> }}
     */
    getFilters() {
        return {
            assignee: this._filters.assignee,
            author: this._filters.author,
            tags: { ...this._filters.tags },
        };
    }

    /**
     * Met à jour un filtre et notifie les listeners.
     *
     * @param {string} key   - 'assignee', 'author', ou 'tags'
     * @param {*} value       - La nouvelle valeur du filtre
     */
    setFilter(key, value) {
        this._filters[key] = value;
        this.emit('change');
    }

    /**
     * Réinitialise tous les filtres.
     */
    reset() {
        this._filters = { assignee: null, author: null, tags: {} };
        this.emit('change');
    }

    /**
     * Teste si une carte correspond aux filtres actifs.
     *
     * @param {import('../models/Card.js').default} card
     * @returns {boolean}
     */
    matchCard(card) {
        const { assignee, author, tags } = this._filters;

        // Filtre par assignee
        if (assignee && card.assignee !== assignee) {
            return false;
        }

        // Filtre par author
        if (author && card.author !== author) {
            return false;
        }

        // Filtre par tags : pour chaque taxonomie cochée,
        // la carte doit avoir au moins un des termes sélectionnés
        const cardTags = card.tags;
        for (const [taxonomy, selectedTerms] of Object.entries(tags)) {
            if (selectedTerms.length === 0) {
                continue;
            }
            const cardTerms = cardTags[taxonomy] || [];
            const hasMatch = selectedTerms.some((term) => cardTerms.includes(term));
            if (!hasMatch) {
                return false;
            }
        }

        return true;
    }

    /**
     * Indique si au moins un filtre est actif.
     * @returns {boolean}
     */
    hasActiveFilters() {
        if (this._filters.assignee || this._filters.author) {
            return true;
        }
        for (const terms of Object.values(this._filters.tags)) {
            if (terms.length > 0) {
                return true;
            }
        }
        return false;
    }
}

import Container from '../Container.js';

const filterStore = new FilterStore();
Container.set('FilterStore', filterStore);

export { FilterStore };
export default filterStore;
