/**
 * settingsPanel.js — Panneau de reglages du MarkdownPlugin.
 *
 * Permet de :
 *   - Activer/desactiver le rendu Markdown dans les cartes
 *   - Activer/desactiver le rendu Markdown dans les modales
 */

/**
 * Construit le panneau de reglages.
 *
 * @param {Object} plugin - Instance du plugin (this)
 * @param {HTMLElement} container - Conteneur DOM fourni par la modale
 */
export function buildSettingsPanel(plugin, container) {
    // --- Checkbox : activer dans les cartes ---
    const cardsWrapper = document.createElement('label');
    cardsWrapper.className = 'mdp-setting checkbox-row form-group';

    const cardsCheckbox = document.createElement('input');
    cardsCheckbox.type = 'checkbox';
    cardsCheckbox.checked = plugin._enableInCards;

    const cardsText = document.createElement('span');
    cardsText.textContent = 'Activer dans les cartes (vue board)';

    cardsWrapper.appendChild(cardsCheckbox);
    cardsWrapper.appendChild(cardsText);
    container.appendChild(cardsWrapper);

    cardsCheckbox.addEventListener('change', () => {
        plugin._enableInCards = cardsCheckbox.checked;
        plugin._saveSettings();
    });

    // --- Checkbox : activer dans les modales ---
    const modalsWrapper = document.createElement('label');
    modalsWrapper.className = 'mdp-setting checkbox-row form-group';

    const modalsCheckbox = document.createElement('input');
    modalsCheckbox.type = 'checkbox';
    modalsCheckbox.checked = plugin._enableInModals;

    const modalsText = document.createElement('span');
    modalsText.textContent = 'Activer dans les modales (detail + commentaires)';

    modalsWrapper.appendChild(modalsCheckbox);
    modalsWrapper.appendChild(modalsText);
    container.appendChild(modalsWrapper);

    modalsCheckbox.addEventListener('change', () => {
        plugin._enableInModals = modalsCheckbox.checked;
        plugin._saveSettings();
    });

    // --- Note explicative ---
    const note = document.createElement('p');
    note.className = 'form-hint';
    note.textContent = 'Les modifications prennent effet au prochain affichage des cartes/modales.';
    container.appendChild(note);
}
