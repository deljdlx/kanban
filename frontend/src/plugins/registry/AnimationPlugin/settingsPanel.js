/**
 * settingsPanel.js — Panneau de settings de l'AnimationPlugin.
 *
 * Construit quatre <select> :
 * 1. Effet d'animation des modales (EFFECTS)
 * 2. Effet au drop d'une carte inter-colonne (CARD_DROP_EFFECTS)
 * 3. Effet d'entrée des colonnes (COLUMN_ENTER_EFFECTS)
 * 4. Effet d'entrée des cartes (CARD_ENTER_EFFECTS)
 *
 * Les quatre sont alimentés dynamiquement par le registre d'effets (effects.js).
 */
import {
    EFFECTS,
    DEFAULT_EFFECT,
    CARD_DROP_EFFECTS,
    DEFAULT_CARD_DROP_EFFECT,
    COLUMN_ENTER_EFFECTS,
    DEFAULT_COLUMN_ENTER_EFFECT,
    CARD_ENTER_EFFECTS,
    DEFAULT_CARD_ENTER_EFFECT,
} from './effects.js';

/**
 * Crée un bloc label + select + note pour un registre d'effets.
 *
 * @param {HTMLElement} container - Conteneur parent
 * @param {string} labelText - Texte du label
 * @param {Object} registry - Registre d'effets (clé → { label })
 * @param {string} currentValue - Valeur actuellement sélectionnée
 * @param {Function} onChange - Callback appelé avec la nouvelle valeur
 * @param {string} noteText - Texte de description sous le select
 * @param {boolean} [isFirst=false] - True pour le premier select (pas de marginTop)
 * @returns {HTMLSelectElement} Le select créé (pour le reset)
 */
function buildEffectSelect(container, labelText, registry, currentValue, onChange, noteText, _isFirst = false) {
    const group = document.createElement('div');
    group.className = 'form-group';

    const label = document.createElement('label');
    label.className = 'label';
    label.textContent = labelText;
    group.appendChild(label);

    const select = document.createElement('select');
    select.className = 'input';

    for (const [key, effect] of Object.entries(registry)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = effect.label;
        select.appendChild(option);
    }

    select.value = currentValue;
    select.addEventListener('change', () => onChange(select.value));
    group.appendChild(select);

    const note = document.createElement('p');
    note.className = 'form-hint';
    note.textContent = noteText;
    group.appendChild(note);

    container.appendChild(group);

    return select;
}

/**
 * Construit le panneau de settings de l'AnimationPlugin.
 *
 * @param {import('./AnimationPlugin.js').default} plugin - Instance du plugin
 * @param {HTMLElement} container - Conteneur fourni par ModalPluginSettings
 */
export function buildSettingsPanel(plugin, container) {
    const modalSelect = buildEffectSelect(
        container,
        "Effet d'animation des modales",
        EFFECTS,
        plugin._currentEffectName,
        (v) => plugin.setEffect(v),
        "Le changement s'applique à la prochaine modale ouverte.",
        true,
    );

    const dropSelect = buildEffectSelect(
        container,
        "Effet au drop d'une carte",
        CARD_DROP_EFFECTS,
        plugin._currentCardDropEffect,
        (v) => plugin.setCardDropEffect(v),
        'Animation jouée quand une carte est déplacée vers une autre colonne.',
    );

    const colSelect = buildEffectSelect(
        container,
        "Effet d'entrée des colonnes",
        COLUMN_ENTER_EFFECTS,
        plugin._currentColumnEnterEffect,
        (v) => plugin.setColumnEnterEffect(v),
        "Animation des colonnes à l'ouverture d'un board.",
    );

    const cardSelect = buildEffectSelect(
        container,
        "Effet d'entrée des cartes",
        CARD_ENTER_EFFECTS,
        plugin._currentCardEnterEffect,
        (v) => plugin.setCardEnterEffect(v),
        "Animation des cartes à l'ouverture d'un board.",
    );

    // --- Bouton réinitialiser ---
    const resetGroup = document.createElement('div');
    resetGroup.className = 'form-group';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn--cancel';
    resetBtn.textContent = 'Réinitialiser';
    resetBtn.addEventListener('click', () => {
        plugin.setEffect(DEFAULT_EFFECT);
        modalSelect.value = DEFAULT_EFFECT;

        plugin.setCardDropEffect(DEFAULT_CARD_DROP_EFFECT);
        dropSelect.value = DEFAULT_CARD_DROP_EFFECT;

        plugin.setColumnEnterEffect(DEFAULT_COLUMN_ENTER_EFFECT);
        colSelect.value = DEFAULT_COLUMN_ENTER_EFFECT;

        plugin.setCardEnterEffect(DEFAULT_CARD_ENTER_EFFECT);
        cardSelect.value = DEFAULT_CARD_ENTER_EFFECT;
    });
    resetGroup.appendChild(resetBtn);
    container.appendChild(resetGroup);
}
