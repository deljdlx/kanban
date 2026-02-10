/**
 * ColumnTogglePlugin — Afficher/masquer des colonnes du board.
 *
 * Injecte un dropdown "Colonnes" dans le header via le hook
 * `header:renderActions`. L'utilisateur coche/décoche des colonnes
 * pour les afficher ou les masquer.
 *
 * Hooks utilisés :
 *   - header:renderActions : injecte le dropdown dans le header
 *   - board:rendered       : ré-applique les classes CSS sur les colonnes
 *   - column:added         : refresh le dropdown (nouvelle colonne visible)
 *   - column:removed       : nettoie l'ID supprimé de _hiddenColumns
 *
 * Persistence : board.pluginData['column-toggle'] = { hiddenColumns: string[] }
 */
const PLUGIN_DATA_KEY = 'column-toggle';

export default class ColumnTogglePlugin {
    /**
     * Référence au board courant.
     * @type {import('../../../models/Board.js').default|null}
     */
    _board = null;

    /**
     * Set des IDs de colonnes masquées.
     * @type {Set<string>}
     */
    _hiddenColumns = new Set();

    /**
     * Élément racine du dropdown (pour cleanup).
     * @type {HTMLElement|null}
     */
    _dropdownEl = null;

    /**
     * Handler pour fermer le dropdown au clic extérieur.
     * @type {Function|null}
     */
    _outsideClickHandler = null;

    /**
     * Handlers pour cleanup des hooks.
     * @type {Object}
     */
    _handlers = {
        onHeaderRender: null,
        onBoardRendered: null,
        onColumnAdded: null,
        onColumnRemoved: null,
    };

    /**
     * Installe le plugin en écoutant les hooks.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        if (typeof this._injectStyles === 'function') {
            this._injectStyles();
        }

        // Injection du dropdown dans le header
        this._handlers.onHeaderRender = ({ container, board }) => {
            this._board = board;
            this._loadFromBoard();
            this._renderDropdown(container);
        };
        hooks.addAction('header:renderActions', this._handlers.onHeaderRender);

        // Ré-applique les classes après un re-render du board
        this._handlers.onBoardRendered = () => {
            this._applyHiddenClasses();
        };
        hooks.addAction('board:rendered', this._handlers.onBoardRendered);

        // Nouvelle colonne ajoutée → refresh le dropdown
        this._handlers.onColumnAdded = () => {
            this._refreshDropdown();
        };
        hooks.addAction('column:added', this._handlers.onColumnAdded);

        // Colonne supprimée → nettoie de _hiddenColumns
        this._handlers.onColumnRemoved = ({ column }) => {
            if (this._hiddenColumns.has(column.id)) {
                this._hiddenColumns.delete(column.id);
                this._persist();
            }
            this._refreshDropdown();
        };
        hooks.addAction('column:removed', this._handlers.onColumnRemoved);
    }

    /**
     * Désinstalle le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        if (this._handlers.onHeaderRender) {
            hooks.removeAction('header:renderActions', this._handlers.onHeaderRender);
        }
        if (this._handlers.onBoardRendered) {
            hooks.removeAction('board:rendered', this._handlers.onBoardRendered);
        }
        if (this._handlers.onColumnAdded) {
            hooks.removeAction('column:added', this._handlers.onColumnAdded);
        }
        if (this._handlers.onColumnRemoved) {
            hooks.removeAction('column:removed', this._handlers.onColumnRemoved);
        }

        this._removeOutsideClickHandler();
        this._showAllColumns();

        if (typeof this._removeStyles === 'function') {
            this._removeStyles();
        }

        this._dropdownEl = null;
        this._board = null;
        this._hiddenColumns.clear();
    }

    // -----------------------------------------------------------------
    //  Persistence
    // -----------------------------------------------------------------

    /**
     * Charge les IDs masqués depuis board.pluginData.
     *
     * @private
     */
    _loadFromBoard() {
        this._hiddenColumns.clear();

        if (!this._board) return;
        const data = this._board.pluginData[PLUGIN_DATA_KEY];
        if (data && Array.isArray(data.hiddenColumns)) {
            // Filtre les IDs qui existent encore sur le board
            const existingIds = new Set(this._board.columns.map((c) => c.id));
            for (const id of data.hiddenColumns) {
                if (existingIds.has(id)) {
                    this._hiddenColumns.add(id);
                }
            }
        }
    }

    /**
     * Persiste les IDs masqués dans pluginData.
     * setPluginData émet 'change' → auto-save via BoardService.
     *
     * @private
     */
    _persist() {
        if (!this._board) return;

        this._board.setPluginData(PLUGIN_DATA_KEY, {
            hiddenColumns: [...this._hiddenColumns],
        });
    }

    // -----------------------------------------------------------------
    //  DOM — Toggle des colonnes
    // -----------------------------------------------------------------

    /**
     * Applique la classe .coltoggle-hidden sur les colonnes masquées.
     *
     * @private
     */
    _applyHiddenClasses() {
        const columns = document.querySelectorAll('.column[data-id]');
        for (const col of columns) {
            const id = col.dataset.id;
            col.classList.toggle('coltoggle-hidden', this._hiddenColumns.has(id));
        }
    }

    /**
     * Retire la classe .coltoggle-hidden de toutes les colonnes.
     * Utilisé au uninstall.
     *
     * @private
     */
    _showAllColumns() {
        const columns = document.querySelectorAll('.column.coltoggle-hidden');
        for (const col of columns) {
            col.classList.remove('coltoggle-hidden');
        }
    }

