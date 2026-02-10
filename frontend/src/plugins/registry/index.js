/**
 * registry/index.js — Liste centralisée des plugins disponibles.
 *
 * C'est le seul fichier à modifier pour ajouter ou retirer un plugin.
 * Chaque plugin est importé depuis son dossier et exporté dans un tableau.
 *
 * L'ordre d'enregistrement est déterminé par le champ `priority` du manifest
 * (plus petit = enregistré plus tôt, défaut = 10).
 * L'ordre du tableau n'a plus d'impact fonctionnel.
 *
 * À terme, ce fichier pourra être remplacé par un appel backend
 * (GET /api/plugins) qui retourne la même structure.
 */
import ThemePlugin from './ThemePlugin/index.js';
import BackgroundImagePlugin from './BackgroundImagePlugin/index.js';
import SnowflakeCursorPlugin from './SnowflakeCursorPlugin/index.js';
import CardColorPlugin from './CardColorPlugin/index.js';
import ColumnColorPlugin from './ColumnColorPlugin/index.js';
import MarkdownPlugin from './MarkdownPlugin/index.js';
import Perspective3DPlugin from './Perspective3DPlugin/index.js';
import ImageDropPlugin from './ImageDropPlugin/index.js';
import ImagePastePlugin from './ImagePastePlugin/index.js';
import ImageGarbageCollectorPlugin from './ImageGarbageCollectorPlugin/index.js';

// Taxonomies (via TaxonomyPluginFactory)
import TypeTaxonomyPlugin from './TypeTaxonomyPlugin/index.js';
import PriorityTaxonomyPlugin from './PriorityTaxonomyPlugin/index.js';
import ComplexityTaxonomyPlugin from './ComplexityTaxonomyPlugin/index.js';

import DemoPlugin from './DemoPlugin/index.js';

// Widgets (cartes spéciales interactives)
import ClickCounterPlugin from './ClickCounterPlugin/index.js';
import ChecklistPlugin from './ChecklistPlugin/index.js';
import YouTubePlugin from './YouTubePlugin/index.js';
import BoardStatsPlugin from './BoardStatsPlugin/index.js';
import PomodoroPlugin from './PomodoroPlugin/index.js';

// Productivité
import BoardNotesPlugin from './BoardNotesPlugin/index.js';
import CardLinksPlugin from './CardLinksPlugin/index.js';
import FileAttachmentPlugin from './FileAttachmentPlugin/index.js';
import CustomFieldsPlugin from './CustomFieldsPlugin/index.js';

// Sync multi-onglet
import LiveSyncPlugin from './LiveSyncPlugin/index.js';

// Animation
import AnimationPlugin from './AnimationPlugin/index.js';

// Automatisation
import WorkflowPlugin from './WorkflowPlugin/index.js';

// Visualisation multi-board
import ColumnMappingPlugin from './ColumnMappingPlugin/index.js';

// Vue
import ColumnTogglePlugin from './ColumnTogglePlugin/index.js';

// Navigation
import KeyboardShortcutsPlugin from './KeyboardShortcutsPlugin/index.js';
import CommandPalettePlugin from './CommandPalettePlugin/index.js';

// Integration
import LinearSyncPlugin from './LinearSyncPlugin/index.js';

// Développeur
import DevToolsPlugin from './DevToolsPlugin/index.js';

// Notification (priority: 99 — découvre dynamiquement les hooks des autres plugins)
import ToastPlugin from './ToastPlugin/index.js';

export default [
    // Core plugins
    ThemePlugin,
    BackgroundImagePlugin,
    SnowflakeCursorPlugin,
    CardColorPlugin,
    ColumnColorPlugin,
    MarkdownPlugin,
    Perspective3DPlugin,
    ImageDropPlugin,
    ImagePastePlugin,
    ImageGarbageCollectorPlugin,

    // Taxonomies
    TypeTaxonomyPlugin,
    PriorityTaxonomyPlugin,
    ComplexityTaxonomyPlugin,

    // Widgets
    ClickCounterPlugin,
    ChecklistPlugin,
    YouTubePlugin,
    BoardStatsPlugin,
    PomodoroPlugin,

    // Productivité
    BoardNotesPlugin,
    CardLinksPlugin,
    FileAttachmentPlugin,
    CustomFieldsPlugin,

    // Demo
    DemoPlugin,

    // Sync multi-onglet
    LiveSyncPlugin,

    // Animation
    AnimationPlugin,

    // Automatisation
    WorkflowPlugin,

    // Visualisation multi-board
    ColumnMappingPlugin,

    // Vue
    ColumnTogglePlugin,

    // Navigation
    KeyboardShortcutsPlugin,
    CommandPalettePlugin,

    // Integration
    LinearSyncPlugin,

    // Développeur
    DevToolsPlugin,

    // Notification (priority: 99 — découvre dynamiquement les hooks des autres plugins)
    ToastPlugin,
];
