/**
 * PomodoroPlugin — Point d'entrée.
 *
 * Assemble le plugin à partir du manifest et des modules.
 */
import { assemblePlugin } from '../../lib/PluginAssembler.js';
import manifest from './manifest.json';
import PomodoroPlugin from './PomodoroPlugin.js';
import { STYLES } from './styles.js';

const plugin = new PomodoroPlugin();

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
});
