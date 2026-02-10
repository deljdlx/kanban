/**
 * Tests unitaires — BoardDiffer (diff pure function).
 */
import { describe, it, expect } from 'vitest';
import { diff } from './BoardDiffer.js';

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

/** Crée un snapshot minimal de board pour les tests. */
function makeBoard(overrides = {}) {
    return {
        name: 'Board',
        backgroundImage: null,
        pluginData: {},
        columns: [],
        ...overrides,
    };
}

function makeColumn(id, title, cards = [], pluginData = {}) {
    return { id, title, cards, pluginData };
}

function makeCard(id, title) {
    return { id, title, description: '', tags: {} };
}

// ---------------------------------------------------------------
// Tests
// ---------------------------------------------------------------

describe('BoardDiffer.diff', () => {
    it("retourne un tableau vide si rien n'a changé", () => {
        const board = makeBoard({ name: 'X', columns: [makeColumn('c1', 'Todo')] });
        expect(diff(board, board)).toEqual([]);
    });

    // ---------------------------------------------------------------
    // Propriétés scalaires
    // ---------------------------------------------------------------

    it('détecte un changement de nom', () => {
        const old = makeBoard({ name: 'A' });
        const nw = makeBoard({ name: 'B' });
        const ops = diff(old, nw);
        expect(ops).toEqual([{ type: 'board:name', value: 'B' }]);
    });

    it('détecte un changement de backgroundImage', () => {
        const old = makeBoard({ backgroundImage: null });
        const nw = makeBoard({ backgroundImage: { id: 'img-1' } });
        const ops = diff(old, nw);
        expect(ops).toEqual([{ type: 'board:backgroundImage', value: { id: 'img-1' } }]);
    });

    // ---------------------------------------------------------------
    // pluginData
    // ---------------------------------------------------------------

    it('détecte une clé pluginData ajoutée', () => {
        const old = makeBoard({ pluginData: {} });
        const nw = makeBoard({ pluginData: { colors: { a: 'red' } } });
        const ops = diff(old, nw);
        expect(ops).toEqual([{ type: 'board:pluginData', key: 'colors', value: { a: 'red' } }]);
    });

    it('détecte une clé pluginData modifiée', () => {
        const old = makeBoard({ pluginData: { colors: { a: 'red' } } });
        const nw = makeBoard({ pluginData: { colors: { a: 'blue' } } });
        const ops = diff(old, nw);
        expect(ops).toEqual([{ type: 'board:pluginData', key: 'colors', value: { a: 'blue' } }]);
    });

    it('détecte une clé pluginData supprimée (null)', () => {
        const old = makeBoard({ pluginData: { colors: { a: 'red' } } });
        const nw = makeBoard({ pluginData: {} });
        const ops = diff(old, nw);
        expect(ops).toEqual([{ type: 'board:pluginData', key: 'colors', value: null }]);
    });

    it('ignore les clés pluginData identiques', () => {
        const pd = { colors: { a: 'red' } };
        const old = makeBoard({ pluginData: pd });
        const nw = makeBoard({ pluginData: { colors: { a: 'red' } } });
        expect(diff(old, nw)).toEqual([]);
    });

    // ---------------------------------------------------------------
    // Colonnes : ajout / suppression / réordonnancement
    // ---------------------------------------------------------------

    it('détecte une colonne ajoutée', () => {
        const col = makeColumn('c2', 'Done');
        const old = makeBoard({ columns: [makeColumn('c1', 'Todo')] });
        const nw = makeBoard({ columns: [makeColumn('c1', 'Todo'), col] });
        const ops = diff(old, nw);

        expect(ops).toContainEqual({ type: 'column:add', column: col, index: 1 });
        expect(ops).toContainEqual({ type: 'column:reorder', orderedIds: ['c1', 'c2'] });
    });

    it('détecte une colonne supprimée', () => {
        const old = makeBoard({ columns: [makeColumn('c1', 'Todo'), makeColumn('c2', 'Done')] });
        const nw = makeBoard({ columns: [makeColumn('c1', 'Todo')] });
        const ops = diff(old, nw);

        expect(ops).toContainEqual({ type: 'column:remove', columnId: 'c2' });
        expect(ops).toContainEqual({ type: 'column:reorder', orderedIds: ['c1'] });
    });

    it('détecte un réordonnancement de colonnes', () => {
        const old = makeBoard({ columns: [makeColumn('c1', 'A'), makeColumn('c2', 'B')] });
        const nw = makeBoard({ columns: [makeColumn('c2', 'B'), makeColumn('c1', 'A')] });
        const ops = diff(old, nw);

        expect(ops).toContainEqual({ type: 'column:reorder', orderedIds: ['c2', 'c1'] });
    });

    it("n'émet pas column:reorder si l'ordre est identique", () => {
        const old = makeBoard({ columns: [makeColumn('c1', 'A')] });
        const nw = makeBoard({ columns: [makeColumn('c1', 'A')] });
        const ops = diff(old, nw);

        expect(ops.find((o) => o.type === 'column:reorder')).toBeUndefined();
    });

    // ---------------------------------------------------------------
    // Colonnes : pluginData
    // ---------------------------------------------------------------

    it('détecte une clé column pluginData ajoutée', () => {
        const old = makeBoard({ columns: [makeColumn('c1', 'A', [], {})] });
        const nw = makeBoard({ columns: [makeColumn('c1', 'A', [], { 'wip-limit': 5 })] });
        const ops = diff(old, nw);

        expect(ops).toContainEqual({
            type: 'column:pluginData',
            columnId: 'c1',
            key: 'wip-limit',
            value: 5,
        });
    });

    it('détecte une clé column pluginData modifiée', () => {
        const old = makeBoard({ columns: [makeColumn('c1', 'A', [], { color: '#ff0000' })] });
        const nw = makeBoard({ columns: [makeColumn('c1', 'A', [], { color: '#00ff00' })] });
        const ops = diff(old, nw);

        expect(ops).toContainEqual({
            type: 'column:pluginData',
            columnId: 'c1',
            key: 'color',
            value: '#00ff00',
        });
    });

    it('détecte une clé column pluginData supprimée (null)', () => {
        const old = makeBoard({ columns: [makeColumn('c1', 'A', [], { color: '#ff0000' })] });
        const nw = makeBoard({ columns: [makeColumn('c1', 'A', [], {})] });
        const ops = diff(old, nw);

        expect(ops).toContainEqual({
            type: 'column:pluginData',
            columnId: 'c1',
            key: 'color',
            value: null,
        });
    });

    it('ignore les clés column pluginData identiques', () => {
        const pd = { color: '#ff0000' };
        const old = makeBoard({ columns: [makeColumn('c1', 'A', [], pd)] });
        const nw = makeBoard({ columns: [makeColumn('c1', 'A', [], { color: '#ff0000' })] });
        expect(diff(old, nw).find((o) => o.type === 'column:pluginData')).toBeUndefined();
    });

    it('gère des column pluginData manquants (undefined → {})', () => {
        const old = makeBoard({ columns: [{ id: 'c1', title: 'A', cards: [] }] });
        const nw = makeBoard({ columns: [makeColumn('c1', 'A', [], { x: 1 })] });
        const ops = diff(old, nw);
        expect(ops).toContainEqual({
            type: 'column:pluginData',
            columnId: 'c1',
            key: 'x',
            value: 1,
        });
    });

    // ---------------------------------------------------------------
    // Colonnes : titre et cartes
    // ---------------------------------------------------------------

    it('détecte un changement de titre de colonne', () => {
        const old = makeBoard({ columns: [makeColumn('c1', 'A')] });
        const nw = makeBoard({ columns: [makeColumn('c1', 'B')] });
        const ops = diff(old, nw);

        expect(ops).toContainEqual({ type: 'column:title', columnId: 'c1', value: 'B' });
    });

    it('détecte un changement de cartes dans une colonne', () => {
        const old = makeBoard({ columns: [makeColumn('c1', 'A', [makeCard('k1', 'X')])] });
        const nw = makeBoard({ columns: [makeColumn('c1', 'A', [makeCard('k1', 'Y')])] });
        const ops = diff(old, nw);

        expect(ops).toContainEqual({
            type: 'column:cards',
            columnId: 'c1',
            cards: [makeCard('k1', 'Y')],
        });
    });

    it('ne produit pas column:cards si les cartes sont identiques', () => {
        const cards = [makeCard('k1', 'X')];
        const old = makeBoard({ columns: [makeColumn('c1', 'A', cards)] });
        const nw = makeBoard({ columns: [makeColumn('c1', 'A', [makeCard('k1', 'X')])] });
        expect(diff(old, nw).find((o) => o.type === 'column:cards')).toBeUndefined();
    });

    // ---------------------------------------------------------------
    // Combinaisons
    // ---------------------------------------------------------------

    it('produit plusieurs ops pour des changements simultanés', () => {
        const old = makeBoard({
            name: 'A',
            columns: [makeColumn('c1', 'Todo', [makeCard('k1', 'Task')])],
        });
        const nw = makeBoard({
            name: 'B',
            columns: [makeColumn('c1', 'Done', [makeCard('k1', 'Task'), makeCard('k2', 'New')])],
        });
        const ops = diff(old, nw);

        expect(ops.find((o) => o.type === 'board:name')).toBeTruthy();
        expect(ops.find((o) => o.type === 'column:title')).toBeTruthy();
        expect(ops.find((o) => o.type === 'column:cards')).toBeTruthy();
    });

    // ---------------------------------------------------------------
    // Edge cases
    // ---------------------------------------------------------------

    it('gère des boards sans colonnes', () => {
        expect(diff(makeBoard(), makeBoard())).toEqual([]);
    });

    it('gère des pluginData manquants (undefined → {})', () => {
        const old = { name: 'A', columns: [] };
        const nw = { name: 'A', columns: [], pluginData: { x: 1 } };
        const ops = diff(old, nw);
        expect(ops).toContainEqual({ type: 'board:pluginData', key: 'x', value: 1 });
    });
});
