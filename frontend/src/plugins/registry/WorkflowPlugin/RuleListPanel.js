/**
 * RuleListPanel — Liste CRUD des règles workflow.
 *
 * Affiche dans l'onglet "Règles" du board settings :
 *   - Un intro + bouton "Nouvelle règle"
 *   - La liste des règles existantes (nom, trigger, toggle, boutons edit/delete)
 *   - Clic sur une règle → ouvre RuleEditor en remplaçant le contenu du panel
 *   - RuleEditor appelle onDone → revient à la liste
 */
import { buildRuleEditor } from './RuleEditor.js';

/**
 * Construit le panneau de liste des règles.
 *
 * @param {HTMLElement} panel - Conteneur fourni par registerTab
 * @param {import('./WorkflowPlugin.js').default} plugin - Instance du plugin
 */
export function buildRuleListPanel(panel, plugin) {
    _renderList(panel, plugin);
}

// ---------------------------------------------------------------
// Rendu de la liste
// ---------------------------------------------------------------

/**
 * Rend la liste complète des règles dans le panel.
 *
 * @param {HTMLElement} panel
 * @param {import('./WorkflowPlugin.js').default} plugin
 * @private
 */
function _renderList(panel, plugin) {
    panel.innerHTML = '';

    // Header avec intro et bouton
    const header = document.createElement('div');
    header.className = 'workflow-header';

    const intro = document.createElement('p');
    intro.className = 'board-settings-intro';
    intro.textContent = 'Automatisez des actions quand des événements se produisent sur le board.';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn--primary';
    addBtn.textContent = '+ Nouvelle règle';
    addBtn.addEventListener('click', () => {
        const triggers = plugin.getTriggers();
        const newRule = {
            id: plugin.generateRuleId(),
            name: '',
            enabled: true,
            trigger: triggers.length > 0 ? triggers[0].hook : '',
            code: '',
        };
        _openEditor(panel, newRule, plugin);
    });

    header.appendChild(intro);
    header.appendChild(addBtn);
    panel.appendChild(header);

    // Liste des règles
    const rules = plugin.getRules();

    if (rules.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'workflow-empty';
        empty.textContent = 'Aucune règle. Cliquez sur "+ Nouvelle règle" pour commencer.';
        panel.appendChild(empty);
        return;
    }

    const list = document.createElement('div');
    list.className = 'workflow-list';

    for (const rule of rules) {
        list.appendChild(_buildRuleCard(rule, panel, plugin));
    }

    panel.appendChild(list);
}

// ---------------------------------------------------------------
// Carte de règle
// ---------------------------------------------------------------

/**
 * Construit l'élément HTML pour une règle dans la liste.
 *
 * @param {Object} rule - Données de la règle
 * @param {HTMLElement} panel - Panel parent (pour navigation vers éditeur)
 * @param {import('./WorkflowPlugin.js').default} plugin
 * @returns {HTMLElement}
 * @private
 */
function _buildRuleCard(rule, panel, plugin) {
    const triggers = plugin.getTriggers();
    const triggerDef = triggers.find((t) => t.hook === rule.trigger);
    const ruleError = plugin.getRuleError(rule.id);

    const card = document.createElement('div');
    card.className = 'workflow-rule-card';
    if (!rule.enabled) card.classList.add('workflow-rule-card--disabled');
    if (ruleError) card.classList.add('workflow-rule-card--error');

    // Toggle enabled
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.className = 'workflow-rule-toggle';
    toggle.checked = rule.enabled;
    toggle.title = rule.enabled ? 'Désactiver' : 'Activer';
    toggle.addEventListener('change', (e) => {
        e.stopPropagation();
        plugin.toggleRule(rule.id, toggle.checked);
        _renderList(panel, plugin);
    });
    card.appendChild(toggle);

    // Infos (cliquable → éditeur)
    const info = document.createElement('div');
    info.className = 'workflow-rule-info';
    info.addEventListener('click', () => _openEditor(panel, rule, plugin));

    const name = document.createElement('div');
    name.className = 'workflow-rule-name';
    name.textContent = rule.name || 'Règle sans nom';

    const trigger = document.createElement('div');
    trigger.className = 'workflow-rule-trigger';
    trigger.textContent = triggerDef ? triggerDef.label : rule.trigger;

    info.appendChild(name);
    info.appendChild(trigger);

    if (ruleError) {
        const errorBadge = document.createElement('div');
        errorBadge.className = 'workflow-rule-error-badge';
        errorBadge.textContent = `Erreur : ${ruleError.message}`;
        info.appendChild(errorBadge);
    }

    card.appendChild(info);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'workflow-rule-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn--secondary btn--sm';
    editBtn.textContent = 'Éditer';
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        _openEditor(panel, rule, plugin);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn--danger-ghost btn--sm';
    deleteBtn.textContent = 'Supprimer';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        plugin.deleteRule(rule.id);
        _renderList(panel, plugin);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(actions);

    return card;
}

// ---------------------------------------------------------------
// Navigation liste ↔ éditeur
// ---------------------------------------------------------------

/**
 * Remplace le contenu du panel par l'éditeur de règle.
 * Quand l'éditeur appelle onDone, on revient à la liste.
 *
 * @param {HTMLElement} panel
 * @param {Object} rule
 * @param {import('./WorkflowPlugin.js').default} plugin
 * @private
 */
function _openEditor(panel, rule, plugin) {
    buildRuleEditor(panel, rule, plugin, () => {
        _renderList(panel, plugin);
    });
}
