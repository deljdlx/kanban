/**
 * settingsPanel.js — Panneau de reglages du ColumnColorPlugin.
 *
 * Permet de :
 *   - Reinitialiser toutes les couleurs de colonnes
 *   - Gerer les swatches par defaut (ajouter / supprimer / reinitialiser)
 */
import StorageService from '../../../services/StorageService.js';

/** @type {string} Cle de stockage des swatches */
const SWATCHES_STORAGE_KEY = 'kanban:columnColorSwatches';

/**
 * Construit le panneau de reglages dans le conteneur fourni.
 *
 * @param {Object} plugin          - Instance du plugin (this)
 * @param {HTMLElement} container   - Conteneur DOM fourni par la modale
 * @param {string[]} defaultSwatches - Swatches par defaut (pour le reset)
 */
export function buildSettingsPanel(plugin, container, defaultSwatches) {
    // --- Bouton reset des couleurs ---
    const resetColorsBtn = document.createElement('button');
    resetColorsBtn.type = 'button';
    resetColorsBtn.className = 'btn btn--cancel';
    resetColorsBtn.textContent = 'Reinitialiser les couleurs';
    resetColorsBtn.addEventListener('click', () => {
        plugin.resetColors();
    });
    container.appendChild(resetColorsBtn);

    // --- Gestion des swatches ---
    const swatchGroup = document.createElement('div');
    swatchGroup.className = 'form-group';

    const swatchLabel = document.createElement('label');
    swatchLabel.className = 'label';
    swatchLabel.textContent = 'Couleurs par defaut';
    swatchGroup.appendChild(swatchLabel);

    const grid = document.createElement('div');
    grid.className = 'colcp-swatches-grid';
    swatchGroup.appendChild(grid);

    container.appendChild(swatchGroup);

    const renderGrid = () => {
        grid.innerHTML = '';

        plugin._swatches.forEach((color, index) => {
            const swatch = document.createElement('div');
            swatch.className = 'colcp-swatch';
            swatch.style.background = color;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'colcp-swatch-remove';
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

        // Bouton ajouter un swatch
        const addBtn = document.createElement('button');
        addBtn.className = 'colcp-swatch colcp-swatch-add';
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

    // --- Bouton reset des swatches ---
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
