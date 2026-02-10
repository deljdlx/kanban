/**
 * DevToolsPlugin — Point d'entrée.
 *
 * Assemble le plugin à partir du manifest et du module principal.
 * Pas de styles ni de settingsPanel : ce plugin ne touche pas au DOM.
 */
import { assemblePlugin } from '../../lib/PluginAssembler.js';
import manifest from './manifest.json';
import DevToolsPlugin from './DevToolsPlugin.js';

const plugin = new DevToolsPlugin();

export default assemblePlugin(manifest, plugin);
