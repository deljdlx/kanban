/**
 * index.js — Point d'entree du ColumnTogglePlugin.
 *
 * Lit le manifest et assemble le plugin avec ses styles CSS.
 */
import { assemblePlugin } from '../../lib/PluginAssembler.js';
import manifest from './manifest.json';
import ColumnTogglePlugin from './ColumnTogglePlugin.js';
import { STYLES } from './styles.js';

const plugin = new ColumnTogglePlugin();

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
});
