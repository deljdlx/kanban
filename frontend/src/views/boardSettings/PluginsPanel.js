/**
 * PluginsPanel — Onglet "Plugins" des modales Board Settings et App Settings.
 *
 * Affiche :
 *   - Onglets horizontaux par catégorie (Tous, Apparence, Widgets…)
 *   - Liste des plugins avec toggle on/off
 *   - Bouton paramètres pour les plugins configurables
 *
 * Accepte un filtre `scope` ('app' ou 'board') pour n'afficher que les
 * plugins correspondants. Si scope est null, tous les plugins sont affichés.
 */
import PluginManager from '../../plugins/PluginManager.js';
import ModalPluginSettings from '../ModalPluginSettings.js';
import ModalConfirmDelete from '../ModalConfirmDelete.js';
import AuthService from '../../services/AuthService.js';
import Router from '../../services/Router.js';

/**
 * Catégories de plugins pour le filtrage par onglet.
 */
const PLUGIN_CATEGORIES = [
    {
        id: 'apparence',
        label: 'Apparence',
        test: (p) => p.tags?.some((t) => ['apparence', 'theme', 'couleur'].includes(t)),
    },
    { id: 'widget', label: 'Widgets', test: (p) => p.tags?.includes('widget') },
    { id: 'taxonomie', label: 'Taxonomies', test: (p) => p.tags?.includes('taxonomie') },
    {
        id: 'productivite',
        label: 'Productivité',
        test: (p) => p.tags?.some((t) => ['productivité', 'organisation', 'notes'].includes(t)),
    },
    { id: 'autre', label: 'Autre', test: null }, // Fallback
];

export default class PluginsPanel {
    /**
     * Conteneur du panel.
     * @type {HTMLElement|null}
     */
    _panel;

    /**
     * Conteneur de la liste des plugins.
     * @type {HTMLElement|null}
     */
    _listContainer;

    /**
     * Catégorie active (null = toutes).
     * @type {string|null}
     */
    _activeCategory;

    /**
     * Handler lié pour PluginManager 'change'.
     * @type {Function|null}
     */
    _onPluginChangeBound;

    /**
     * Filtre de scope : 'app', 'board', ou null (tous).
     * @type {string|null}
     */
    _scope;

    /**
     * Callback pour demander la fermeture de la modale parente.
     * Fourni par ModalAppSettings ou ModalBoardSettings.
     * @type {Function|null}
     */
    _onRequestClose;

    /**
     * @param {string|null} [scope=null] - Filtre par scope ('app' ou 'board'). null = tous.
     * @param {Object} [options]
     * @param {Function} [options.onRequestClose] - Ferme la modale parente
     */
    constructor(scope = null, { onRequestClose = null } = {}) {
        this._panel = null;
        this._listContainer = null;
        this._activeCategory = null;
        this._onPluginChangeBound = null;
        this._scope = scope;
        this._onRequestClose = onRequestClose;
    }

    /**
     * Construit le contenu du panel dans le conteneur fourni.
     *
     * @param {HTMLElement} panel
     */
    build(panel) {
        this._panel = panel;

        const intro = document.createElement('p');
        intro.className = 'board-settings-intro';
        intro.textContent = 'Activez ou désactivez les plugins pour personnaliser votre board.';
        panel.appendChild(intro);

        // Onglets par catégorie
        panel.appendChild(this._buildTabs());

        // Liste des plugins
        this._listContainer = document.createElement('div');
        this._listContainer.className = 'board-settings-plugins-list';
        panel.appendChild(this._listContainer);

        this._renderList();

        // Rebuild la liste quand les plugins changent
        this._onPluginChangeBound = () => this._renderList();
        PluginManager.on('change', this._onPluginChangeBound);
    }

    /**
     * Nettoyage à appeler lors de la fermeture de la modale.
     */
    destroy() {
        if (this._onPluginChangeBound) {
            PluginManager.off('change', this._onPluginChangeBound);
            this._onPluginChangeBound = null;
        }
    }

    // ---------------------------------------------------------------
    // Onglets horizontaux
    // ---------------------------------------------------------------

    /**
     * Construit la barre d'onglets horizontale.
     *
     * @returns {HTMLElement}
     * @private
     */
    _buildTabs() {
        const bar = document.createElement('div');
        bar.className = 'board-settings-plugin-tabs';

        // Onglet "Tous" (actif par défaut)
        const allTab = document.createElement('button');
        allTab.type = 'button';
        allTab.className = 'board-settings-plugin-tab board-settings-plugin-tab--active';
        allTab.textContent = 'Tous';
        allTab.addEventListener('click', () => this._activateCategory(null));
        bar.appendChild(allTab);

        // Un onglet par catégorie
        for (const category of PLUGIN_CATEGORIES) {
            const tab = document.createElement('button');
            tab.type = 'button';
            tab.className = 'board-settings-plugin-tab';
            tab.dataset.category = category.id;
            tab.textContent = category.label;
            tab.addEventListener('click', () => this._activateCategory(category.id));
            bar.appendChild(tab);
        }

        return bar;
    }

    /**
     * Active un onglet et rafraîchit la liste.
     *
     * @param {string|null} categoryId - null = "Tous"
     * @private
     */
    _activateCategory(categoryId) {
        this._activeCategory = categoryId;

        // Met à jour l'état visuel des onglets
        const tabs = this._panel.querySelectorAll('.board-settings-plugin-tab');
        for (const tab of tabs) {
            const isActive = categoryId === null ? !tab.dataset.category : tab.dataset.category === categoryId;
            tab.classList.toggle('board-settings-plugin-tab--active', isActive);
        }

        this._renderList();
    }

