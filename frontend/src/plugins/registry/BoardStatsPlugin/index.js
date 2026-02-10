/**
 * BoardStatsPlugin — Point d'entree.
 */
import { assemblePlugin } from '../../lib/PluginAssembler.js';
import manifest from './manifest.json';
import BoardStatsPlugin from './BoardStatsPlugin.js';
import { STYLES } from './styles.js';

const plugin = new BoardStatsPlugin();

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
});
