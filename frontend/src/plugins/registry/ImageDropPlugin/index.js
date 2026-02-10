/**
 * ImageDropPlugin — Point d'entree et assemblage.
 */
import manifest from './manifest.json';
import plugin from './ImageDropPlugin.js';
import { STYLES } from './styles.js';
import { assemblePlugin } from '../../lib/PluginAssembler.js';

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
});
