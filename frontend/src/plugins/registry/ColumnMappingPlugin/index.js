/**
 * ColumnMappingPlugin — Point d'entrée.
 *
 * Affiche des cartes miroir depuis d'autres boards dans les colonnes
 * du board courant (lecture seule, style atténué).
 */
import { assemblePlugin } from '../../lib/PluginAssembler.js';
import manifest from './manifest.json';
import ColumnMappingPlugin from './ColumnMappingPlugin.js';
import { STYLES } from './styles.js';

const plugin = new ColumnMappingPlugin();

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
});
