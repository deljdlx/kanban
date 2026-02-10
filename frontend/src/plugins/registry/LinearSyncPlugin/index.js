/**
 * index.js — Point d'entree du LinearSyncPlugin.
 *
 * Lit le manifest et assemble le plugin avec ses styles et son
 * panneau de configuration.
 */
import { assemblePlugin } from '../../lib/PluginAssembler.js';
import manifest from './manifest.json';
import LinearSyncPlugin from './LinearSyncPlugin.js';
import { buildPluginSettings } from './settingsPanel.js';
import { STYLES } from './styles.js';

const plugin = new LinearSyncPlugin();

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
    settingsPanel: buildPluginSettings,
});