    // ---------------------------------------------------------------
    // Liste des plugins
    // ---------------------------------------------------------------

    /**
     * @private
     */
    _renderList() {
        this._listContainer.innerHTML = '';

        const allEntries = PluginManager.getAll();
        const entries = this._scope
            ? allEntries.filter((e) => (e.instance.scope || 'board') === this._scope)
            : allEntries;
        let visibleCount = 0;

        // Si un onglet catégorie est actif, afficher sans section headers
        if (this._activeCategory !== null) {
            for (const entry of entries) {
                if (this._getPluginCategory(entry.instance) !== this._activeCategory) continue;
                visibleCount++;
                this._listContainer.appendChild(this._buildPluginItem(entry));
            }
        } else {
            // Onglet "Tous" : grouper par catégorie avec section headers
            const groups = new Map();
            for (const category of PLUGIN_CATEGORIES) {
                groups.set(category.id, []);
            }

            for (const entry of entries) {
                const categoryId = this._getPluginCategory(entry.instance);
                groups.get(categoryId).push(entry);
            }

            for (const category of PLUGIN_CATEGORIES) {
                const items = groups.get(category.id);
                if (items.length === 0) continue;

                const sectionTitle = document.createElement('div');
                sectionTitle.className = 'board-settings-plugins-section';
                sectionTitle.textContent = category.label;
                this._listContainer.appendChild(sectionTitle);

                for (const entry of items) {
                    visibleCount++;
                    this._listContainer.appendChild(this._buildPluginItem(entry));
                }
            }
        }

        if (visibleCount === 0) {
            const empty = document.createElement('p');
            empty.className = 'board-settings-plugins-empty';
            empty.textContent = 'Aucun plugin dans cette catégorie.';
            this._listContainer.appendChild(empty);
        }
    }

    /**
     * @param {Object} entry
     * @returns {HTMLElement}
     * @private
     */
    _buildPluginItem(entry) {
        const plugin = entry.instance;
        const enabled = entry.installed;
        const hasError = entry.error !== null && entry.error !== undefined;

        const item = document.createElement('div');
        item.className = 'board-settings-plugin-item';
        if (hasError) {
            item.classList.add('board-settings-plugin-item--error');
        }

        // Infos
        const info = document.createElement('div');
        info.className = 'board-settings-plugin-info';

        const name = document.createElement('span');
        name.className = 'board-settings-plugin-name';
        name.textContent = plugin.label || plugin.name;

        const description = document.createElement('span');
        description.className = 'board-settings-plugin-description';
        description.textContent = plugin.description || '';

        info.appendChild(name);
        if (plugin.description) {
            info.appendChild(description);
        }

        // Indicateur d'erreur
        if (hasError) {
            const errorBadge = document.createElement('span');
            errorBadge.className = 'board-settings-plugin-error';
            errorBadge.textContent = entry.error.message || 'Échec du chargement';
            info.appendChild(errorBadge);
        }

        // Actions
        const actions = document.createElement('div');
        actions.className = 'board-settings-plugin-actions';

        // Bouton Paramètres
        if (typeof plugin.settingsPanel === 'function' && !hasError) {
            const settingsBtn = document.createElement('button');
            settingsBtn.className = 'board-settings-plugin-settings';
            settingsBtn.type = 'button';
            settingsBtn.textContent = 'Paramètres';
            settingsBtn.addEventListener('click', () => {
                const modal = new ModalPluginSettings(plugin);
                modal.open();
            });
            actions.appendChild(settingsBtn);
        }

        // Toggle checkbox
        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'board-settings-toggle';

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.className = 'board-settings-toggle-input';
        toggle.checked = enabled;
        toggle.disabled = hasError;
        toggle.addEventListener('change', () => {
            if (toggle.checked && plugin.name === 'backend') {
                // Empêche l'activation immédiate — demande confirmation
                toggle.checked = false;
                this._confirmBackendActivation();
                return;
            }

            if (toggle.checked) {
                PluginManager.enable(plugin.name);
            } else {
                PluginManager.disable(plugin.name);
            }
        });

        const toggleSlider = document.createElement('span');
        toggleSlider.className = 'board-settings-toggle-slider';

        toggleLabel.appendChild(toggle);
        toggleLabel.appendChild(toggleSlider);
        actions.appendChild(toggleLabel);

        item.appendChild(info);
        item.appendChild(actions);
        return item;
    }

    // ---------------------------------------------------------------
    // Backend plugin activation
    // ---------------------------------------------------------------

    /**
     * Ouvre une modale de confirmation avant d'activer le BackendPlugin.
     * Si confirmé : active le plugin, logout, redirige vers /login.
     *
     * @private
     */
    _confirmBackendActivation() {
        const modal = new ModalConfirmDelete({
            title: 'Activation du backend',
            message:
                'Activer le backend va vous déconnecter de la session en cours. ' +
                'Vous devrez vous reconnecter via la page de login.',
            confirmLabel: 'Activer et se déconnecter',
            onConfirm: async () => {
                PluginManager.enable('backend');
                await AuthService.logout();

                // Ferme la modale parente (settings) avant de naviguer
                if (this._onRequestClose) {
                    this._onRequestClose();
                }

                Router.navigate('/login');
            },
        });
        modal.open();
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    /**
     * @param {Object} plugin
     * @returns {string}
     * @private
     */
    _getPluginCategory(plugin) {
        for (const category of PLUGIN_CATEGORIES) {
            if (category.id === 'autre') continue;

            if (category.test && category.test(plugin)) {
                return category.id;
            }
        }
        return 'autre';
    }
}
