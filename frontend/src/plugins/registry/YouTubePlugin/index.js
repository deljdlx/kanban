/**
 * YouTubePlugin — Point d'entree.
 */
import { assemblePlugin } from '../../lib/PluginAssembler.js';
import manifest from './manifest.json';
import YouTubePlugin from './YouTubePlugin.js';
import { STYLES } from './styles.js';

const plugin = new YouTubePlugin();

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
});
