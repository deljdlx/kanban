/**
 * index.js — Point d'entrée du plugin KeyboardShortcuts.
 *
 * Assemble le plugin avec ses styles et son panneau de réglages.
 */
import { assemblePlugin } from '../../lib/PluginAssembler.js';
import manifest from './manifest.json';
import KeyboardShortcutsPlugin from './KeyboardShortcutsPlugin.js';
import { STYLES } from './styles.js';
import { buildSettingsPanel } from './settingsPanel.js';

const plugin = new KeyboardShortcutsPlugin();

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
    settingsPanel: buildSettingsPanel,
});
