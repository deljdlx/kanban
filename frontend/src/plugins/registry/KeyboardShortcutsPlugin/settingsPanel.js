/**
 * settingsPanel.js — Panneau de réglages pour KeyboardShortcutsPlugin.
 *
 * Affiche la liste des raccourcis avec capture de touche (click-to-record).
 * Détecte les conflits lorsqu'un raccourci est déjà utilisé.
 *
 * Chaque raccourci est affiché comme :
 *   [Label]                    [Bouton touche]
 *
 * Cliquer sur le bouton entre en mode capture :
 *   1. Le texte passe à "..."
 *   2. L'user presse une touche/combo → formatée et sauvegardée
 *   3. Escape pendant le recording → annule (restore l'ancienne valeur)
 */

/**
 * Construit le panneau de réglages des raccourcis clavier.
 *
 * @param {import('./KeyboardShortcutsPlugin.js').default} plugin - Instance du plugin
 * @param {HTMLElement} container - Conteneur dans lequel injecter l'UI
 */
export function buildSettingsPanel(plugin, container) {
    container.innerHTML = '';

    // Description
    const desc = document.createElement('p');
    desc.className = 'ksp-description';
    desc.textContent = 'Cliquez sur un raccourci pour le modifier. Appuyez sur la nouvelle combinaison de touches.';
    container.appendChild(desc);

    // Liste des raccourcis
    const shortcuts = plugin.getShortcuts();

    for (const shortcut of shortcuts.values()) {
        const row = document.createElement('div');
        row.className = 'ksp-shortcut-row';

        const label = document.createElement('span');
        label.className = 'ksp-shortcut-label';
        label.textContent = shortcut.label;

        const keyBtn = document.createElement('button');
        keyBtn.className = 'ksp-shortcut-key';
        keyBtn.type = 'button';
        keyBtn.textContent = _formatDisplay(shortcut.currentKey);

        // Conteneur pour le warning de conflit
        const conflictEl = document.createElement('div');
        conflictEl.className = 'ksp-shortcut-conflict';

        // Click-to-record
        keyBtn.addEventListener('click', () => {
            _startRecording(plugin, shortcut, keyBtn, conflictEl, shortcuts);
        });

        row.appendChild(label);
        row.appendChild(keyBtn);
        container.appendChild(row);
        container.appendChild(conflictEl);
    }

    // Bouton Réinitialiser
    const resetGroup = document.createElement('div');
    resetGroup.className = 'form-group';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn--cancel';
    resetBtn.type = 'button';
    resetBtn.textContent = 'Réinitialiser les raccourcis';
    resetBtn.addEventListener('click', async () => {
        await plugin.resetAll();
        // Re-render le panneau
        buildSettingsPanel(plugin, container);
    });
    resetGroup.appendChild(resetBtn);
    container.appendChild(resetGroup);
}

// =========================================================
// Capture de touche (click-to-record)
// =========================================================

/**
 * Entre en mode capture pour un raccourci.
 * Attend une combinaison de touches, la valide, puis la sauvegarde.
 *
 * @param {import('./KeyboardShortcutsPlugin.js').default} plugin
 * @param {Object} shortcut - La définition du raccourci
 * @param {HTMLButtonElement} keyBtn - Le bouton affichant la touche
 * @param {HTMLElement} conflictEl - L'élément pour afficher les conflits
 * @param {Map} shortcuts - Tous les raccourcis (pour détecter les conflits)
 * @private
 */
function _startRecording(plugin, shortcut, keyBtn, conflictEl, shortcuts) {
    const previousKey = shortcut.currentKey;
    keyBtn.textContent = '...';
    keyBtn.classList.add('ksp-shortcut-key--recording');
    conflictEl.textContent = '';

    /**
     * Listener temporaire qui capture la prochaine touche.
     * @param {KeyboardEvent} e
     */
    const onKeydown = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Escape seul pendant le recording → annule
        if (e.key === 'Escape' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
            _stopRecording(keyBtn, previousKey);
            document.removeEventListener('keydown', onKeydown, true);
            return;
        }

        // Ignorer les touches modificatrices seules
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
            return;
        }

        // Construire la chaîne normalisée
        const parsed = {
            ctrl: e.ctrlKey || e.metaKey,
            alt: e.altKey,
            shift: e.shiftKey,
            key: e.key.toLowerCase(),
        };
        const newKey = _formatParsed(parsed);

        // Vérifier les conflits
        const conflict = _findConflict(newKey, shortcut.id, shortcuts);
        if (conflict) {
            conflictEl.textContent = `Conflit avec « ${conflict.label} »`;
        } else {
            conflictEl.textContent = '';
        }

        // Appliquer la nouvelle touche (même en cas de conflit, on laisse l'user choisir)
        _stopRecording(keyBtn, newKey);
        document.removeEventListener('keydown', onKeydown, true);
        plugin.updateShortcut(shortcut.id, newKey);
    };

    // Capturer en phase capture (true) pour intercepter avant tout autre listener
    document.addEventListener('keydown', onKeydown, true);
}

/**
 * Sort du mode capture et restaure l'affichage du bouton.
 *
 * @param {HTMLButtonElement} keyBtn
 * @param {string} keyStr - La touche à afficher
 * @private
 */
function _stopRecording(keyBtn, keyStr) {
    keyBtn.classList.remove('ksp-shortcut-key--recording');
    keyBtn.textContent = _formatDisplay(keyStr);
}

// =========================================================
// Détection de conflits
// =========================================================

/**
 * Cherche si un autre raccourci utilise déjà la même touche.
 *
 * @param {string} newKey - La nouvelle touche normalisée
 * @param {string} currentId - L'id du raccourci en cours de modification
 * @param {Map} shortcuts - Tous les raccourcis
 * @returns {Object|null} Le raccourci en conflit, ou null
 * @private
 */
function _findConflict(newKey, currentId, shortcuts) {
    for (const s of shortcuts.values()) {
        if (s.id === currentId) continue;
        if (s.currentKey === newKey) return s;
    }
    return null;
}

// =========================================================
// Formatage d'affichage
// =========================================================

/**
 * Formate une chaîne de raccourci pour l'affichage.
 * Ex: `"ctrl+n"` → `"Ctrl + N"`, `"escape"` → `"Escape"`
 *
 * @param {string} keyStr - Chaîne normalisée
 * @returns {string}
 * @private
 */
function _formatDisplay(keyStr) {
    return keyStr
        .split('+')
        .map((part) => {
            if (part === 'ctrl') return 'Ctrl';
            if (part === 'alt') return 'Alt';
            if (part === 'shift') return 'Shift';
            if (part === 'escape') return 'Escape';
            // Touche unique : majuscule pour les lettres, telle quelle sinon
            if (part.length === 1) return part.toUpperCase();
            // Capitaliser la première lettre
            return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join(' + ');
}

/**
 * Formate un objet parsé en chaîne normalisée.
 * Ex: `{ ctrl: true, key: "n" }` → `"ctrl+n"`
 *
 * @param {{ ctrl: boolean, alt: boolean, shift: boolean, key: string }} parsed
 * @returns {string}
 * @private
 */
function _formatParsed(parsed) {
    const parts = [];
    if (parsed.ctrl) parts.push('ctrl');
    if (parsed.alt) parts.push('alt');
    if (parsed.shift) parts.push('shift');
    parts.push(parsed.key);
    return parts.join('+');
}
