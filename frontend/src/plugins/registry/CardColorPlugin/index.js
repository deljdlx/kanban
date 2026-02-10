/**
 * index.js — Point d'entrée du CardColorPlugin.
 *
 * Lit le manifest et assemble le plugin en câblant les modules
 * déclarés : styles (CSS injecté) et settingsPanel (UI settings).
 */
import manifest from './manifest.json';
import plugin, { DEFAULT_SWATCHES } from './CardColorPlugin.js';
import { STYLES } from './styles.js';
import { buildSettingsPanel } from './settingsPanel.js';
import { assemblePlugin } from '../../lib/PluginAssembler.js';

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
    settingsPanel: buildSettingsPanel,
    settingsDefaults: DEFAULT_SWATCHES,
});
