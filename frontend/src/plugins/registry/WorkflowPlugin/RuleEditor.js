/**
 * RuleEditor — Éditeur d'une règle individuelle.
 *
 * Affiche un formulaire avec :
 *   - Input nom de la règle
 *   - Dropdown trigger (depuis triggerDefs.js)
 *   - Aide contextuelle (champs ctx disponibles)
 *   - Éditeur CodeMirror pour le code JavaScript
 *   - Barre d'erreur (si la dernière exécution a échoué)
 *   - Boutons Sauvegarder / Supprimer / Annuler
 *
 * CodeMirror est chargé en lazy loading (~200KB) : le chunk est créé
 * automatiquement par Vite et chargé uniquement à l'ouverture de l'éditeur.
 */

/**
 * Construit l'éditeur de règle dans un conteneur.
 *
 * @param {HTMLElement} container - Conteneur parent (le panel de l'onglet)
 * @param {Object} rule - Données de la règle à éditer (ou nouvelle règle)
 * @param {string} rule.id
 * @param {string} rule.name
 * @param {boolean} rule.enabled
 * @param {string} rule.trigger
 * @param {string} rule.code
 * @param {import('./WorkflowPlugin.js').default} plugin - Instance du plugin
 * @param {Function} onDone - Callback appelé après save/delete/cancel pour revenir à la liste
 */
export function buildRuleEditor(container, rule, plugin, onDone) {
    container.innerHTML = '';

    const editor = document.createElement('div');
    editor.className = 'workflow-editor';

    const triggers = plugin.getTriggers();
    const isNew = !plugin.getRules().find((r) => r.id === rule.id);

    // --- Champ nom ---
    const nameField = _buildField('Nom de la règle');
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'input';
    nameInput.value = rule.name;
    nameInput.placeholder = 'Ex: Auto-color Done cards';
    nameField.appendChild(nameInput);
    editor.appendChild(nameField);

    // --- Dropdown trigger ---
    const triggerField = _buildField('Quand (trigger)');
    const triggerSelect = document.createElement('select');
    triggerSelect.className = 'input';
    for (const t of triggers) {
        const opt = document.createElement('option');
        opt.value = t.hook;
        opt.textContent = `${t.label} — ${t.hook}`;
        if (t.hook === rule.trigger) opt.selected = true;
        triggerSelect.appendChild(opt);
    }
    triggerField.appendChild(triggerSelect);
    editor.appendChild(triggerField);

    // --- Aide contextuelle ---
    const ctxHelp = document.createElement('div');
    ctxHelp.className = 'workflow-ctx-help';
    _updateCtxHelp(ctxHelp, triggerSelect.value, triggers);
    triggerSelect.addEventListener('change', () => {
        _updateCtxHelp(ctxHelp, triggerSelect.value, triggers);
    });
    editor.appendChild(ctxHelp);

    // --- CodeMirror container ---
    const codeLabel = _buildField('Action (JavaScript)');
    const cmContainer = document.createElement('div');
    cmContainer.className = 'workflow-codemirror-container';
    codeLabel.appendChild(cmContainer);
    editor.appendChild(codeLabel);

    // Référence à l'instance EditorView (remplie après lazy load).
    // `mounted` empêche une fuite mémoire si l'utilisateur quitte
    // l'éditeur avant la fin du chargement async de CodeMirror.
    let editorView = null;
    let mounted = true;

    _createCodeMirror(cmContainer, rule.code)
        .then((view) => {
            if (!mounted) {
                view.destroy();
                return;
            }
            editorView = view;
        })
        .catch((err) => {
            console.warn('Workflow : impossible de charger CodeMirror', err);
            cmContainer.textContent = "Erreur de chargement de l'éditeur.";
        });

    // --- Barre d'erreur ---
    const ruleError = plugin.getRuleError(rule.id);
    const errorBar = document.createElement('div');
    errorBar.className = 'workflow-error-bar';
    errorBar.classList.toggle('hidden', !ruleError);
    errorBar.textContent = ruleError ? `Erreur : ${ruleError.message}` : '';
    editor.appendChild(errorBar);

    // --- Boutons ---
    const buttons = document.createElement('div');
    buttons.className = 'workflow-editor-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn--cancel';
    cancelBtn.textContent = 'Annuler';
    cancelBtn.addEventListener('click', () => {
        mounted = false;
        _destroyCodeMirror(editorView);
        onDone();
    });

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn--primary';
    saveBtn.textContent = 'Sauvegarder';
    saveBtn.addEventListener('click', () => {
        const code = editorView ? editorView.state.doc.toString() : rule.code;

        plugin.saveRule({
            id: rule.id,
            name: nameInput.value.trim() || 'Règle sans nom',
            enabled: rule.enabled,
            trigger: triggerSelect.value,
            code,
        });

        mounted = false;
        _destroyCodeMirror(editorView);
        onDone();
    });

    // Bouton supprimer (uniquement pour les règles existantes)
    if (!isNew) {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn--danger-ghost';
        deleteBtn.textContent = 'Supprimer';
        deleteBtn.addEventListener('click', () => {
            mounted = false;
            plugin.deleteRule(rule.id);
            _destroyCodeMirror(editorView);
            onDone();
        });
        buttons.appendChild(deleteBtn);
    }

    buttons.appendChild(cancelBtn);
    buttons.appendChild(saveBtn);
    editor.appendChild(buttons);

    container.appendChild(editor);
}

// ---------------------------------------------------------------
// Helpers privés
// ---------------------------------------------------------------

/**
 * Crée un champ de formulaire avec label.
 *
 * @param {string} labelText - Texte du label
 * @returns {HTMLElement} Conteneur du champ
 * @private
 */
function _buildField(labelText) {
    const field = document.createElement('div');
    field.className = 'workflow-editor-field';

    const label = document.createElement('label');
    label.textContent = labelText;
    field.appendChild(label);

    return field;
}

/**
 * Met à jour le texte d'aide contextuelle selon le trigger sélectionné.
 *
 * @param {HTMLElement} el - Élément d'aide
 * @param {string} hookName - Trigger sélectionné
 * @param {Array} triggers - Définitions de triggers
 * @private
 */
function _updateCtxHelp(el, hookName, triggers) {
    const def = triggers.find((t) => t.hook === hookName);
    el.textContent = def
        ? `Contexte disponible :\n${def.ctxHelp}`
        : 'Sélectionnez un trigger pour voir le contexte disponible.';
}

/**
 * Crée une instance CodeMirror avec lazy loading.
 * Le chunk est généré automatiquement par Vite.
 *
 * @param {HTMLElement} parentEl - Conteneur DOM
 * @param {string} initialCode - Code initial
 * @returns {Promise<import('codemirror').EditorView>}
 * @private
 */
async function _createCodeMirror(parentEl, initialCode) {
    const { EditorView, basicSetup } = await import('codemirror');
    const { javascript } = await import('@codemirror/lang-javascript');

    return new EditorView({
        doc: initialCode,
        extensions: [basicSetup, javascript()],
        parent: parentEl,
    });
}

/**
 * Détruit proprement une instance CodeMirror.
 *
 * @param {import('codemirror').EditorView|null} view
 * @private
 */
function _destroyCodeMirror(view) {
    if (view) {
        view.destroy();
    }
}
