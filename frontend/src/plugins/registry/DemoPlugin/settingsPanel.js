/**
 * settingsPanel.js — Panneau de réglages du DemoPlugin.
 *
 * Exporte une fonction unique `buildSettingsPanel(plugin, container)` qui
 * construit l'interface de configuration dans le conteneur fourni.
 *
 * Pour ce plugin, un seul contrôle : une checkbox pour activer/désactiver
 * l'affichage des timestamps sur les cartes.
 *
 * Ce fichier montre le pattern minimal d'un settings panel :
 *   1. Lire l'état actuel du plugin (plugin._enabled)
 *   2. Construire un contrôle HTML
 *   3. Au changement, mettre à jour le plugin et rafraîchir le DOM
 */

/**
 * Construit le panneau de settings du DemoPlugin.
 *
 * @param {Object}      plugin    - Instance du DemoPlugin (accès à _enabled, _saveSettings, _processAllCards)
 * @param {HTMLElement}  container - Conteneur fourni par ModalPluginSettings
 */
export function buildSettingsPanel(plugin, container) {
    // --- Checkbox on/off ---
    const wrapper = document.createElement('label');
    wrapper.className = 'checkbox-row';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = plugin._enabled;

    const text = document.createElement('span');
    text.textContent = "Afficher l'horodatage";

    wrapper.appendChild(checkbox);
    wrapper.appendChild(text);
    container.appendChild(wrapper);

    // Au changement : toggle _enabled, persiste et rafraîchit les cartes
    checkbox.addEventListener('change', () => {
        plugin._enabled = checkbox.checked;
        plugin._saveSettings();
        plugin._processAllCards();
    });
}
