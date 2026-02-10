/**
 * tags.js — Utilitaire de rendu des badges de tags.
 *
 * Factorise la logique dupliquée entre CardView et InfoPanel :
 * chaque tag est rendu comme un <span> avec couleur inline
 * depuis le registre TaxonomyService.
 */
import TaxonomyService from '../services/TaxonomyService.js';
import { hexToRgba } from './color.js';

/**
 * Crée des éléments <span> pour chaque tag et les ajoute au conteneur.
 *
 * @param {HTMLElement} container - Élément DOM dans lequel ajouter les badges
 * @param {Object<string, string[]>} tags - Map taxonomie → termes (ex: { priority: ['high'] })
 * @param {string} className - Classe CSS pour chaque badge (ex: 'card-tag')
 */
export function renderTagBadges(container, tags, className) {
    for (const [taxonomy, terms] of Object.entries(tags)) {
        for (const term of terms) {
            const tagEl = document.createElement('span');
            tagEl.className = className;

            const config = TaxonomyService.getTermConfig(taxonomy, term);
            if (config) {
                tagEl.style.background = hexToRgba(config.color, 0.2);
                tagEl.style.color = config.color;
                tagEl.textContent = config.label;
            } else {
                tagEl.textContent = term;
            }

            container.appendChild(tagEl);
        }
    }
}
