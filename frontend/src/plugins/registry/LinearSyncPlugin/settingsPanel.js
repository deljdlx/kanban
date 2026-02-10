/**
 * settingsPanel — UI de configuration du LinearSyncPlugin.
 *
 * Deux points d'entree :
 *
 *   1. buildPluginSettings(plugin, container)
 *      → Panneau global du plugin (ouvert depuis la liste des plugins).
 *        Contient uniquement la configuration du token API.
 *
 *   2. buildBoardSettingsTab(plugin, registerTab, board)
 *      → Onglet "Linear" dans la modale Board Settings.
 *        Contient la selection d'equipe, le mapping, l'intervalle et
 *        le bouton de sync.
 *
 * API du plugin utilisee :
 *   - plugin.getToken() / plugin.saveToken(token)
 *   - plugin.getApiClient()
 *   - plugin.getBoardConfig() / plugin.saveBoardConfig(config)
 *   - plugin.restartPolling()
 *   - plugin.sync()
 */
import Container from '../../../Container.js';

const SYNC_INTERVALS = [
    { label: '30 secondes', value: 30000 },
    { label: '1 minute', value: 60000 },
    { label: '5 minutes', value: 300000 },
    { label: '10 minutes', value: 600000 },
];

// Valeur sentinelle dans le select pour l'option "Creer colonne"
const CREATE_COLUMN_VALUE = '__create__';

// =================================================================
//  1. Plugin settings (PluginAssembler → ModalPluginSettings)
// =================================================================

/**
 * Panneau de settings global du plugin (token API uniquement).
 * Signature imposee par PluginAssembler : (plugin, container, defaults).
 *
 * @param {import('./LinearSyncPlugin.js').default} plugin
 * @param {HTMLElement} container
 */
export function buildPluginSettings(plugin, container) {
    container.classList.add('lsync-settings');
    _buildTokenSection(container, plugin);
}

// =================================================================
//  2. Board settings tab (modal:boardSettings:opened)
// =================================================================

/**
 * Enregistre l'onglet "Linear" dans la modale Board Settings.
 * Appele depuis le handler du hook modal:boardSettings:opened.
 *
 * @param {import('./LinearSyncPlugin.js').default} plugin
 * @param {Function} registerTab - registerTab(id, label, buildFn)
 * @param {import('../../../models/Board.js').default} board
 */
export function buildBoardSettingsTab(plugin, registerTab, board) {
    registerTab('linear-sync', 'Linear', (panel) => {
        panel.classList.add('lsync-settings');

        const apiClient = plugin.getApiClient();

        // -- Section Token --
        _buildTokenSection(panel, plugin);

        // -- Section Equipe --
        const teamSection = _buildTeamSection(panel, plugin, apiClient);

        // -- Section Mapping (remplie dynamiquement apres selection equipe) --
        const mappingContainer = document.createElement('div');
        mappingContainer.className = 'lsync-section';
        panel.appendChild(mappingContainer);

        // -- Section Intervalle --
        _buildIntervalSection(panel, plugin);

        // -- Bouton Sync --
        _buildSyncButton(panel, plugin);

        // Si une equipe est deja configuree, charger les states
        const config = plugin.getBoardConfig();
        if (config.teamId && plugin.getToken()) {
            _loadWorkflowStates(plugin, board, apiClient, config.teamId, mappingContainer);
        }

        // Quand l'equipe change, recharger les states
        teamSection.addEventListener('change', () => {
            const teamId = teamSection.querySelector('select')?.value;
            if (teamId) {
                _loadWorkflowStates(plugin, board, apiClient, teamId, mappingContainer);
            }
        });
    });
}

// -----------------------------------------------------------------
//  Sections
// -----------------------------------------------------------------

/**
 * Section token API (partagee entre plugin settings et board settings).
 * @private
 */
function _buildTokenSection(panel, plugin) {
    const section = _createSection(panel, 'Token API Linear');

    const input = document.createElement('input');
    input.type = 'password';
    input.className = 'input';
    input.placeholder = 'lin_api_...';
    input.value = plugin.getToken() || '';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn--primary btn--sm';
    saveBtn.textContent = 'Sauvegarder';
    saveBtn.addEventListener('click', async () => {
        const token = input.value.trim();
        await plugin.saveToken(token || null);
        saveBtn.textContent = 'Sauvegarde !';
        setTimeout(() => {
            saveBtn.textContent = 'Sauvegarder';
        }, 1500);
    });

    const row = document.createElement('div');
    row.className = 'lsync-row';
    row.appendChild(input);
    row.appendChild(saveBtn);
    section.appendChild(row);
}

