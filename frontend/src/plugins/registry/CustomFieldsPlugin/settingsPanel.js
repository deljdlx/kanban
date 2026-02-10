/**
 * settingsPanel.js — UI du panneau de parametres de CustomFieldsPlugin.
 *
 * Permet de gerer les definitions de champs personnalises :
 *   - Liste des champs : icone type + label + toggle showOnCard + modifier + supprimer
 *   - Edition inline : label + config dynamique + sauver/annuler
 *   - Formulaire d'ajout : input label + select type + zone config dynamique
 */

import FieldTypeRegistry from '../../lib/FieldTypeRegistry.js';

/**
 * Construit le panneau de settings du CustomFieldsPlugin.
 *
 * @param {Object} plugin - Instance du CustomFieldsPlugin
 * @param {HTMLElement} container - Conteneur fourni par ModalPluginSettings
 */
export function buildSettingsPanel(plugin, container) {
    /** @type {string|null} ID du champ en cours d'edition (un seul a la fois) */
    let editingFieldId = null;

    // --- Section 1 : Liste des champs existants ---
    const listTitle = document.createElement('h4');
    listTitle.className = 'cfp-settings-add-title';
    listTitle.textContent = 'Champs definis';
    container.appendChild(listTitle);

    const listContainer = document.createElement('div');
    listContainer.className = 'cfp-settings-list';
    container.appendChild(listContainer);

    /**
     * Reconstruit la liste des champs.
     */
    const renderList = () => {
        listContainer.innerHTML = '';
        const fields = plugin.getFields();

        if (fields.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'cfp-settings-empty';
            empty.textContent = 'Aucun champ defini.';
            listContainer.appendChild(empty);
            return;
        }

        for (const field of fields) {
            const wrapper = document.createElement('div');
            wrapper.className = 'cfp-settings-item-wrapper';

            // --- Ligne resume ---
            const typeDef = FieldTypeRegistry.get(field.type);
            const item = document.createElement('div');
            item.className = 'cfp-settings-item';

            const icon = document.createElement('span');
            icon.className = 'cfp-settings-item-icon';
            icon.textContent = typeDef ? typeDef.icon : '?';

            const label = document.createElement('span');
            label.className = 'cfp-settings-item-label';
            label.textContent = field.label;

            const typeBadge = document.createElement('span');
            typeBadge.className = 'cfp-settings-item-type';
            typeBadge.textContent = typeDef ? typeDef.label : field.type;

            // Toggle showOnCard
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = `cfp-settings-toggle${field.showOnCard ? ' active' : ''}`;
            toggle.title = field.showOnCard ? 'Visible sur la carte' : 'Masque sur la carte';
            toggle.addEventListener('click', () => {
                plugin.updateField(field.id, { showOnCard: !field.showOnCard });
                renderList();
            });

            // Bouton modifier
            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'btn btn--secondary btn--sm cfp-settings-edit';
            editBtn.textContent = 'Modifier';
            editBtn.addEventListener('click', () => {
                editingFieldId = editingFieldId === field.id ? null : field.id;
                renderList();
            });

            // Bouton supprimer
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn--danger-ghost btn--sm cfp-settings-remove';
            removeBtn.textContent = 'Supprimer';
            removeBtn.addEventListener('click', () => {
                plugin.removeField(field.id);
                if (editingFieldId === field.id) editingFieldId = null;
                renderList();
            });

            item.append(icon, label, typeBadge, toggle, editBtn, removeBtn);
            wrapper.appendChild(item);

            // --- Formulaire d'edition inline (deplie si editingFieldId match) ---
            if (editingFieldId === field.id) {
                const editForm = buildEditForm(field, typeDef, plugin, () => {
                    editingFieldId = null;
                    renderList();
                });
                wrapper.appendChild(editForm);
            }

            listContainer.appendChild(wrapper);
        }
    };

    renderList();

    // --- Section 2 : Formulaire d'ajout ---
    const addSection = document.createElement('div');
    addSection.className = 'cfp-settings-add';
    container.appendChild(addSection);

    const addTitle = document.createElement('h4');
    addTitle.className = 'cfp-settings-add-title';
    addTitle.textContent = 'Ajouter un champ';
    addSection.appendChild(addTitle);

    // Ligne : label + type
    const addRow = document.createElement('div');
    addRow.className = 'cfp-settings-add-row';
    addSection.appendChild(addRow);

    // Input label
    const labelField = document.createElement('div');
    labelField.className = 'cfp-settings-add-field';
    const labelLabel = document.createElement('label');
    labelLabel.className = 'label';
    labelLabel.textContent = 'Nom du champ';
    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'input';
    labelInput.placeholder = 'ex: Sprint, Estimation...';
    labelField.append(labelLabel, labelInput);

    // Select type
    const typeField = document.createElement('div');
    typeField.className = 'cfp-settings-add-field';
    const typeLabel = document.createElement('label');
    typeLabel.className = 'label';
    typeLabel.textContent = 'Type';
    const typeSelect = document.createElement('select');
    typeSelect.className = 'input';

    for (const [key, def] of FieldTypeRegistry.getAll()) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = `${def.icon} ${def.label}`;
        typeSelect.appendChild(opt);
    }

    typeField.append(typeLabel, typeSelect);
    addRow.append(labelField, typeField);

    // Zone config dynamique (pour select, number)
    const configZone = document.createElement('div');
    configZone.className = 'cfp-settings-config-zone';
    addSection.appendChild(configZone);

    /** @type {Object} Configuration en cours pour le nouveau champ */
    let pendingConfig = {};

    /**
     * Met a jour la zone de config selon le type selectionne.
     */
    const updateConfigZone = () => {
        configZone.innerHTML = '';
        const selectedType = typeSelect.value;
        const typeDef = FieldTypeRegistry.get(selectedType);

        if (typeDef && typeDef.renderConfig) {
            pendingConfig = {};
            typeDef.renderConfig(configZone, pendingConfig, (newConfig) => {
                pendingConfig = newConfig;
            });
        } else {
            pendingConfig = {};
        }
    };

    typeSelect.addEventListener('change', updateConfigZone);
    updateConfigZone();

    // Bouton ajouter
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn--primary';
    addBtn.textContent = 'Ajouter';
    addBtn.addEventListener('click', () => {
        const newLabel = labelInput.value.trim();
        if (!newLabel) return;

        const type = typeSelect.value;
        const config = { ...pendingConfig };
        if (config.options) {
            config.options = config.options.filter((o) => o.trim() !== '');
        }

        plugin.addField(newLabel, type, config);
        labelInput.value = '';
        pendingConfig = {};
        updateConfigZone();
        renderList();
    });
    addSection.appendChild(addBtn);
}

