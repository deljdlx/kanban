/**
 * PluginAssembler — Assemble un plugin à partir de son manifest et de ses modules.
 *
 * Chaque plugin a un index.js qui :
 *   1. Importe son manifest.json (déclaratif : name, label, fichiers)
 *   2. Importe statiquement les fichiers déclarés dans le manifest
 *   3. Appelle assemblePlugin() pour câbler le tout
 *
 * L'assembleur s'occupe de :
 *   - Injecter name/label depuis le manifest
 *   - Câbler _injectStyles() si un module `styles` est fourni
 *   - Câbler settingsPanel() si un module `settingsPanel` est fourni
 *
 * Cela permet aux fichiers entry (ThemePlugin.js, etc.) de ne contenir
 * que la logique métier, sans importer les fichiers frères eux-mêmes.
 *
 * Usage dans un index.js de plugin :
 *
 *   import manifest from './manifest.json';
 *   import plugin from './ThemePlugin.js';
 *   import { STYLES } from './styles.js';
 *   import { buildSettingsPanel } from './settingsPanel.js';
 *   import { assemblePlugin } from '../../lib/PluginAssembler.js';
 *
 *   export default assemblePlugin(manifest, plugin, {
 *       styles: STYLES,
 *       settingsPanel: buildSettingsPanel,
 *   });
 */

/**
 * Assemble un plugin prêt à l'emploi.
 *
 * @param {Object} manifest   - Le manifest.json du plugin
 * @param {string} manifest.name        - Identifiant unique du plugin
 * @param {string} manifest.label       - Nom lisible du plugin
 * @param {string} [manifest.description] - Description du plugin
 * @param {string[]} [manifest.tags]    - Tags pour classifier le plugin
 * @param {Object} [manifest.hooks]     - Déclaration des hooks
 * @param {string[]} [manifest.hooks.provides] - Hooks fournis par ce plugin
 * @param {string[]} [manifest.hooks.listens]  - Hooks écoutés par ce plugin (documentation)
 * @param {number}   [manifest.priority=10]    - Priorité d'enregistrement (plus petit = enregistré plus tôt)
 * @param {boolean}  [manifest.disabled=false]  - Si true, le plugin n'est pas chargé par l'application
 * @param {Object} plugin     - L'objet plugin (logique métier : install, uninstall, etc.)
 * @param {Object} [modules]  - Modules optionnels à câbler
 * @param {string} [modules.styles]           - CSS string à injecter (depuis styles.js)
 * @param {Function} [modules.settingsPanel]  - Fonction buildSettingsPanel(plugin, container, defaults)
 * @param {*} [modules.settingsDefaults]      - Argument passé en 3e position à buildSettingsPanel
 * @returns {Object} Le plugin assemblé, prêt pour PluginManager.register()
 */
export function assemblePlugin(manifest, plugin, modules = {}) {
    // --- Métadonnées depuis le manifest ---
    plugin.name = manifest.name;
    plugin.label = manifest.label;
    plugin.description = manifest.description || '';
    plugin.tags = manifest.tags || [];
    plugin.hooks = manifest.hooks || {};
    plugin.priority = manifest.priority ?? 10;
    plugin.disabled = manifest.disabled || false;

    // --- Styles : câble _injectStyles() / _removeStyles() ---
    if (modules.styles) {
        plugin._injectStyles = function () {
            if (this._styleEl) return;

            const style = document.createElement('style');
            style.textContent = modules.styles;
            document.head.appendChild(style);
            this._styleEl = style;
        };

        plugin._removeStyles = function () {
            if (this._styleEl) {
                this._styleEl.remove();
                this._styleEl = null;
            }
        };
    }

    // --- Settings panel : câble settingsPanel() ---
    if (modules.settingsPanel) {
        plugin.settingsPanel = function (container) {
            modules.settingsPanel(this, container, modules.settingsDefaults);
        };
    }

    return plugin;
}
