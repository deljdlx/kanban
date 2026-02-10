/**
 * settingsPanel.js — Panneau de réglages du ToastPlugin.
 *
 * Exporte `buildSettingsPanel(plugin, container)` qui construit
 * l'interface de configuration à partir des descripteurs découverts
 * dynamiquement par le plugin (plugin._descriptors).
 *
 * Le panneau est entièrement dynamique : les descripteurs sont groupés
 * par catégorie, et chaque événement a une checkbox + un champ de message.
 *
 * Si un nouveau plugin ajoute un hook avec métadonnée `notification`,
 * il apparaîtra automatiquement dans ce panneau.
 */

/**
 * Construit le panneau de settings du ToastPlugin.
 *
 * @param {Object}      plugin    - Instance du ToastPlugin
 * @param {HTMLElement}  container - Conteneur fourni par ModalPluginSettings
 */
export function buildSettingsPanel(plugin, container) {
    const descriptors = plugin._descriptors;
    const defaultSettings = plugin._defaultSettings;

    /** @type {Map<string, HTMLInputElement>} Référence vers chaque checkbox */
    const checkboxes = new Map();
    /** @type {Map<string, HTMLInputElement>} Référence vers chaque champ de template */
    const templateInputs = new Map();

    // --- Description ---
    const desc = document.createElement('p');
    desc.className = 'tsp-description';
    desc.textContent =
        'Choisissez les événements pour lesquels afficher une notification, et personnalisez les messages :';
    container.appendChild(desc);

    // --- Bloc explicatif ---
    const allVarNames = _collectVariableNames(descriptors);
    if (allVarNames.length > 0) {
        const helpBlock = document.createElement('div');
        helpBlock.className = 'tsp-help';

        const lines = [
            '<strong>Messages personnalisables</strong><br>',
            'Utilisez des variables entre accolades dans vos messages. ',
            "Elles seront remplacées par la valeur réelle au moment de l'affichage.<br>",
        ];

        for (const varName of allVarNames) {
            lines.push(`<code>{${varName}}</code> — ${_describeVariable(varName)}<br>`);
        }

        helpBlock.innerHTML = lines.join('');
        container.appendChild(helpBlock);
    }

    // --- Grouper par catégorie ---
    const categories = _groupByCategory(descriptors);

    // --- Construire les catégories ---
    for (const [categoryLabel, events] of categories) {
        const group = document.createElement('div');
        group.className = 'tsp-group';

        const groupLabel = document.createElement('div');
        groupLabel.className = 'tsp-group__label';
        groupLabel.textContent = categoryLabel;
        group.appendChild(groupLabel);

        for (const event of events) {
            const row = document.createElement('div');
            row.className = 'tsp-event';

            // --- Checkbox + label ---
            const checkboxLabel = document.createElement('label');
            checkboxLabel.className = 'checkbox-row';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = plugin._settings.enabledEvents[event.hook] !== false;
            checkboxes.set(event.hook, checkbox);

            const text = document.createElement('span');
            text.textContent = event.label;

            checkboxLabel.appendChild(checkbox);
            checkboxLabel.appendChild(text);
            row.appendChild(checkboxLabel);

            // --- Champ template ---
            const templateInput = document.createElement('input');
            templateInput.type = 'text';
            templateInput.className = 'input input--sm tsp-template';
            templateInput.value = plugin._settings.messageTemplates[event.hook] || '';
            templateInput.placeholder = defaultSettings.messageTemplates[event.hook] || '';
            templateInput.disabled = !checkbox.checked;
            templateInputs.set(event.hook, templateInput);

            const varNames = Object.keys(event.variables);
            if (varNames.length > 0) {
                templateInput.title = 'Variables : ' + varNames.map((v) => `{${v}}`).join(', ');
            }

            row.appendChild(templateInput);
            group.appendChild(row);

            // --- Listeners ---
            checkbox.addEventListener('change', () => {
                plugin._settings.enabledEvents[event.hook] = checkbox.checked;
                templateInput.disabled = !checkbox.checked;
                plugin._saveSettings();
            });

            templateInput.addEventListener('input', () => {
                plugin._settings.messageTemplates[event.hook] = templateInput.value;
                plugin._saveSettings();
            });
        }

        container.appendChild(group);
    }

    // --- Bouton Réinitialiser ---
    const resetGroup = document.createElement('div');
    resetGroup.className = 'form-group';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn--cancel';
    resetBtn.textContent = 'Réinitialiser';
    resetBtn.addEventListener('click', () => {
        plugin._settings.enabledEvents = { ...defaultSettings.enabledEvents };
        plugin._settings.messageTemplates = { ...defaultSettings.messageTemplates };
        plugin._saveSettings();

        for (const [key, checkbox] of checkboxes) {
            checkbox.checked = defaultSettings.enabledEvents[key] !== false;
        }
        for (const [key, input] of templateInputs) {
            input.value = defaultSettings.messageTemplates[key] || '';
            input.disabled = !checkboxes.get(key).checked;
        }
    });
    resetGroup.appendChild(resetBtn);
    container.appendChild(resetGroup);
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

/**
 * Groupe les descripteurs par catégorie (ordre d'apparition conservé).
 *
 * @param {Array<Object>} descriptors
 * @returns {Map<string, Array<Object>>}
 * @private
 */
function _groupByCategory(descriptors) {
    const map = new Map();
    for (const desc of descriptors) {
        if (!map.has(desc.category)) {
            map.set(desc.category, []);
        }
        map.get(desc.category).push(desc);
    }
    return map;
}

/**
 * Collecte tous les noms de variables uniques utilisés dans les descripteurs.
 *
 * @param {Array<Object>} descriptors
 * @returns {string[]}
 * @private
 */
function _collectVariableNames(descriptors) {
    const names = new Set();
    for (const desc of descriptors) {
        for (const varName of Object.keys(desc.variables)) {
            names.add(varName);
        }
    }
    return [...names];
}

/**
 * Retourne une description humaine d'une variable connue.
 *
 * @param {string} varName
 * @returns {string}
 * @private
 */
function _describeVariable(varName) {
    const descriptions = {
        title: 'nom de la carte ou de la note',
        column: 'nom de la colonne de destination',
        error: "message d'erreur",
    };
    return descriptions[varName] || varName;
}
