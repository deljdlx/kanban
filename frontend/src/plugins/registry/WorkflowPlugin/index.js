/**
 * index.js — Point d'entrée du WorkflowPlugin.
 *
 * Assemble le plugin avec ses modules :
 *   - styles (CSS injecté)
 *
 * Pas de settingsPanel séparé : le plugin utilise registerTab
 * dans le hook modal:boardSettings:opened pour injecter l'onglet "Règles".
 */
import { assemblePlugin } from '../../lib/PluginAssembler.js';
import manifest from './manifest.json';
import WorkflowPlugin from './WorkflowPlugin.js';
import { STYLES } from './styles.js';

const plugin = new WorkflowPlugin();

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
});
