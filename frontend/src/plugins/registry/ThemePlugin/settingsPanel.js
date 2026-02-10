/**
 * settingsPanel.js — Construction de l'UI du panneau settings de ThemePlugin.
 *
 * Exporte une fonction `buildSettingsPanel(plugin, container)` qui
 * remplit le conteneur avec les sélecteurs de preset, font, couleur d'accent
 * et échelle.
 */
import { PRESETS, FONT_PRESETS } from './presets.js';
import { isPickrReady } from '../../lib/PickrLoader.js';
import StorageService from '../../../services/StorageService.js';

/** @type {string} Clé de stockage pour le thème */
const STORAGE_KEY = 'kanban:theme';

/**
 * Construit le panneau de settings du ThemePlugin.
 *
 * @param {Object} plugin         - Instance du ThemePlugin
 * @param {HTMLElement} container  - Conteneur fourni par ModalPluginSettings
 * @param {Object} defaultSettings - Réglages par défaut (pour le reset)
 */
export function buildSettingsPanel(plugin, container, defaultSettings) {
    buildPresetSelector(plugin, container);
    buildFontSelector(plugin, container);
    buildAccentColorField(plugin, container);
    buildScaleField(plugin, container);

    // --- Reset ---
    const resetGroup = document.createElement('div');
    resetGroup.className = 'form-group';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn--cancel';
    resetBtn.textContent = 'Réinitialiser le thème';
    resetBtn.addEventListener('click', async () => {
        plugin._settings = { ...defaultSettings };
        await StorageService.remove(STORAGE_KEY);
        plugin._applyTheme();

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
 * Grille de presets (boutons radio visuels avec preview couleur).
 */
function buildPresetSelector(plugin, container) {
    const label = document.createElement('label');
    label.className = 'label';
    label.textContent = 'Thème';
    container.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'tp-preset-grid';

    for (const [key, preset] of Object.entries(PRESETS)) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tp-preset-btn';
        if (key === plugin._settings.preset) {
            btn.classList.add('tp-preset-btn--active');
        }

        const preview = document.createElement('div');
        preview.className = 'tp-preset-preview';
        const bg = preset.values['--color-bg'] || '#0f0f1a';
        const primary = preset.values['--color-primary'] || '#6c63ff';
        const text = preset.values['--color-text'] || '#e2e2e2';
        preview.style.background = bg;
        preview.style.borderColor = primary;
        preview.innerHTML = `<span style="color:${text};font-size:0.6rem">Aa</span>`;

        const name = document.createElement('span');
        name.className = 'tp-preset-name';
        name.textContent = preset.label;

        btn.appendChild(preview);
        btn.appendChild(name);

        btn.addEventListener('click', () => {
            plugin._settings.preset = key;
            if (key === 'retro') {
                plugin._settings.fontFamily = preset.values['--font-family'] || null;
            }
            plugin._settings.overrides = {};
            plugin._saveSettings();
            plugin._applyTheme();

            container.innerHTML = '';
            buildSettingsPanel(plugin, container, plugin._defaultSettings);
        });

        grid.appendChild(btn);
    }

    container.appendChild(grid);
}

/**
 * Grille de polices (boutons avec preview de la font).
 */
function buildFontSelector(plugin, container) {
    const label = document.createElement('label');
    label.className = 'label';
    label.textContent = 'Police';
    container.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'tp-font-grid';

    const currentFont = plugin._settings.fontFamily;

    for (const fp of FONT_PRESETS) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tp-font-btn';
        const isActive = currentFont === fp.value || (!currentFont && fp.value === FONT_PRESETS[0].value);
        if (isActive) {
            btn.classList.add('tp-font-btn--active');
        }
        btn.style.fontFamily = fp.value;
        btn.textContent = fp.label;

        btn.addEventListener('click', () => {
            plugin._settings.fontFamily = fp.value === FONT_PRESETS[0].value ? null : fp.value;
            plugin._saveSettings();
            plugin._applyTheme();

            grid.querySelectorAll('.tp-font-btn').forEach((b) => {
                b.classList.remove('tp-font-btn--active');
            });
            btn.classList.add('tp-font-btn--active');
        });

        grid.appendChild(btn);
    }

    container.appendChild(grid);
}

/**
 * Champ couleur d'accent (--color-primary) via Pickr.
 */
function buildAccentColorField(plugin, container) {
    const row = document.createElement('div');
    row.className = 'tp-field';

    const label = document.createElement('label');
    label.className = 'label';
    label.textContent = "Couleur d'accent";

    const preset = PRESETS[plugin._settings.preset] || PRESETS.default;
    const currentColor = plugin._settings.overrides['--color-primary'] || preset.values['--color-primary'] || '#6c63ff';

    const preview = document.createElement('div');
    preview.className = 'tp-color-preview';
    preview.style.background = currentColor;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tp-color-btn';
    btn.textContent = 'Modifier';

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isPickrReady()) return;

        plugin._destroySettingsPickr();

        plugin._settingsPickr = Pickr.create({
            el: btn,
            theme: 'nano',
            default: currentColor,
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
            plugin._settings.overrides['--color-primary'] = hex;
            plugin._applyTheme();
        });

        plugin._settingsPickr.on('save', (_color, instance) => {
            plugin._saveSettings();
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
 * Slider d'échelle globale (font-size sur <html>).
 */
function buildScaleField(plugin, container) {
    const row = document.createElement('div');
    row.className = 'tp-field';

    const label = document.createElement('label');
    label.className = 'label';
    label.textContent = 'Échelle';

    const range = document.createElement('input');
    range.type = 'range';
    range.className = 'tp-range';
    range.min = 70;
    range.max = 140;
    range.step = 5;
    range.value = plugin._settings.scale;

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'tp-value';
    valueDisplay.textContent = plugin._settings.scale + '%';

    range.addEventListener('input', () => {
        const val = parseInt(range.value, 10);
        plugin._settings.scale = val;
        valueDisplay.textContent = val + '%';
        plugin._saveSettings();
        plugin._applyTheme();
    });

    row.appendChild(label);
    row.appendChild(range);
    row.appendChild(valueDisplay);
    container.appendChild(row);
}