    // -----------------------------------------------------------------
    //  DOM — Dropdown
    // -----------------------------------------------------------------

    /**
     * Crée et injecte le dropdown dans le container du header.
     * Inséré avant .app-header-settings si présent.
     *
     * @param {HTMLElement} container - div.app-header-actions
     * @private
     */
    _renderDropdown(container) {
        // Nettoie le précédent si re-render
        if (this._dropdownEl && this._dropdownEl.parentNode) {
            this._dropdownEl.remove();
        }
        this._removeOutsideClickHandler();

        const dropdown = document.createElement('div');
        dropdown.className = 'coltoggle-dropdown';

        // — Trigger button
        const trigger = document.createElement('button');
        trigger.className = 'coltoggle-dropdown-trigger';
        this._updateTriggerLabel(trigger);
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('coltoggle-dropdown--open');
        });
        dropdown.appendChild(trigger);

        // — Panel
        const panel = document.createElement('div');
        panel.className = 'coltoggle-dropdown-panel';
        panel.addEventListener('click', (e) => e.stopPropagation());

        this._buildPanelContent(panel);
        dropdown.appendChild(panel);

        // Insérer avant .app-header-settings
        const settingsBtn = container.querySelector('.app-header-settings');
        if (settingsBtn) {
            container.insertBefore(dropdown, settingsBtn);
        } else {
            container.appendChild(dropdown);
        }

        this._dropdownEl = dropdown;

        // Outside-click ferme le dropdown
        this._outsideClickHandler = (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('coltoggle-dropdown--open');
            }
        };
        document.addEventListener('click', this._outsideClickHandler);
    }

    /**
     * Reconstruit le contenu du panel et met à jour le trigger.
     *
     * @private
     */
    _refreshDropdown() {
        if (!this._dropdownEl) return;

        const trigger = this._dropdownEl.querySelector('.coltoggle-dropdown-trigger');
        const panel = this._dropdownEl.querySelector('.coltoggle-dropdown-panel');

        if (trigger) this._updateTriggerLabel(trigger);
        if (panel) {
            panel.innerHTML = '';
            this._buildPanelContent(panel);
        }
    }

    /**
     * Construit la liste de checkboxes et le bouton "Tout afficher".
     *
     * @param {HTMLElement} panel
     * @private
     */
    _buildPanelContent(panel) {
        if (!this._board) return;

        const columns = this._board.columns;
        const visibleCount = columns.length - this._hiddenColumns.size;

        const list = document.createElement('div');
        list.className = 'coltoggle-dropdown-list';

        for (const column of columns) {
            const isHidden = this._hiddenColumns.has(column.id);
            const isChecked = !isHidden;

            // Empêche de masquer la dernière colonne visible
            const isLastVisible = isChecked && visibleCount <= 1;

            const label = document.createElement('label');
            label.className = 'coltoggle-dropdown-item';
            if (isLastVisible) {
                label.classList.add('coltoggle-dropdown-item--disabled');
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = isChecked;
            checkbox.disabled = isLastVisible;
            checkbox.addEventListener('change', () => {
                this._toggleColumn(column.id, !checkbox.checked);
            });

            const span = document.createElement('span');
            span.textContent = column.title;

            label.appendChild(checkbox);
            label.appendChild(span);
            list.appendChild(label);
        }

        panel.appendChild(list);

        // Bouton "Tout afficher"
        const resetBtn = document.createElement('button');
        resetBtn.className = 'coltoggle-dropdown-reset';
        resetBtn.textContent = 'Tout afficher';
        resetBtn.disabled = this._hiddenColumns.size === 0;
        resetBtn.addEventListener('click', () => {
            this._showAll();
        });
        panel.appendChild(resetBtn);
    }

    /**
     * Met à jour le label du trigger selon l'état.
     *
     * @param {HTMLElement} trigger
     * @private
     */
    _updateTriggerLabel(trigger) {
        const hiddenCount = this._hiddenColumns.size;
        const active = hiddenCount > 0;

        trigger.textContent = active ? `Colonnes (${hiddenCount})` : 'Colonnes';
        trigger.classList.toggle('coltoggle-dropdown-trigger--active', active);
    }

    // -----------------------------------------------------------------
    //  Actions
    // -----------------------------------------------------------------

    /**
     * Masque ou affiche une colonne.
     *
     * @param {string} columnId
     * @param {boolean} hide - true pour masquer, false pour afficher
     * @private
     */
    _toggleColumn(columnId, hide) {
        // Protection : ne pas masquer la dernière colonne visible
        if (hide) {
            const total = this._board ? this._board.columns.length : 0;
            if (total - this._hiddenColumns.size <= 1) return;
        }

        if (hide) {
            this._hiddenColumns.add(columnId);
        } else {
            this._hiddenColumns.delete(columnId);
        }

        // Feedback visuel instantané
        const colEl = document.querySelector(`.column[data-id="${columnId}"]`);
        if (colEl) {
            colEl.classList.toggle('coltoggle-hidden', hide);
        }

        this._persist();
        this._refreshDropdown();
    }

    /**
     * Affiche toutes les colonnes.
     *
     * @private
     */
    _showAll() {
        this._hiddenColumns.clear();
        this._applyHiddenClasses();
        this._persist();
        this._refreshDropdown();
    }

    /**
     * Retire le handler de clic extérieur.
     *
     * @private
     */
    _removeOutsideClickHandler() {
        if (this._outsideClickHandler) {
            document.removeEventListener('click', this._outsideClickHandler);
            this._outsideClickHandler = null;
        }
    }
}
