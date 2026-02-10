/**
 * OpApplier — Applique les opérations de synchronisation sur le board.
 *
 * Chaque opération déclenche les events 'change' appropriés sur les models,
 * ce qui provoque le re-render des vues.
 *
 * IMPORTANT : les types d'opérations ici doivent rester synchronisés
 * avec ceux produits par BoardDiffer.diff().
 * @see BoardDiffer.js
 */
import Container from '../Container.js';
import Column from '../models/Column.js';
import Card from '../models/Card.js';

export default class OpApplier {
    /**
     * Applique un tableau d'opérations sur le board courant.
     * Chaque opération est isolée dans un try/catch pour qu'une op
     * malformée ne bloque pas les suivantes.
     *
     * @param {Array} ops - Tableau d'opérations
     */
    applyAll(ops) {
        if (!Array.isArray(ops)) return;

        for (const op of ops) {
            try {
                this.apply(op);
            } catch (err) {
                console.warn("OpApplier: erreur lors de l'application", op, err);
            }
        }
    }

    /**
     * Applique une seule opération sur le board courant.
     *
     * @param {{ type: string, [key: string]: * }} op
     */
    apply(op) {
        const board = Container.get('BoardService').getBoard();

        switch (op.type) {
            case 'board:name':
                board.name = op.value;
                break;

            case 'board:backgroundImage':
                board.backgroundImage = op.value;
                break;

            case 'board:pluginData':
                this._applyPluginData(board, op);
                break;

            case 'column:add':
                this._applyColumnAdd(board, op);
                break;

            case 'column:remove':
                board.removeColumn(op.columnId);
                break;

            case 'column:reorder':
                board.reorderColumns(op.orderedIds);
                break;

            case 'column:title':
                this._applyColumnTitle(board, op);
                break;

            case 'column:pluginData':
                this._applyColumnPluginData(board, op);
                break;

            case 'column:cards':
                this._applyColumnCards(board, op);
                break;

            default:
                console.warn(`OpApplier: opération inconnue "${op.type}"`);
        }
    }

    /**
     * @param {Object} board
     * @param {{ key: string, value: * }} op
     * @private
     */
    _applyPluginData(board, op) {
        if (op.value === null) {
            board.removePluginData(op.key);
        } else {
            board.setPluginData(op.key, op.value);
        }
    }

    /**
     * @param {Object} board
     * @param {{ column: Object, index: number }} op
     * @private
     */
    _applyColumnAdd(board, op) {
        const cards = (op.column.cards || []).map((d) => new Card(d));
        const column = new Column({ ...op.column, cards });
        board.addColumn(column);
    }

    /**
     * @param {Object} board
     * @param {{ columnId: string, value: string }} op
     * @private
     */
    _applyColumnTitle(board, op) {
        const col = board.getColumnById(op.columnId);
        if (col) {
            col.updateTitle(op.value);
        }
    }

    /**
     * @param {Object} board
     * @param {{ columnId: string, key: string, value: * }} op
     * @private
     */
    _applyColumnPluginData(board, op) {
        const col = board.getColumnById(op.columnId);
        if (!col) return;

        if (op.value === null) {
            // Suppression : accès direct car Column n'a pas removePluginData()
            delete col.pluginDataRef[op.key];
            col.emit('change');
        } else {
            col.setPluginData(op.key, op.value);
        }
    }

    /**
     * @param {Object} board
     * @param {{ columnId: string, cards: Array }} op
     * @private
     */
    _applyColumnCards(board, op) {
        const col = board.getColumnById(op.columnId);
        if (col) {
            const newCards = (op.cards || []).map((d) => new Card(d));
            col.replaceCards(newCards);
        }
    }
}
