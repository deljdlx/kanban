/**
 * index.js — Point d'entrée du BoardNotesPlugin.
 */
import { assemblePlugin } from '../../lib/PluginAssembler.js';
import manifest from './manifest.json';
import BoardNotesPlugin from './BoardNotesPlugin.js';
import { STYLES } from './styles.js';

const plugin = new BoardNotesPlugin();

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
});
