/**
 * index.js — Point d'entrée du BackgroundImagePlugin.
 *
 * Lit le manifest et assemble le plugin. Pas de styles ni de settingsPanel
 * externe : ce plugin est assez petit pour tout gérer dans son entry.
 */
import manifest from './manifest.json';
import plugin from './BackgroundImagePlugin.js';
import { assemblePlugin } from '../../lib/PluginAssembler.js';

export default assemblePlugin(manifest, plugin);
