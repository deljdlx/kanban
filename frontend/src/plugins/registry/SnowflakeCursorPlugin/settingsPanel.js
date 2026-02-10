/**
 * settingsPanel.js — Construction de l'UI du panneau settings de SnowflakeCursorPlugin.
 *
 * Exporte une fonction `buildSettingsPanel(plugin, container)` qui remplit
 * le conteneur avec les contrôles (couleur, densité, taille, gravité, etc.).
 */
import { isPickrReady } from '../../lib/PickrLoader.js';
import StorageService from '../../../services/StorageService.js';

/** @type {string} Clé de stockage pour les réglages */
const SETTINGS_STORAGE_KEY = 'kanban:snowflakeSettings';

/**
 * Construit le panneau de settings du SnowflakeCursorPlugin.
 *
 * @param {Object} plugin         - Instance du SnowflakeCursorPlugin
 * @param {HTMLElement} container  - Conteneur fourni par ModalPluginSettings
 * @param {Object} defaultSettings - Réglages par défaut (pour le reset)
 */
export function buildSettingsPanel(plugin, container, defaultSettings) {
    const s = plugin._settings;

    // --- Couleur ---
    buildColorField(plugin, container, s);

    // --- Densité (maxParticles) ---
    buildRangeField(plugin, container, {
        label: 'Densité',
        key: 'maxParticles',
        min: 10,
        max: 300,
        step: 10,
        valueSuffix: ' flocons',
    });

    // --- Taille min ---
    buildRangeField(plugin, container, {
        label: 'Taille min',
        key: 'sizeMin',
        min: 0.5,
        max: 5,
        step: 0.5,
        valueSuffix: ' px',
    });

    // --- Taille max ---
    buildRangeField(plugin, container, {
        label: 'Taille max',
        key: 'sizeMax',
        min: 1,
        max: 10,
        step: 0.5,
        valueSuffix: ' px',
    });

    // --- Gravité ---
    buildRangeField(plugin, container, {
        label: 'Gravité',
        key: 'gravity',
        min: 0,
        max: 100,
        step: 5,
        valueSuffix: '',
    });

    // --- Durée de vie ---
    buildRangeField(plugin, container, {
        label: 'Durée de vie',
        key: 'lifetime',
        min: 0.5,
        max: 6,
        step: 0.5,
        valueSuffix: ' s',
    });

    // --- Bouton réinitialiser ---
    const resetGroup = document.createElement('div');
    resetGroup.className = 'form-group';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn--cancel';
    resetBtn.textContent = 'Réinitialiser les réglages';
    resetBtn.addEventListener('click', async () => {
        plugin._settings = { ...defaultSettings };
        await StorageService.remove(SETTINGS_STORAGE_KEY);

        container.innerHTML = '';
        buildSettingsPanel(plugin, container, defaultSettings);
    });
    resetGroup.appendChild(resetBtn);
    container.appendChild(resetGroup);
}

// ---------------------------------------------------------------
// Builders internes
// ---------------------------------------------------------------

/**
 * Champ couleur : label + preview carré + bouton "Modifier" → Pickr.
 *
 * @param {Object} plugin
 * @param {HTMLElement} container
 * @param {Object} settings
 */
function buildColorField(plugin, container, settings) {
    const row = document.createElement('div');
    row.className = 'scp-field';

    const label = document.createElement('label');
    label.className = 'scp-label';
    label.textContent = 'Couleur';

    const preview = document.createElement('div');
    preview.className = 'scp-color-preview';
    preview.style.background = settings.color;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--secondary btn--sm';
    btn.textContent = 'Modifier';

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isPickrReady()) return;

        plugin._destroySettingsPickr();

        plugin._settingsPickr = Pickr.create({
            el: btn,
            theme: 'nano',
            default: plugin._settings.color,
            position: 'bottom-middle',
            useAsButton: true,
            components: {
                preview: true,
                opacity: false,
                hue: true,
                interaction: { hex: true, input: true, save: true },
            },
        });

        plugin._settingsPickr.on('change', (color) => {
            const hex = color.toHEXA().toString();
            preview.style.background = hex;
            plugin._settings.color = hex;
            plugin._saveSettings();
        });

        plugin._settingsPickr.on('save', (_color, instance) => {
            instance.hide();
        });

        plugin._settingsPickr.on('hide', () => {
            plugin._destroySettingsPickr();
        });

        plugin._settingsPickr.show();
    });

    row.appendChild(label);
    row.appendChild(preview);
    row.appendChild(btn);
    container.appendChild(row);
}

/**
 * Champ slider générique : label + range + valeur affichée.
 *
 * @param {Object} plugin
 * @param {HTMLElement} container
 * @param {Object} opts - { label, key, min, max, step, valueSuffix }
 */
function buildRangeField(plugin, container, opts) {
    const row = document.createElement('div');
    row.className = 'scp-field';

    const label = document.createElement('label');
    label.className = 'scp-label';
    label.textContent = opts.label;

    const range = document.createElement('input');
    range.type = 'range';
    range.className = 'scp-range';
    range.min = opts.min;
    range.max = opts.max;
    range.step = opts.step;
    range.value = plugin._settings[opts.key];

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'scp-value';
    valueDisplay.textContent = plugin._settings[opts.key] + opts.valueSuffix;

    range.addEventListener('input', () => {
        const val = parseFloat(range.value);
        plugin._settings[opts.key] = val;
        valueDisplay.textContent = val + opts.valueSuffix;
        plugin._saveSettings();
    });

    row.appendChild(label);
    row.appendChild(range);
    row.appendChild(valueDisplay);
    container.appendChild(row);
}
