/**
 * settingsPanel.js — Construction de l'UI du panneau settings de CardColorPlugin.
 *
 * Exporte une fonction unique `buildSettingsPanel(plugin, container)` qui
 * remplit le conteneur avec les controles de reinitialisation et de swatches.
 *
 * Le `plugin` recu en parametre est l'instance CardColorPlugin (pour acceder
 * a _swatches, _saveSwatches, _openSwatchPickr, resetColors, etc.).
 */

import StorageService from '../../../services/StorageService.js';

/** @type {string} Cle de stockage des swatches */
const SWATCHES_STORAGE_KEY = 'kanban:cardColorSwatches';

/**
 * Construit le panneau de settings du CardColorPlugin.
 *
 * Sections :
 *   1. Bouton "Reinitialiser les couleurs" (vide la map cardId->couleur)
 *   2. Grille de swatches editables + bouton [+] pour en ajouter
 *   3. Bouton "Reinitialiser les couleurs par defaut" (restaure les swatches)
 *
 * @param {Object} plugin    - Instance du CardColorPlugin
 * @param {HTMLElement} container - Conteneur fourni par ModalPluginSettings
 * @param {string[]} defaultSwatches - Swatches par defaut (fallback)
 */
export function buildSettingsPanel(plugin, container, defaultSwatches) {
    // --- Section 1 : Reinitialiser les couleurs des cartes ---
    const resetColorsBtn = document.createElement('button');
    resetColorsBtn.type = 'button';
    resetColorsBtn.className = 'btn btn--cancel';
    resetColorsBtn.textContent = 'Reinitialiser les couleurs';
    resetColorsBtn.addEventListener('click', () => {
        plugin.resetColors();
    });
    container.appendChild(resetColorsBtn);

    // --- Section 2 : Couleurs par defaut (swatches) ---
    const swatchGroup = document.createElement('div');
    swatchGroup.className = 'form-group';

    const swatchLabel = document.createElement('label');
    swatchLabel.className = 'label';
    swatchLabel.textContent = 'Couleurs par defaut';
    swatchGroup.appendChild(swatchLabel);

    const grid = document.createElement('div');
    grid.className = 'ccp-swatches-grid';
    swatchGroup.appendChild(grid);

    container.appendChild(swatchGroup);

    /**
     * Reconstruit la grille de swatches.
     */
    const renderGrid = () => {
        grid.innerHTML = '';

        plugin._swatches.forEach((color, index) => {
            const swatch = document.createElement('div');
            swatch.className = 'ccp-swatch';
            swatch.style.background = color;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'ccp-swatch-remove';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                plugin._swatches.splice(index, 1);
                plugin._saveSwatches();
                renderGrid();
            });

            swatch.appendChild(removeBtn);
            grid.appendChild(swatch);
        });

        // Bouton [+] pour ajouter un swatch
        const addBtn = document.createElement('button');
        addBtn.className = 'ccp-swatch ccp-swatch-add';
        addBtn.textContent = '+';
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            plugin._openSwatchPickr(addBtn, (newColor) => {
                plugin._swatches.push(newColor);
                plugin._saveSwatches();
                renderGrid();
            });
        });
        grid.appendChild(addBtn);
    };

    renderGrid();

    // --- Section 3 : Reinitialiser les swatches ---
    const resetGroup = document.createElement('div');
    resetGroup.className = 'form-group';

    const resetSwatchesBtn = document.createElement('button');
    resetSwatchesBtn.type = 'button';
    resetSwatchesBtn.className = 'btn btn--cancel';
    resetSwatchesBtn.textContent = 'Reinitialiser les couleurs par defaut';
    resetSwatchesBtn.addEventListener('click', async () => {
        plugin._swatches = [...defaultSwatches];
        await StorageService.remove(SWATCHES_STORAGE_KEY);
        renderGrid();
    });
    resetGroup.appendChild(resetSwatchesBtn);
    container.appendChild(resetGroup);
}
