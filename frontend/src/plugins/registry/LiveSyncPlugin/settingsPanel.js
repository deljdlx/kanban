/**
 * settingsPanel.js — Panneau de réglages du LiveSyncPlugin.
 *
 * Permet de choisir la fréquence de polling (intervalle entre
 * deux vérifications de changements provenant d'autres onglets).
 */
import { POLL_OPTIONS } from './LiveSyncPlugin.js';

/**
 * Construit le panneau de settings du LiveSyncPlugin.
 *
 * @param {import('./LiveSyncPlugin.js').default} plugin - Instance du plugin
 * @param {HTMLElement} container - Conteneur fourni par ModalPluginSettings
 */
export function buildSettingsPanel(plugin, container) {
    // --- Label ---
    const label = document.createElement('label');
    label.className = 'label';
    label.textContent = 'Fréquence de synchronisation';
    container.appendChild(label);

    // --- Select ---
    const select = document.createElement('select');
    select.className = 'input';

    for (const option of POLL_OPTIONS) {
        const opt = document.createElement('option');
        opt.value = String(option.value);
        opt.textContent = option.label;
        if (option.value === plugin._pollInterval) {
            opt.selected = true;
        }
        select.appendChild(opt);
    }

    container.appendChild(select);

    // --- Description ---
    const hint = document.createElement('p');
    hint.className = 'form-hint';
    hint.textContent = "Intervalle entre deux vérifications de changements provenant d'autres onglets.";
    container.appendChild(hint);

    // --- Handler ---
    select.addEventListener('change', () => {
        plugin._pollInterval = Number(select.value);
        plugin._saveSettings();
        plugin.restartPolling();
    });
}
