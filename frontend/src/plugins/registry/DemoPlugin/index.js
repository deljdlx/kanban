/**
 * index.js — Point d'entrée du DemoPlugin.
 *
 * Lit le manifest et assemble le plugin en câblant les modules
 * déclarés : styles (CSS injecté) et settingsPanel (UI settings).
 *
 * Ce fichier suit exactement le même pattern que les autres plugins :
 *   1. Import du manifest (métadonnées déclaratives)
 *   2. Import du plugin (logique métier)
 *   3. Import des modules annexes (styles, settings)
 *   4. Assemblage via PluginAssembler
 */
import manifest from './manifest.json';
import plugin from './DemoPlugin.js';
import { STYLES } from './styles.js';
import { buildSettingsPanel } from './settingsPanel.js';
import { assemblePlugin } from '../../lib/PluginAssembler.js';

export default assemblePlugin(manifest, plugin, {
    styles: STYLES,
    settingsPanel: buildSettingsPanel,
});
