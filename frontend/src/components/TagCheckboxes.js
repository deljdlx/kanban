/**
 * TagCheckboxes — Helpers pour le rendu et la lecture de checkboxes de tags.
 *
 * Utilisé par ModalAddCard et ModalEditCard pour éviter la duplication
 * du bloc de checkboxes par taxonomie.
 */
import TaxonomyService from '../services/TaxonomyService.js';
import { hexToRgba } from '../utils/color.js';

/**
 * Construit les groupes de checkboxes pour chaque taxonomie
 * et les ajoute au conteneur donné.
 *
 * @param {HTMLElement} container  - Élément parent où ajouter les groupes
 * @param {Object<string, string[]>} [checkedTags={}] - Tags pré-cochés ({ type: ['bug'], ... })
 */
export function buildTagCheckboxes(container, checkedTags = {}) {
    for (const [taxonomyKey, taxonomy] of Object.entries(TaxonomyService.getTaxonomies())) {
        const group = document.createElement('div');
        group.className = 'modal-tag-group';

        const groupLabel = document.createElement('label');
        groupLabel.textContent = taxonomy.label;
        group.appendChild(groupLabel);

        const termsContainer = document.createElement('div');
        termsContainer.className = 'modal-tag-terms';

        for (const [termKey, termConfig] of Object.entries(taxonomy.terms)) {
            const checkboxLabel = document.createElement('label');
            checkboxLabel.className = 'modal-tag-checkbox';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.taxonomy = taxonomyKey;
            checkbox.dataset.term = termKey;

            const termsForTaxonomy = checkedTags[taxonomyKey] || [];
            checkbox.checked = termsForTaxonomy.includes(termKey);

            const badge = document.createElement('span');
            badge.className = 'modal-tag-badge';
            badge.textContent = termConfig.label;
            badge.style.background = hexToRgba(termConfig.color, 0.2);
            badge.style.color = termConfig.color;

            checkboxLabel.appendChild(checkbox);
            checkboxLabel.appendChild(badge);
            termsContainer.appendChild(checkboxLabel);
        }

        group.appendChild(termsContainer);
        container.appendChild(group);
    }
}

/**
 * Lit les checkboxes cochées dans un conteneur et retourne
 * un objet tags par taxonomie.
 *
 * @param {HTMLElement} container - Élément contenant les checkboxes (ex: overlay)
 * @returns {Object<string, string[]>} Ex: { type: ['bug'], priority: ['high'] }
 */
export function readTagCheckboxes(container) {
    const tags = {};
    const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');

    for (const checkbox of checkboxes) {
        const taxonomy = checkbox.dataset.taxonomy;
        const term = checkbox.dataset.term;
        if (!tags[taxonomy]) {
            tags[taxonomy] = [];
        }
        tags[taxonomy].push(term);
    }

    return tags;
}
