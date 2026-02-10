/**
 * Perspective3DPlugin — Point d'entree et assemblage.
 *
 * Importe les modules du plugin et les assemble via PluginAssembler.
 */
import manifest from './manifest.json';
import plugin from './Perspective3DPlugin.js';
import { STYLES } from './styles.js';
import { buildSettingsPanel } from './settingsPanel.js';
import { assemblePlugin } from '../../lib/PluginAssembler.js';

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
    settingsPanel: buildSettingsPanel,
});
