/**
 * FieldTypeRegistry — Registre transversal des types de champs personnalises.
 *
 * Singleton exporté. Fournit un catalogue de types (text, number, date,
 * select, checkbox, url) reutilisable par tout plugin qui gere des champs.
 *
 * Chaque type implemente une interface uniforme :
 *   - label / icon          : affichage
 *   - defaultValue          : valeur initiale
 *   - renderEdit(...)       : input dans les modales (retourne { getValue, destroy })
 *   - renderDisplay?(...)   : affichage lecture seule (card detail)
 *   - renderConfig?(...)    : config specifique au type (ex: options select)
 *   - validate?(...)        : validation optionnelle
 *   - format?(...)          : formatage texte pour badges
 */

// ---------------------------------------------------------------
// Classe FieldTypeRegistry
// ---------------------------------------------------------------

class FieldTypeRegistry {
    /**
     * @type {Map<string, FieldTypeDefinition>}
     */
    _types = new Map();

    /**
     * Enregistre un type de champ.
     *
     * @param {string} key - Identifiant unique (ex: 'text', 'number')
     * @param {FieldTypeDefinition} definition
     */
    register(key, definition) {
        this._types.set(key, definition);
    }

    /**
     * Retourne la definition d'un type.
     *
     * @param {string} key
     * @returns {FieldTypeDefinition|undefined}
     */
    get(key) {
        return this._types.get(key);
    }

    /**
     * Retourne toutes les definitions sous forme d'array [key, definition].
     *
     * @returns {Array<[string, FieldTypeDefinition]>}
     */
    getAll() {
        return [...this._types.entries()];
    }

    /**
     * Verifie si un type est enregistre.
     *
     * @param {string} key
     * @returns {boolean}
     */
    has(key) {
        return this._types.has(key);
    }
}

// ---------------------------------------------------------------
// Types integres
// ---------------------------------------------------------------

/**
 * Cree un element <input> standard avec les attributs courants.
 *
 * @param {string} type - Type HTML (text, number, date, url)
 * @param {*} value - Valeur initiale
 * @param {Function} onChange - Callback sur changement
 * @param {Object} [attrs] - Attributs supplementaires
 * @returns {HTMLInputElement}
 */
function createInput(type, value, onChange, attrs = {}) {
    const input = document.createElement('input');
    input.type = type;
    input.className = 'input cfp-field-input';
    if (value !== null && value !== undefined) {
        input.value = value;
    }
    for (const [k, v] of Object.entries(attrs)) {
        input.setAttribute(k, String(v));
    }
    const handler = () => onChange(input.value);
    input.addEventListener('input', handler);
    /** @type {Function} Reference au handler pour pouvoir le retirer (ex: numberType) */
    input._handler = handler;
    return input;
}

// --- TEXT ---
const textType = {
    label: 'Texte',
    icon: 'Aa',
    defaultValue: '',

    renderEdit(container, value, _config, onChange) {
        const input = createInput('text', value ?? '', onChange);
        input.placeholder = 'Saisir du texte...';
        container.appendChild(input);
        return {
            getValue: () => input.value,
            destroy: () => input.remove(),
        };
    },

    format(value) {
        return value || '';
    },
};

// --- NUMBER ---
const numberType = {
    label: 'Nombre',
    icon: '#',
    defaultValue: null,

    renderEdit(container, value, config, onChange) {
        const input = createInput('number', value ?? '', onChange, {
            ...(config?.min !== null && config?.min !== undefined ? { min: config.min } : {}),
            ...(config?.max !== null && config?.max !== undefined ? { max: config.max } : {}),
        });
        input.placeholder = 'Saisir un nombre...';
        // Override onChange pour convertir en number
        input.removeEventListener('input', input._handler);
        input.addEventListener('input', () => {
            const val = input.value === '' ? null : Number(input.value);
            onChange(val);
        });
        container.appendChild(input);
        return {
            getValue: () => (input.value === '' ? null : Number(input.value)),
            destroy: () => input.remove(),
        };
    },

    renderConfig(container, config, onChange) {
        const row = document.createElement('div');
        row.className = 'cfp-config-row';

        // Unit
        const unitLabel = document.createElement('label');
        unitLabel.className = 'cfp-config-label';
        unitLabel.textContent = 'Unite';
        const unitInput = document.createElement('input');
        unitInput.type = 'text';
        unitInput.className = 'input cfp-config-input';
        unitInput.placeholder = 'ex: pts, h, €';
        unitInput.value = config?.unit || '';
        unitInput.addEventListener('input', () => {
            onChange({ ...config, unit: unitInput.value });
        });

        // Min
        const minLabel = document.createElement('label');
        minLabel.className = 'cfp-config-label';
        minLabel.textContent = 'Min';
        const minInput = document.createElement('input');
        minInput.type = 'number';
        minInput.className = 'input cfp-config-input';
        minInput.placeholder = '—';
        minInput.value = config?.min ?? '';
        minInput.addEventListener('input', () => {
            const val = minInput.value === '' ? undefined : Number(minInput.value);
            onChange({ ...config, min: val });
        });

        // Max
        const maxLabel = document.createElement('label');
        maxLabel.className = 'cfp-config-label';
        maxLabel.textContent = 'Max';
        const maxInput = document.createElement('input');
        maxInput.type = 'number';
        maxInput.className = 'input cfp-config-input';
        maxInput.placeholder = '—';
        maxInput.value = config?.max ?? '';
        maxInput.addEventListener('input', () => {
            const val = maxInput.value === '' ? undefined : Number(maxInput.value);
            onChange({ ...config, max: val });
        });

        row.append(unitLabel, unitInput, minLabel, minInput, maxLabel, maxInput);
        container.appendChild(row);
    },

    validate(value, config) {
        if (value === null || value === undefined) return true;
        if (typeof value !== 'number' || isNaN(value)) return false;
        if (config?.min !== null && config?.min !== undefined && value < config.min) return false;
        if (config?.max !== null && config?.max !== undefined && value > config.max) return false;
        return true;
    },

    format(value, config) {
        if (value === null || value === undefined) return '';
        const unit = config?.unit ? ` ${config.unit}` : '';
        return `${value}${unit}`;
    },
};

