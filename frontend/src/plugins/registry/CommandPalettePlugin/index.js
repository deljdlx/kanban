/**
 * index.js — Point d'entrée du CommandPalettePlugin.
 *
 * Assemble le manifest, la logique et les styles via PluginAssembler.
 */
import { assemblePlugin } from '../../lib/PluginAssembler.js';
import manifest from './manifest.json';
import CommandPalettePlugin from './CommandPalettePlugin.js';
import { STYLES } from './styles.js';

const plugin = new CommandPalettePlugin();

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
});
