/**
 * MarkdownPlugin — Point d'entree et assemblage.
 */
import manifest from './manifest.json';
import plugin from './MarkdownPlugin.js';
import { STYLES } from './styles.js';
import { buildSettingsPanel } from './settingsPanel.js';
import { assemblePlugin } from '../../lib/PluginAssembler.js';

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
    settingsPanel: buildSettingsPanel,
});
