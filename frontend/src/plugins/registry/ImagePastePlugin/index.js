/**
 * index.js — Point d'entree du plugin ImagePaste.
 *
 * Assemble le manifest, la logique et les styles via PluginAssembler.
 */
import manifest from './manifest.json';
import plugin from './ImagePastePlugin.js';
import { STYLES } from './styles.js';
import { assemblePlugin } from '../../lib/PluginAssembler.js';

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
});
