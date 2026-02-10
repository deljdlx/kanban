/**
 * index.js — Point d'entree du CustomFieldsPlugin.
 *
 * Lit le manifest et assemble le plugin en cablant styles et settingsPanel.
 */
import manifest from './manifest.json';
import plugin from './CustomFieldsPlugin.js';
import { STYLES } from './styles.js';
import { buildSettingsPanel } from './settingsPanel.js';
import { assemblePlugin } from '../../lib/PluginAssembler.js';

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
    settingsPanel: buildSettingsPanel,
});
