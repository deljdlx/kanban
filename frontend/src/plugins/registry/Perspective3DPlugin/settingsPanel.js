/**
 * settingsPanel.js — Panneau de configuration pour Perspective3DPlugin.
 *
 * Permet de régler :
 *   - Profondeur de perspective
 *   - Rotation X (tilt avant/arrière)
 *   - Rotation Y (tilt gauche/droite)
 *   - Zoom (éloignement/rapprochement)
 *   - Intensité globale
 *   - Effets de survol (cartes/colonnes)
 *   - Presets prédéfinis
 */

/** Presets prédéfinis */
const PRESETS = {
    subtle: {
        label: 'Subtil',
        values: { perspective: 1500, rotateX: 5, rotateY: 0, zoom: 1, intensity: 0.7 },
    },
    normal: {
        label: 'Normal',
        values: { perspective: 1200, rotateX: 8, rotateY: 0, zoom: 1, intensity: 1 },
    },
    dramatic: {
        label: 'Dramatique',
        values: { perspective: 800, rotateX: 15, rotateY: -5, zoom: 0.9, intensity: 1.3 },
    },
    isometric: {
        label: 'Isométrique',
        values: { perspective: 1000, rotateX: 12, rotateY: -8, zoom: 0.95, intensity: 1 },
    },
    flat: {
        label: 'À plat',
        values: { perspective: 2000, rotateX: 0, rotateY: 0, zoom: 1, intensity: 0.5 },
    },
};

/**
 * Construit le panneau de settings.
 *
 * @param {Object} plugin - Instance du plugin
 * @param {HTMLElement} container - Conteneur du panneau
 */
export function buildSettingsPanel(plugin, container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'p3d-settings';

    const settings = plugin.getSettings();

    // --- Presets ---
    const presetSection = document.createElement('div');
    presetSection.className = 'p3d-setting';

    const presetLabel = document.createElement('div');
    presetLabel.className = 'label';
    presetLabel.textContent = 'Presets';
    presetSection.appendChild(presetLabel);

    const presetRow = document.createElement('div');
    presetRow.className = 'p3d-preset-row';

    for (const [key, preset] of Object.entries(PRESETS)) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn--secondary btn--sm';
        btn.textContent = preset.label;
        btn.addEventListener('click', () => {
            // Batch update : une seule sauvegarde et un seul render
            plugin.setSettings(preset.values);
            updateAllSliders();
        });
        presetRow.appendChild(btn);
    }

    presetSection.appendChild(presetRow);
    wrapper.appendChild(presetSection);

    // --- Divider ---
    const divider1 = document.createElement('div');
    divider1.className = 'p3d-divider';
    wrapper.appendChild(divider1);

    // --- Sliders ---
    const sliders = [];

    function createSlider(label, key, min, max, step, unit = '') {
        const setting = document.createElement('div');
        setting.className = 'p3d-setting';

        const header = document.createElement('div');
        header.className = 'p3d-setting-header';

        const labelEl = document.createElement('span');
        labelEl.className = 'p3d-setting-label';
        labelEl.textContent = label;

        const valueEl = document.createElement('span');
        valueEl.className = 'p3d-setting-value';
        valueEl.textContent = `${plugin.getSettings()[key]}${unit}`;

        header.appendChild(labelEl);
        header.appendChild(valueEl);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'p3d-slider';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = plugin.getSettings()[key];

        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            valueEl.textContent = `${value}${unit}`;
            plugin.setSetting(key, value);
        });

        setting.appendChild(header);
        setting.appendChild(slider);
        wrapper.appendChild(setting);

        sliders.push({ slider, valueEl, key, unit });
    }

    createSlider('Perspective', 'perspective', 500, 2000, 50, 'px');
    createSlider('Rotation X', 'rotateX', -30, 30, 1, '°');
    createSlider('Rotation Y', 'rotateY', -30, 30, 1, '°');
    createSlider('Zoom', 'zoom', 0.5, 1.5, 0.05, '×');
    createSlider('Intensité', 'intensity', 0.3, 1.5, 0.1, '×');

    function updateAllSliders() {
        const current = plugin.getSettings();
        for (const { slider, valueEl, key, unit } of sliders) {
            slider.value = current[key];
            valueEl.textContent = `${current[key]}${unit}`;
        }
    }

    // --- Divider ---
    const divider2 = document.createElement('div');
    divider2.className = 'p3d-divider';
    wrapper.appendChild(divider2);

    // --- Checkboxes ---
    const checkboxes = {};

    function createCheckbox(label, key) {
        const row = document.createElement('div');
        row.className = 'checkbox-row';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `p3d-${key}`;
        checkbox.checked = plugin.getSettings()[key];

        checkbox.addEventListener('change', () => {
            plugin.setSetting(key, checkbox.checked);
        });

        const labelEl = document.createElement('label');
        labelEl.htmlFor = `p3d-${key}`;
        labelEl.textContent = label;

        row.appendChild(checkbox);
        row.appendChild(labelEl);
        wrapper.appendChild(row);

        // Garde une référence pour updateAllCheckboxes
        checkboxes[key] = checkbox;
    }

    createCheckbox('Effet survol cartes', 'cardHoverLift');
    createCheckbox('Effet survol colonnes', 'columnHoverLift');

    function updateAllCheckboxes() {
        const current = plugin.getSettings();
        for (const [key, checkbox] of Object.entries(checkboxes)) {
            checkbox.checked = current[key];
        }
    }

    // --- Divider ---
    const divider3 = document.createElement('div');
    divider3.className = 'p3d-divider';
    wrapper.appendChild(divider3);

    // --- Reset button ---
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn--cancel';
    resetBtn.textContent = 'Réinitialiser';
    resetBtn.addEventListener('click', () => {
        plugin.resetSettings();
        updateAllSliders();
        updateAllCheckboxes();
    });
    wrapper.appendChild(resetBtn);

    container.appendChild(wrapper);
}
