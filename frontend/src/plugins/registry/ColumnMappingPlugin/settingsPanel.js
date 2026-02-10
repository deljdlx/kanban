/**
 * settingsPanel.js — Panneau de configuration du ColumnMappingPlugin.
 *
 * Onglet "Column Mapping" dans les Board Settings.
 * Permet d'ajouter/supprimer des mappings entre colonnes locales
 * et colonnes de boards sources.
 *
 * UX : choisir un board source → voir toutes ses colonnes → configurer
 * chaque mapping via un select inline → ajouter en bulk.
 *
 * UI :
 *   ┌─────────────────────────────────────────────────────┐
 *   │ Mappings actuels :                                  │
 *   │ [A faire] ← Projet A / Todo                   [×]  │
 *   │ [En cours] ← Projet B / In Progress           [×]  │
 *   │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
 *   │ Ajouter des mappings :                              │
 *   │                                                     │
 *   │ Board source : [▼ Projet A          ]               │
 *   │                                                     │
 *   │ Colonnes du board source :                          │
 *   │                                                     │
 *   │ Todo         → [▼ A faire            ]              │
 *   │ In Progress  → [▼ — Ignorer —        ]              │
 *   │ Done         → [▼ + Créer colonne    ]              │
 *   │ Review       → [▼ + Créer (autre nom)] [________]   │
 *   │                                                     │
 *   │              [+ Ajouter les mappings]                │
 *   └─────────────────────────────────────────────────────┘
 */
import StorageService from '../../../services/StorageService.js';
import BoardService from '../../../services/BoardService.js';

// ---------------------------------------------------------------
// Clé de stockage dans pluginData
// ---------------------------------------------------------------
const PLUGIN_KEY = 'column-mapping';

/**
 * Construit le panneau de settings dans le conteneur fourni.
 *
 * @param {HTMLElement} panel - Conteneur DOM (fourni par ModalBoardSettings)
 * @param {Object} board - Le board courant
 */
