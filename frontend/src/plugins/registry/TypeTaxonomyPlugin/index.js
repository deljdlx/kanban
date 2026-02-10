/**
 * TypeTaxonomyPlugin — Taxonomie "Type" pour categoriser les tickets.
 *
 * Termes par defaut :
 *   - feature (violet)
 *   - bug (rouge)
 *   - ux (jaune)
 *
 * Les termes sont personnalisables via le settings panel.
 */
import { createTaxonomyPlugin } from '../../lib/TaxonomyPluginFactory.js';

export default createTaxonomyPlugin({
    name: 'type-taxonomy',
    label: 'Taxonomie : Type',
    taxonomyKey: 'type',
    taxonomyLabel: 'Type',
    defaultTerms: {
        feature: { label: 'feature', color: '#6c63ff' },
        bug: { label: 'bug', color: '#ff6b6b' },
        ux: { label: 'ux', color: '#ffc857' },
    },
    allowCustomTerms: true,
    tags: ['taxonomie', 'classification', 'carte'],
});
