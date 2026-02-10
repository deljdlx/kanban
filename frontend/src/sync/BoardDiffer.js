/**
 * BoardDiffer — Calcule les différences entre deux snapshots de board.
 *
 * Fonction pure. Compare deux résultats de Board.toJSON() et retourne
 * un tableau d'opérations décrivant ce qui a changé.
 *
 * Granularité :
 *   - Board-level : name, backgroundImage (scalaire)
 *   - pluginData : comparaison par clé (deep equal via JSON.stringify)
 *   - Colonnes : ajout, suppression, réordonnancement, titre, pluginData
 *   - Cartes : bulk par colonne (si une colonne a changé, on envoie toutes ses cartes)
 */

/**
 * Compare deux snapshots et retourne les opérations de différence.
 *
 * IMPORTANT : les types d'opérations produits ici doivent rester synchronisés
 * avec ceux consommés par LiveSyncPlugin._applyOp(). Ajouter un type dans
 * l'un implique de l'ajouter dans l'autre.
 * @see OpApplier.js
 *
 * @param {Object} oldBoard - Board.toJSON() avant
 * @param {Object} newBoard - Board.toJSON() après
 * @returns {Array<{ type: string, [key: string]: * }>} Liste d'opérations
 */
export function diff(oldBoard, newBoard) {
    const ops = [];

    // ---------------------------------------------------------------
    // 1. Propriétés scalaires du board
    // ---------------------------------------------------------------

    if (oldBoard.name !== newBoard.name) {
        ops.push({ type: 'board:name', value: newBoard.name });
    }

    if (oldBoard.backgroundImage !== newBoard.backgroundImage) {
        ops.push({ type: 'board:backgroundImage', value: newBoard.backgroundImage });
    }

    // ---------------------------------------------------------------
    // 2. pluginData : comparaison par clé
    // ---------------------------------------------------------------

    const oldPluginData = oldBoard.pluginData || {};
    const newPluginData = newBoard.pluginData || {};

    // Clés ajoutées ou modifiées
    for (const key of Object.keys(newPluginData)) {
        if (JSON.stringify(oldPluginData[key]) !== JSON.stringify(newPluginData[key])) {
            ops.push({ type: 'board:pluginData', key, value: newPluginData[key] });
        }
    }

    // Clés supprimées (présentes dans old, absentes dans new).
    // On utilise null (pas undefined) car undefined est supprimé par JSON.stringify.
    for (const key of Object.keys(oldPluginData)) {
        if (!(key in newPluginData)) {
            ops.push({ type: 'board:pluginData', key, value: null });
        }
    }

    // ---------------------------------------------------------------
    // 3. Colonnes
    // ---------------------------------------------------------------

    const oldCols = oldBoard.columns || [];
    const newCols = newBoard.columns || [];

    const oldColMap = new Map(oldCols.map((c) => [c.id, c]));
    const newColMap = new Map(newCols.map((c) => [c.id, c]));

    // Colonnes supprimées (dans old, pas dans new)
    for (const oldCol of oldCols) {
        if (!newColMap.has(oldCol.id)) {
            ops.push({ type: 'column:remove', columnId: oldCol.id });
        }
    }

    // Colonnes ajoutées (dans new, pas dans old)
    for (let i = 0; i < newCols.length; i++) {
        const newCol = newCols[i];
        if (!oldColMap.has(newCol.id)) {
            ops.push({ type: 'column:add', column: newCol, index: i });
        }
    }

    // Réordonnancement : comparer l'ordre des IDs.
    // Toujours émis quand la liste change (y compris après add/remove),
    // car board.addColumn() pousse en fin — le reorder replace la colonne
    // à la bonne position. Pas de flicker : toutes les ops s'exécutent
    // dans le même tour JS, avant le prochain paint du navigateur.
    const oldIds = oldCols.map((c) => c.id);
    const newIds = newCols.map((c) => c.id);
    if (JSON.stringify(oldIds) !== JSON.stringify(newIds)) {
        ops.push({ type: 'column:reorder', orderedIds: newIds });
    }

    // Pour chaque colonne présente dans les deux snapshots :
    // comparer titre, pluginData et cartes
    for (const newCol of newCols) {
        const oldCol = oldColMap.get(newCol.id);
        if (!oldCol) continue; // colonne ajoutée, déjà traitée

        // Titre changé
        if (oldCol.title !== newCol.title) {
            ops.push({ type: 'column:title', columnId: newCol.id, value: newCol.title });
        }

        // pluginData de colonne : comparaison par clé (même logique que board.pluginData)
        const oldColPD = oldCol.pluginData || {};
        const newColPD = newCol.pluginData || {};

        for (const key of Object.keys(newColPD)) {
            if (JSON.stringify(oldColPD[key]) !== JSON.stringify(newColPD[key])) {
                ops.push({ type: 'column:pluginData', columnId: newCol.id, key, value: newColPD[key] });
            }
        }
        for (const key of Object.keys(oldColPD)) {
            if (!(key in newColPD)) {
                ops.push({ type: 'column:pluginData', columnId: newCol.id, key, value: null });
            }
        }

        // Cartes changées (comparaison bulk via stringify)
        if (JSON.stringify(oldCol.cards) !== JSON.stringify(newCol.cards)) {
            ops.push({ type: 'column:cards', columnId: newCol.id, cards: newCol.cards });
        }
    }

    return ops;
}
