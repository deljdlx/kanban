/**
 * PriorityTaxonomyPlugin — Taxonomie "Priorite" pour les tickets.
 *
 * Termes par defaut :
 *   - high (rouge)
 *   - medium (orange)
 *   - low (vert)
 *
 * Les termes sont personnalisables via le settings panel.
 */
import { createTaxonomyPlugin } from '../../lib/TaxonomyPluginFactory.js';

export default createTaxonomyPlugin({
    name: 'priority-taxonomy',
    label: 'Taxonomie : Priorité',
    taxonomyKey: 'priority',
    taxonomyLabel: 'Priorité',
    defaultTerms: {
        high: { label: 'haute', color: '#ff4444' },
        medium: { label: 'moyenne', color: '#ffaa00' },
        low: { label: 'faible', color: '#44bb44' },
    },
    allowCustomTerms: true,
    tags: ['taxonomie', 'classification', 'carte', 'priorite'],
});
