/**
 * index.js — Point d'entrée du LiveSyncPlugin.
 */
import { assemblePlugin } from '../../lib/PluginAssembler.js';
import manifest from './manifest.json';
import LiveSyncPlugin from './LiveSyncPlugin.js';
import { buildSettingsPanel } from './settingsPanel.js';
import { STYLES } from './styles.js';

const plugin = new LiveSyncPlugin();

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
    settingsPanel: buildSettingsPanel,
});
