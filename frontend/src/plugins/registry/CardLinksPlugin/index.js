/**
 * index.js — Point d'entrée du CardLinksPlugin.
 *
 * Lit le manifest et assemble le plugin en câblant les styles CSS.
 */
import manifest from './manifest.json';
import plugin from './CardLinksPlugin.js';
import { STYLES } from './styles.js';
import { assemblePlugin } from '../../lib/PluginAssembler.js';

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
});