/**
 * Section selection equipe.
 * @private
 */
function _buildTeamSection(panel, plugin, apiClient) {
    const section = _createSection(panel, 'Equipe');

    const select = document.createElement('select');
    select.className = 'input';

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'Chargement...';
    select.appendChild(defaultOpt);
    section.appendChild(select);

    const config = plugin.getBoardConfig();

    // Charger les equipes depuis l'API
    if (plugin.getToken()) {
        apiClient
            .fetchTeams()
            .then((teams) => {
                select.innerHTML = '';

                const emptyOpt = document.createElement('option');
                emptyOpt.value = '';
                emptyOpt.textContent = '-- Choisir une equipe --';
                select.appendChild(emptyOpt);

                for (const team of teams) {
                    const opt = document.createElement('option');
                    opt.value = team.id;
                    opt.textContent = `${team.name} (${team.key})`;
                    if (team.id === config.teamId) {
                        opt.selected = true;
                    }
                    select.appendChild(opt);
                }
            })
            .catch(() => {
                select.innerHTML = '';
                const errOpt = document.createElement('option');
                errOpt.value = '';
                errOpt.textContent = 'Erreur — verifiez le token';
                select.appendChild(errOpt);
            });
    } else {
        defaultOpt.textContent = "Configurez le token d'abord";
    }

    // Persiste le choix d'equipe (reset le mapping quand l'equipe change)
    select.addEventListener('change', () => {
        const newConfig = plugin.getBoardConfig();
        newConfig.teamId = select.value || null;
        newConfig.stateMapping = {};
        newConfig.issueMap = {};
        plugin.saveBoardConfig(newConfig);
    });

    return section;
}

/**
 * Charge les workflow states et construit le tableau de mapping
 * states Linear → colonnes Kanban.
 *
 * Chaque ligne propose :
 *   - "-- Ignorer --" (ne pas importer)
 *   - "+ Creer <nom>" (cree une colonne avec le nom du state)
 *   - Les colonnes existantes du board
 *
 * @private
 */
async function _loadWorkflowStates(plugin, board, apiClient, teamId, container) {
    container.innerHTML = '';

    const title = document.createElement('h4');
    title.className = 'lsync-section-title';
    title.textContent = 'Mapping statuts → colonnes';
    container.appendChild(title);

    try {
        const states = await apiClient.fetchWorkflowStates(teamId);
        const config = plugin.getBoardConfig();
        const mapping = config.stateMapping || {};

        const table = document.createElement('div');
        table.className = 'lsync-mapping-table';

        for (const state of states) {
            _buildMappingRow(table, state, mapping, plugin, board);
        }

        container.appendChild(table);
    } catch (_err) {
        const errMsg = document.createElement('p');
        errMsg.className = 'lsync-error';
        errMsg.textContent = 'Erreur lors du chargement des statuts.';
        container.appendChild(errMsg);
    }
}

/**
 * Construit une ligne du tableau de mapping pour un workflow state.
 *
 * @param {HTMLElement} table
 * @param {Object} state - Workflow state Linear { id, name, color }
 * @param {Object} mapping - Mapping actuel { stateId: columnId }
 * @param {import('./LinearSyncPlugin.js').default} plugin
 * @param {import('../../../models/Board.js').default} board
 * @private
 */
function _buildMappingRow(table, state, mapping, plugin, board) {
    const row = document.createElement('div');
    row.className = 'lsync-mapping-row';

    // Badge couleur + nom du state
    const label = document.createElement('span');
    label.className = 'lsync-state-label';

    const dot = document.createElement('span');
    dot.className = 'lsync-state-dot';
    dot.style.backgroundColor = state.color;
    label.appendChild(dot);

    label.appendChild(document.createTextNode(state.name));
    row.appendChild(label);

    // Fleche
    const arrow = document.createElement('span');
    arrow.className = 'lsync-arrow';
    arrow.textContent = '→';
    row.appendChild(arrow);

    // Select colonne Kanban
    const select = document.createElement('select');
    select.className = 'input lsync-col-select';

    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = '-- Ignorer --';
    select.appendChild(noneOpt);

    // Option "Creer colonne" avec le nom du state
    const createOpt = document.createElement('option');
    createOpt.value = CREATE_COLUMN_VALUE;
    createOpt.textContent = `+ Creer "${state.name}"`;
    select.appendChild(createOpt);

    // Colonnes existantes du board
    for (const col of board.columns) {
        const opt = document.createElement('option');
        opt.value = col.id;
        opt.textContent = col.title;
        if (mapping[state.id] === col.id) {
            opt.selected = true;
        }
        select.appendChild(opt);
    }

    select.addEventListener('change', () => {
        _handleMappingChange(select, createOpt, state, plugin);
    });

    row.appendChild(select);
    table.appendChild(row);
}

