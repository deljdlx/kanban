/**
 * index.js — Point d'entrée du BackendPlugin.
 */
import { assemblePlugin } from '../../lib/PluginAssembler.js';
import manifest from './manifest.json';
import BackendPlugin from './BackendPlugin.js';
import SyncIndicator from './SyncIndicator.js';
import { buildSettingsPanel } from './settingsPanel.js';
import { STYLES } from './styles.js';

const plugin = new BackendPlugin();
const syncIndicator = new SyncIndicator(plugin);

// Wrapper pour installer à la fois le plugin et l'indicateur
const wrappedPlugin = {
    async install(hooks) {
        await plugin.install(hooks);
        syncIndicator.install(hooks);
    },
    uninstall(hooks) {
        syncIndicator.uninstall(hooks);
        plugin.uninstall(hooks);
    },
    // Expose les méthodes publiques du plugin pour le settings panel
    getConfig: () => plugin.getConfig(),
    updateConfig: (updates) => plugin.updateConfig(updates),
    testConnection: () => plugin.testConnection(),
};

export default assemblePlugin(manifest, wrappedPlugin, {
    styles: STYLES,
    settingsPanel: buildSettingsPanel,
});
