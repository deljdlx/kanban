/**
 * ComplexityTaxonomyPlugin — Ajoute une taxonomie "Complexite" aux tickets.
 *
 * Exemple d'utilisation de TaxonomyPluginFactory.
 * Permet de taguer les tickets par niveau de complexite :
 *   - Simple (vert)
 *   - Moyenne (orange)
 *   - Complexe (rouge)
 *
 * Les termes sont personnalisables via le settings panel.
 */
import { createTaxonomyPlugin } from '../../lib/TaxonomyPluginFactory.js';

export default createTaxonomyPlugin({
    name: 'complexity-taxonomy',
    label: 'Taxonomie : Complexité',
    taxonomyKey: 'complexity',
    taxonomyLabel: 'Complexité',
    defaultTerms: {
        simple: { label: 'Simple', color: '#2ecc71' },
        medium: { label: 'Moyenne', color: '#f39c12' },
        complex: { label: 'Complexe', color: '#e74c3c' },
    },
    allowCustomTerms: true,
    tags: ['taxonomie', 'classification', 'carte', 'estimation'],
});