/**
 * Gere le changement de mapping pour un state :
 * creer une colonne si demande, ou persister le mapping.
 *
 * @private
 */
function _handleMappingChange(select, createOpt, state, plugin) {
    const config = plugin.getBoardConfig();
    if (!config.stateMapping) {
        config.stateMapping = {};
    }

    if (select.value === CREATE_COLUMN_VALUE) {
        // Cree une colonne avec le nom du state Linear
        const boardService = Container.get('BoardService');
        const newColumn = boardService.addColumn(state.name);
        config.stateMapping[state.id] = newColumn.id;
        plugin.saveBoardConfig(config);

        // Remplace l'option "Creer" par la colonne creee dans le select
        const newOpt = document.createElement('option');
        newOpt.value = newColumn.id;
        newOpt.textContent = newColumn.title;
        newOpt.selected = true;
        select.replaceChild(newOpt, createOpt);
    } else if (select.value) {
        config.stateMapping[state.id] = select.value;
        plugin.saveBoardConfig(config);
    } else {
        delete config.stateMapping[state.id];
        plugin.saveBoardConfig(config);
    }
}

/**
 * Section intervalle de sync + toggle auto-sync.
 * @private
 */
function _buildIntervalSection(panel, plugin) {
    const section = _createSection(panel, 'Synchronisation');
    const config = plugin.getBoardConfig();

    // Checkbox auto-sync
    const autoRow = document.createElement('label');
    autoRow.className = 'checkbox-row';

    const autoCheckbox = document.createElement('input');
    autoCheckbox.type = 'checkbox';
    autoCheckbox.checked = config.autoSync || false;
    autoRow.appendChild(autoCheckbox);

    const autoLabel = document.createElement('span');
    autoLabel.textContent = 'Sync automatique';
    autoRow.appendChild(autoLabel);
    section.appendChild(autoRow);

    // Select intervalle
    const select = document.createElement('select');
    select.className = 'input';
    for (const opt of SYNC_INTERVALS) {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if ((config.syncInterval || 60000) === opt.value) {
            option.selected = true;
        }
        select.appendChild(option);
    }
    section.appendChild(select);

    // Derniere sync
    if (config.lastSyncAt) {
        const lastSync = document.createElement('p');
        lastSync.className = 'lsync-last-sync';
        lastSync.textContent = `Derniere sync : ${new Date(config.lastSyncAt).toLocaleString()}`;
        section.appendChild(lastSync);
    }

    // Persiste et redemarre le polling a chaque changement
    const persist = () => {
        const currentConfig = plugin.getBoardConfig();
        currentConfig.autoSync = autoCheckbox.checked;
        currentConfig.syncInterval = Number(select.value);
        plugin.saveBoardConfig(currentConfig);
        plugin.restartPolling();
    };

    autoCheckbox.addEventListener('change', persist);
    select.addEventListener('change', persist);
}

/**
 * Bouton "Synchroniser maintenant".
 * @private
 */
function _buildSyncButton(panel, plugin) {
    const section = _createSection(panel, '');

    const btn = document.createElement('button');
    btn.className = 'btn btn--primary';
    btn.textContent = 'Synchroniser maintenant';
    btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Synchronisation...';
        try {
            const stats = await plugin.sync();
            const total = stats.created + stats.updated + stats.moved;
            btn.textContent = `Termine ! (${total} changement${total > 1 ? 's' : ''})`;
        } catch (_err) {
            btn.textContent = 'Erreur de synchronisation';
        }
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = 'Synchroniser maintenant';
        }, 2000);
    });

    section.appendChild(btn);
}

// -----------------------------------------------------------------
//  Helpers
// -----------------------------------------------------------------

/**
 * Cree une section avec titre optionnel.
 * @private
 */
function _createSection(parent, title) {
    const section = document.createElement('div');
    section.className = 'lsync-section';

    if (title) {
        const h4 = document.createElement('h4');
        h4.className = 'lsync-section-title';
        h4.textContent = title;
        section.appendChild(h4);
    }

    parent.appendChild(section);
    return section;
}
