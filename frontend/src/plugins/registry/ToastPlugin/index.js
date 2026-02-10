/**
 * index.js — Point d'entrée du ToastPlugin.
 *
 * Assemble le plugin avec ses modules :
 *   - styles (CSS injecté)
 *   - settingsPanel (UI de réglages dynamique)
 */
import { assemblePlugin } from '../../lib/PluginAssembler.js';
import manifest from './manifest.json';
import ToastPlugin from './ToastPlugin.js';
import { STYLES } from './styles.js';
import { buildSettingsPanel } from './settingsPanel.js';

const plugin = new ToastPlugin();

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
    settingsPanel: buildSettingsPanel,
});