// ---------------------------------------------------------------
// Formulaire d'edition inline
// ---------------------------------------------------------------

/**
 * Construit le formulaire d'edition inline pour un champ existant.
 *
 * Permet de modifier le label et la configuration specifique au type.
 * Le type lui-meme n'est pas modifiable (changer de type casserait les
 * valeurs existantes).
 *
 * @param {Object} field - Definition du champ
 * @param {Object|undefined} typeDef - Definition du type de champ
 * @param {Object} plugin - Instance du CustomFieldsPlugin
 * @param {Function} onDone - Callback apres sauvegarde ou annulation
 * @returns {HTMLElement}
 */
function buildEditForm(field, typeDef, plugin, onDone) {
    const form = document.createElement('div');
    form.className = 'cfp-settings-edit-form';

    // --- Label ---
    const labelGroup = document.createElement('div');
    labelGroup.className = 'cfp-settings-add-field';
    const labelLabel = document.createElement('label');
    labelLabel.className = 'label';
    labelLabel.textContent = 'Nom du champ';
    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'input';
    labelInput.value = field.label;
    labelGroup.append(labelLabel, labelInput);
    form.appendChild(labelGroup);

    // --- Config dynamique (pour select, number) ---
    let editConfig = { ...field.config };
    const configZone = document.createElement('div');
    configZone.className = 'cfp-settings-config-zone';

    if (typeDef && typeDef.renderConfig) {
        typeDef.renderConfig(configZone, editConfig, (newConfig) => {
            editConfig = newConfig;
        });
    }

    form.appendChild(configZone);

    // --- Boutons sauver / annuler ---
    const actions = document.createElement('div');
    actions.className = 'cfp-settings-edit-actions';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn--primary btn--sm';
    saveBtn.textContent = 'Enregistrer';
    saveBtn.addEventListener('click', () => {
        const newLabel = labelInput.value.trim();
        if (!newLabel) return;

        // Pour select, filtre les options vides
        const cleanConfig = { ...editConfig };
        if (cleanConfig.options) {
            cleanConfig.options = cleanConfig.options.filter((o) => o.trim() !== '');
        }

        plugin.updateField(field.id, {
            label: newLabel,
            config: cleanConfig,
        });
        onDone();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn--cancel btn--sm';
    cancelBtn.textContent = 'Annuler';
    cancelBtn.addEventListener('click', onDone);

    actions.append(saveBtn, cancelBtn);
    form.appendChild(actions);

    return form;
}