// --- DATE ---
const dateType = {
    label: 'Date',
    icon: '📅',
    defaultValue: null,

    renderEdit(container, value, _config, onChange) {
        const input = createInput('date', value ?? '', onChange);
        container.appendChild(input);
        return {
            getValue: () => input.value || null,
            destroy: () => input.remove(),
        };
    },

    format(value) {
        if (!value) return '';
        // Tente de formater en local
        try {
            const d = new Date(value + 'T00:00:00');
            return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
            return value;
        }
    },
};

// --- SELECT ---
const selectType = {
    label: 'Liste',
    icon: '▼',
    defaultValue: null,

    renderEdit(container, value, config, onChange) {
        const select = document.createElement('select');
        select.className = 'input cfp-field-input';

        // Option vide
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '— Choisir —';
        select.appendChild(emptyOpt);

        const options = config?.options || [];
        for (const opt of options) {
            const el = document.createElement('option');
            el.value = opt;
            el.textContent = opt;
            if (opt === value) el.selected = true;
            select.appendChild(el);
        }

        // Si la valeur actuelle n'est plus dans la liste, l'afficher quand meme
        if (value && !options.includes(value)) {
            const orphan = document.createElement('option');
            orphan.value = value;
            orphan.textContent = `${value} (obsolete)`;
            orphan.selected = true;
            select.appendChild(orphan);
        }

        select.addEventListener('change', () => {
            onChange(select.value || null);
        });

        container.appendChild(select);
        return {
            getValue: () => select.value || null,
            destroy: () => select.remove(),
        };
    },

    renderConfig(container, config, onChange) {
        const wrapper = document.createElement('div');
        wrapper.className = 'cfp-config-select-options';

        const label = document.createElement('label');
        label.className = 'cfp-config-label';
        label.textContent = 'Options';
        wrapper.appendChild(label);

        const list = document.createElement('div');
        list.className = 'cfp-config-options-list';
        wrapper.appendChild(list);

        const currentOptions = [...(config?.options || [])];

        /** Re-render la liste des options */
        const renderOptions = () => {
            list.innerHTML = '';
            for (let i = 0; i < currentOptions.length; i++) {
                const row = document.createElement('div');
                row.className = 'cfp-config-option-row';

                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'input cfp-config-input';
                input.value = currentOptions[i];
                input.addEventListener('input', () => {
                    currentOptions[i] = input.value;
                    onChange({ ...config, options: [...currentOptions] });
                });

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'cfp-config-option-remove';
                removeBtn.textContent = '×';
                removeBtn.addEventListener('click', () => {
                    currentOptions.splice(i, 1);
                    onChange({ ...config, options: [...currentOptions] });
                    renderOptions();
                });

                row.append(input, removeBtn);
                list.appendChild(row);
            }
        };

        renderOptions();

        // Bouton ajouter
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn btn--secondary btn--sm cfp-config-add-option';
        addBtn.textContent = '+ Ajouter une option';
        addBtn.addEventListener('click', () => {
            currentOptions.push('');
            onChange({ ...config, options: [...currentOptions] });
            renderOptions();
            // Focus le dernier input
            const inputs = list.querySelectorAll('input');
            if (inputs.length > 0) inputs[inputs.length - 1].focus();
        });
        wrapper.appendChild(addBtn);

        container.appendChild(wrapper);
    },

    format(value) {
        return value || '';
    },
};

// --- CHECKBOX ---
const checkboxType = {
    label: 'Case a cocher',
    icon: '☑',
    defaultValue: false,

    renderEdit(container, value, _config, onChange) {
        const label = document.createElement('label');
        label.className = 'cfp-checkbox-label';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'cfp-checkbox-input';
        input.checked = !!value;
        input.addEventListener('change', () => onChange(input.checked));

        label.appendChild(input);
        container.appendChild(label);
        return {
            getValue: () => input.checked,
            destroy: () => label.remove(),
        };
    },

    format(value) {
        return value ? '✓' : '✗';
    },
};

// --- URL ---
const urlType = {
    label: 'URL',
    icon: '🔗',
    defaultValue: '',

    renderEdit(container, value, _config, onChange) {
        const input = createInput('url', value ?? '', onChange);
        input.placeholder = 'https://...';
        container.appendChild(input);
        return {
            getValue: () => input.value,
            destroy: () => input.remove(),
        };
    },

    renderDisplay(container, value) {
        if (!value) return;
        const link = document.createElement('a');
        link.href = value;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'cfp-url-link';
        // Affiche un domaine court
        try {
            link.textContent = new URL(value).hostname;
        } catch {
            link.textContent = value;
        }
        container.appendChild(link);
    },

    format(value) {
        if (!value) return '';
        try {
            return new URL(value).hostname;
        } catch {
            return value;
        }
    },
};

// ---------------------------------------------------------------
// Instance singleton + enregistrement des types integres
// ---------------------------------------------------------------

const registry = new FieldTypeRegistry();

registry.register('text', textType);
registry.register('number', numberType);
registry.register('date', dateType);
registry.register('select', selectType);
registry.register('checkbox', checkboxType);
registry.register('url', urlType);

export default registry;
