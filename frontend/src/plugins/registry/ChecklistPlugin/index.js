/**
 * ChecklistPlugin — Point d'entrée.
 */
import { assemblePlugin } from '../../lib/PluginAssembler.js';
import manifest from './manifest.json';
import ChecklistPlugin from './ChecklistPlugin.js';
import { STYLES } from './styles.js';

const plugin = new ChecklistPlugin();

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
});
