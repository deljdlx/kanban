/**
 * index.js — Point d'entrée du ThemePlugin.
 *
 * Lit le manifest et assemble le plugin en câblant les modules
 * déclarés : styles (CSS injecté) et settingsPanel (UI settings).
 *
 * Les données (presets.js) sont importées directement par le entry
 * et le settingsPanel, car elles sont spécifiques à la logique du plugin.
 */
import manifest from './manifest.json';
import plugin, { DEFAULT_SETTINGS } from './ThemePlugin.js';
import { STYLES } from './styles.js';
import { buildSettingsPanel } from './settingsPanel.js';
import { assemblePlugin } from '../../lib/PluginAssembler.js';

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
    settingsPanel: buildSettingsPanel,
    settingsDefaults: DEFAULT_SETTINGS,
});
