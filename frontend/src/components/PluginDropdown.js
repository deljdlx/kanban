/**
 * PluginDropdown — Bouton + panneau de gestion des plugins dans le header.
 *
 * Affiche un bouton "Plugins" qui, au clic, ouvre un panneau listant
 * tous les plugins enregistrés dans le PluginManager. Chaque plugin
 * dispose d'un toggle (activer/désactiver) et d'un bouton engrenage
 * (si le plugin expose `settingsPanel`) qui ouvre une modale de config.
 *
 * Structure DOM :
 *   div.plugin-dropdown
 *     button.plugin-dropdown-trigger       → "Plugins"
 *     div.plugin-dropdown-panel
 *       div.plugin-dropdown-item  (×N)
 *         span.plugin-dropdown-item-label  → plugin.label || plugin.name
 *         div.plugin-dropdown-item-actions
 *           button ⚙ (si settingsPanel)   → ouvre ModalPluginSettings
 *           input[type=checkbox]           → toggle enable/disable
 */
import PluginManager from '../plugins/PluginManager.js';
import ModalPluginSettings from '../views/ModalPluginSettings.js';

export default class PluginDropdown {
    /**
     * Élément racine du composant.
     * @type {HTMLElement|null}
     */
    _element;

    /**
     * Référence au panneau (pour rebuild au changement).
     * @type {HTMLElement|null}
     */
    _panel;

    /**
     * Référence au listener de clic extérieur.
     * @type {Function|null}
     */
    _outsideClickHandler;

    /**
     * Handler lié pour PluginManager 'change' (stocké pour off()).
     * @type {Function|null}
     */
    _onPluginChangeBound;

    constructor() {
        this._element = null;
        this._panel = null;
        this._outsideClickHandler = null;
        this._onPluginChangeBound = null;
    }

    /**
     * Construit et retourne l'élément DOM du composant.
     *
     * @returns {HTMLElement}
     */
    render() {
        const root = document.createElement('div');
        root.className = 'plugin-dropdown';

        // — Bouton trigger
        const trigger = document.createElement('button');
        trigger.className = 'plugin-dropdown-trigger';
        trigger.textContent = 'Plugins';

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggle(root);
        });

        // — Panneau (caché par défaut)
        const panel = document.createElement('div');
        panel.className = 'plugin-dropdown-panel';
        panel.addEventListener('click', (e) => e.stopPropagation());
        this._panel = panel;

        this._buildItems();

        root.appendChild(trigger);
        root.appendChild(panel);

        // Rebuild la liste quand les plugins changent
        this._onPluginChangeBound = () => this._buildItems();
        PluginManager.on('change', this._onPluginChangeBound);

        this._element = root;
        return root;
    }

    /**
     * Nettoie les listeners (PluginManager + document).
     * Doit être appelé si le composant est retiré du DOM.
     */
    destroy() {
        if (this._onPluginChangeBound) {
            PluginManager.off('change', this._onPluginChangeBound);
            this._onPluginChangeBound = null;
        }
        if (this._outsideClickHandler) {
            document.removeEventListener('click', this._outsideClickHandler);
            this._outsideClickHandler = null;
        }
    }

    // ---------------------------------------------------------------
    // Construction de la liste
    // ---------------------------------------------------------------

    /**
     * Reconstruit la liste des items dans le panneau.
     *
     * @private
     */
    _buildItems() {
        if (!this._panel) return;
        this._panel.innerHTML = '';

        const entries = PluginManager.getAll();

        for (const entry of entries) {
            const plugin = entry.instance;
            const enabled = entry.installed;
            const hasError = entry.error !== null && entry.error !== undefined;

            const item = document.createElement('div');
            item.className = 'plugin-dropdown-item';
            if (hasError) {
                item.classList.add('plugin-dropdown-item--error');
            }

            // Label
            const label = document.createElement('span');
            label.className = 'plugin-dropdown-item-label';
            label.textContent = plugin.label || plugin.name;

            // Indicateur d'erreur
            if (hasError) {
                const errorBadge = document.createElement('span');
                errorBadge.className = 'plugin-dropdown-error-badge';
                errorBadge.textContent = 'Erreur';
                errorBadge.title = entry.error.message || 'Échec du chargement';
                label.appendChild(errorBadge);
            }

            // Actions (engrenage + toggle)
            const actions = document.createElement('div');
            actions.className = 'plugin-dropdown-item-actions';

            // Bouton engrenage (seulement si le plugin expose settingsPanel)
            if (typeof plugin.settingsPanel === 'function' && !hasError) {
                const settingsBtn = document.createElement('button');
                settingsBtn.className = 'plugin-dropdown-settings-btn';
                settingsBtn.type = 'button';
                settingsBtn.title = 'Paramètres';
                settingsBtn.textContent = '⚙';
                settingsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const modal = new ModalPluginSettings(plugin);
                    modal.open();
                });
                actions.appendChild(settingsBtn);
            }

            // Toggle checkbox (désactivé si le plugin est en erreur)
            const toggle = document.createElement('input');
            toggle.type = 'checkbox';
            toggle.className = 'plugin-dropdown-toggle';
            toggle.checked = enabled;
            toggle.disabled = hasError;
            toggle.addEventListener('change', () => {
                if (toggle.checked) {
                    PluginManager.enable(plugin.name);
                } else {
                    PluginManager.disable(plugin.name);
                }
            });
            actions.appendChild(toggle);

            item.appendChild(label);
            item.appendChild(actions);
            this._panel.appendChild(item);
        }
    }

    // ---------------------------------------------------------------
    // Ouverture / fermeture
    // ---------------------------------------------------------------

    /**
     * @param {HTMLElement} root
     * @private
     */
    _toggle(root) {
        if (root.classList.contains('plugin-dropdown--open')) {
            this._close(root);
        } else {
            this._open(root);
        }
    }

    /**
     * @param {HTMLElement} root
     * @private
     */
    _open(root) {
        root.classList.add('plugin-dropdown--open');
        this._outsideClickHandler = () => this._close(root);
        document.addEventListener('click', this._outsideClickHandler);
    }

    /**
     * @param {HTMLElement} root
     * @private
     */
    _close(root) {
        root.classList.remove('plugin-dropdown--open');
        if (this._outsideClickHandler) {
            document.removeEventListener('click', this._outsideClickHandler);
            this._outsideClickHandler = null;
        }
    }
}