export function buildSettingsPanel(panel, board) {
    panel.classList.add('column-mapping-panel');

    // Titre
    const title = document.createElement('h3');
    title.textContent = 'Column Mapping';
    panel.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'mapping-subtitle';
    subtitle.textContent = 'Affiche des cartes miroir depuis d\u2019autres boards (lecture seule).';
    panel.appendChild(subtitle);

    // Liste des mappings existants
    const listContainer = document.createElement('div');
    listContainer.className = 'mapping-list';
    panel.appendChild(listContainer);

    // Séparateur
    const separator = document.createElement('hr');
    separator.className = 'mapping-separator';
    panel.appendChild(separator);

    // Formulaire d'ajout
    const formTitle = document.createElement('h4');
    formTitle.className = 'label';
    formTitle.textContent = 'Ajouter des mappings';
    panel.appendChild(formTitle);

    const form = document.createElement('div');
    form.className = 'mapping-form';
    panel.appendChild(form);

    // Select : board source
    const boardLabel = document.createElement('label');
    boardLabel.className = 'label';
    boardLabel.textContent = 'Board source';
    const boardSelect = document.createElement('select');
    boardSelect.className = 'input';
    boardLabel.appendChild(boardSelect);
    form.appendChild(boardLabel);

    // Conteneur des colonnes sources (peuplé dynamiquement)
    const columnsContainer = document.createElement('div');
    columnsContainer.className = 'mapping-columns';
    form.appendChild(columnsContainer);

    // Bouton Ajouter les mappings
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn--primary mapping-add-btn';
    addBtn.textContent = '+ Ajouter les mappings';
    addBtn.classList.add('hidden');
    form.appendChild(addBtn);

    // Cache des boards sources chargés depuis IndexedDB (données complètes avec colonnes)
    const loadedBoards = new Map();

    // Registre des boards (id + name, sans colonnes) — pour afficher les noms
    let boardRegistry = [];

    // -------------------------------------------------------------------
    // Peuple le select des boards sources (async)
    // -------------------------------------------------------------------
    _populateBoardSelect(boardSelect, BoardService.getCurrentBoardId()).then((boards) => {
        boardRegistry = boards;
        // Charge les colonnes du premier board sélectionné
        _onBoardChanged();
    });

    // -------------------------------------------------------------------
    // Quand le board source change → charger ses colonnes
    // -------------------------------------------------------------------
    boardSelect.addEventListener('change', () => _onBoardChanged());

    /**
     * Charge le board source sélectionné et affiche ses colonnes
     * avec les selects de mapping inline.
     */
    async function _onBoardChanged() {
        columnsContainer.innerHTML = '';
        addBtn.classList.add('hidden');

        const selectedBoardId = boardSelect.value;
        if (!selectedBoardId) return;

        // Charge le board source depuis IndexedDB (données complètes avec colonnes)
        let boardData = loadedBoards.get(selectedBoardId);
        if (!boardData) {
            boardData = await StorageService.loadBoard(selectedBoardId);
            if (boardData) loadedBoards.set(selectedBoardId, boardData);
        }

        if (!boardData) return;

        _renderSourceColumns(boardData, selectedBoardId);
        addBtn.classList.remove('hidden');
    }

    /**
     * Affiche une row par colonne du board source, avec un select inline
     * pour choisir la colonne locale cible (ou ignorer, ou créer).
     *
     * Les colonnes déjà mappées sont pré-sélectionnées.
     *
     * @param {Object} boardData - Données complètes du board source
     * @param {string} sourceBoardId - ID du board source
     */
    function _renderSourceColumns(boardData, sourceBoardId) {
        columnsContainer.innerHTML = '';

        const sourceColumns = boardData.columns || [];
        if (sourceColumns.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'mapping-empty';
            empty.textContent = 'Ce board n\u2019a aucune colonne.';
            columnsContainer.appendChild(empty);
            return;
        }

        // Mappings existants pour ce board source
        const data = board.pluginData[PLUGIN_KEY];
        const mappings = data?.mappings || [];

        for (const srcCol of sourceColumns) {
            const row = document.createElement('div');
            row.className = 'mapping-col-row';

            // Nom de la colonne source
            const nameSpan = document.createElement('span');
            nameSpan.className = 'mapping-col-name';
            nameSpan.textContent = srcCol.title || 'Sans titre';
            nameSpan.title = srcCol.title || 'Sans titre';
            row.appendChild(nameSpan);

            // Flèche →
            const arrow = document.createElement('span');
            arrow.className = 'mapping-col-arrow';
            arrow.textContent = '\u2192';
            row.appendChild(arrow);

            // Select : colonne locale cible
            const targetSelect = document.createElement('select');
            targetSelect.className = 'input input--sm mapping-col-target';
            targetSelect.dataset.sourceColumnId = srcCol.id;

            // Option par défaut : ignorer
            const ignoreOpt = document.createElement('option');
            ignoreOpt.value = '';
            ignoreOpt.textContent = '\u2014 Ignorer \u2014';
            targetSelect.appendChild(ignoreOpt);

            // Colonnes locales existantes
            for (const localCol of board.columns) {
                const opt = document.createElement('option');
                opt.value = localCol.id;
                opt.textContent = localCol.title;
                targetSelect.appendChild(opt);
            }

            // Option spéciale : créer une colonne (même nom que la source)
            const createOpt = document.createElement('option');
            createOpt.value = '__new__';
            createOpt.textContent = '+ Cr\u00e9er colonne';
            targetSelect.appendChild(createOpt);

            // Option spéciale : créer une colonne avec un nom personnalisé
            const createCustomOpt = document.createElement('option');
            createCustomOpt.value = '__new_custom__';
            createCustomOpt.textContent = '+ Cr\u00e9er (autre nom)';
            targetSelect.appendChild(createCustomOpt);

            // Input pour le nom personnalisé (visible uniquement si __new_custom__)
            const customNameInput = document.createElement('input');
            customNameInput.type = 'text';
            customNameInput.className = 'input input--sm mapping-col-custom-name';
            customNameInput.placeholder = 'Nom de la colonne';
            customNameInput.classList.add('hidden');

            targetSelect.addEventListener('change', () => {
                customNameInput.classList.toggle('hidden', targetSelect.value !== '__new_custom__');
            });

            // Pré-sélection si un mapping existe déjà pour cette colonne source
            const existing = mappings.find((m) => m.sourceBoardId === sourceBoardId && m.sourceColumnId === srcCol.id);
            if (existing) {
                targetSelect.value = existing.localColumnId;
            }

            row.appendChild(targetSelect);
            row.appendChild(customNameInput);
            columnsContainer.appendChild(row);
        }
    }

    // -------------------------------------------------------------------
    // Ajouter les mappings en bulk
    // -------------------------------------------------------------------
    addBtn.addEventListener('click', async () => {
        const sourceBoardId = boardSelect.value;
        if (!sourceBoardId) return;

        const data = board.pluginData[PLUGIN_KEY] || { mappings: [] };
        const selects = columnsContainer.querySelectorAll('.mapping-col-target');
        let changed = false;

        for (const select of selects) {
            const targetValue = select.value;
            if (!targetValue) continue; // — Ignorer —

            const sourceColumnId = select.dataset.sourceColumnId;
            let localColumnId = targetValue;

            // Créer une nouvelle colonne locale (même nom que la source)
            if (targetValue === '__new__') {
                const nameSpan = select.closest('.mapping-col-row').querySelector('.mapping-col-name');
                const colName = nameSpan.textContent;
                const col = BoardService.addColumn(colName);
                localColumnId = col.id;
            }

            // Créer une nouvelle colonne locale (nom personnalisé)
            if (targetValue === '__new_custom__') {
                const input = select.closest('.mapping-col-row').querySelector('.mapping-col-custom-name');
                const colName = input.value.trim();
                if (!colName) continue;
                const col = BoardService.addColumn(colName);
                localColumnId = col.id;
            }

            // Dédoublonnage : skip si un mapping identique existe déjà
            const exists = data.mappings.some(
                (m) =>
                    m.localColumnId === localColumnId &&
                    m.sourceBoardId === sourceBoardId &&
                    m.sourceColumnId === sourceColumnId,
            );
            if (exists) continue;

            data.mappings.push({
                localColumnId,
                sourceBoardId,
                sourceColumnId,
            });
            changed = true;
        }

        if (changed) {
            board.setPluginData(PLUGIN_KEY, data);

            // Re-render la liste et les colonnes (pour refléter les pré-sélections)
            _renderMappingList();
            _renderSourceColumns(loadedBoards.get(sourceBoardId), sourceBoardId);
        }
    });

    // -------------------------------------------------------------------
    // Rendu de la liste des mappings
    // -------------------------------------------------------------------
    function _renderMappingList() {
        listContainer.innerHTML = '';

        const data = board.pluginData[PLUGIN_KEY];
        const mappings = data?.mappings || [];

        if (mappings.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'mapping-empty';
            empty.textContent = 'Aucun mapping configur\u00e9.';
            listContainer.appendChild(empty);
            return;
        }

        for (let i = 0; i < mappings.length; i++) {
            const mapping = mappings[i];
            const item = document.createElement('div');
            item.className = 'mapping-item';

            // Label : [colonne locale] ← Board source / Colonne source
            const label = document.createElement('span');
            label.className = 'mapping-item-label';

            const localCol = board.columns.find((c) => c.id === mapping.localColumnId);
            const localName = localCol ? localCol.title : mapping.localColumnId;

            // Cherche le nom du board source dans le registre ou le cache complet
            const regEntry = boardRegistry.find((b) => b.id === mapping.sourceBoardId);
            const fullBoard = loadedBoards.get(mapping.sourceBoardId);
            const boardName = regEntry?.name || fullBoard?.name || mapping.sourceBoardId;

            let sourceColName = mapping.sourceColumnId;
            if (fullBoard) {
                const srcCol = (fullBoard.columns || []).find((c) => c.id === mapping.sourceColumnId);
                if (srcCol) sourceColName = srcCol.title || sourceColName;
            }

            label.textContent = `[${localName}] \u2190 ${boardName} / ${sourceColName}`;
            item.appendChild(label);

            // Bouton supprimer
            const removeBtn = document.createElement('button');
            removeBtn.className = 'mapping-remove-btn';
            removeBtn.textContent = '\u00D7';
            removeBtn.title = 'Supprimer ce mapping';
            removeBtn.addEventListener('click', () => {
                _removeMapping(i);
            });
            item.appendChild(removeBtn);

            listContainer.appendChild(item);
        }
    }

    // -------------------------------------------------------------------
    // Supprime un mapping par index, puis met à jour l'affichage
    // -------------------------------------------------------------------
    function _removeMapping(index) {
        const data = board.pluginData[PLUGIN_KEY];
        if (!data?.mappings) return;

        data.mappings.splice(index, 1);
        board.setPluginData(PLUGIN_KEY, data);

        _renderMappingList();

        // Re-render les colonnes sources si un board est sélectionné (pré-sélections)
        const sourceBoardId = boardSelect.value;
        if (sourceBoardId && loadedBoards.has(sourceBoardId)) {
            _renderSourceColumns(loadedBoards.get(sourceBoardId), sourceBoardId);
        }
    }

    // Rendu initial
    _renderMappingList();
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

/**
 * Peuple le select des boards disponibles (exclut le board courant).
 *
 * @param {HTMLSelectElement} select
 * @param {string} currentBoardId - ID du board courant (à exclure)
 * @returns {Promise<Array<{ id: string, name: string }>>}
 */
async function _populateBoardSelect(select, currentBoardId) {
    const registry = await StorageService.getBoardRegistry();
    const boards = (registry.boards || []).filter((b) => b.id !== currentBoardId);

    select.innerHTML = '';

    if (boards.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Aucun autre board disponible';
        select.appendChild(opt);
        return [];
    }

    for (const b of boards) {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name;
        select.appendChild(opt);
    }

    return boards;
}
