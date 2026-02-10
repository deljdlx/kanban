/**
 * ColumnColorPlugin — Point d'entree et assemblage.
 *
 * Importe les modules du plugin et les assemble via PluginAssembler.
 */
import manifest from './manifest.json';
import plugin, { DEFAULT_SWATCHES } from './ColumnColorPlugin.js';
import { STYLES } from './styles.js';
import { buildSettingsPanel } from './settingsPanel.js';
import { assemblePlugin } from '../../lib/PluginAssembler.js';

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
    settingsPanel: buildSettingsPanel,
    settingsDefaults: DEFAULT_SWATCHES,
});
