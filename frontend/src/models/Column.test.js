/**
 * Tests unitaires — Column (modèle de colonne).
 */
import { describe, it, expect, vi } from 'vitest';
import Column from './Column.js';
import Card from './Card.js';

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function makeCard(id = 'card-1', title = 'Task') {
    return new Card({ id, title, description: '', tags: {} });
}

function makeColumn(overrides = {}) {
    return new Column({
        id: 'col-1',
        title: 'Todo',
        cards: [],
        ...overrides,
    });
}

// ---------------------------------------------------------------
// Construction
// ---------------------------------------------------------------

describe('Column — construction', () => {
    it('stocke id, titre et cartes', () => {
        const col = makeColumn({ cards: [makeCard()] });
        expect(col.id).toBe('col-1');
        expect(col.title).toBe('Todo');
        expect(col.count).toBe(1);
    });

    it('copie le tableau de cartes à la construction', () => {
        const cards = [makeCard()];
        const col = new Column({ id: 'c', title: 'T', cards });
        cards.push(makeCard('card-2'));
        expect(col.count).toBe(1); // Pas affecté par la mutation externe
    });

    it('pluginData est {} par défaut', () => {
        const col = makeColumn();
        expect(col.pluginData).toEqual({});
    });
});

// ---------------------------------------------------------------
// Getters
// ---------------------------------------------------------------

describe('Column — getters', () => {
    it('cards retourne une copie', () => {
        const col = makeColumn({ cards: [makeCard()] });
        const cards = col.cards;
        cards.push(makeCard('card-2'));
        expect(col.count).toBe(1); // Pas affecté
    });

    it('count reflète le nombre de cartes', () => {
        const col = makeColumn({ cards: [makeCard('a'), makeCard('b')] });
        expect(col.count).toBe(2);
    });

    it('getCardById retourne la carte ou undefined', () => {
        const card = makeCard('card-1');
        const col = makeColumn({ cards: [card] });
        expect(col.getCardById('card-1')).toBe(card);
        expect(col.getCardById('nope')).toBeUndefined();
    });
});

// ---------------------------------------------------------------
// pluginData
// ---------------------------------------------------------------

describe('Column — pluginData', () => {
    it('pluginData retourne une copie shallow', () => {
        const col = makeColumn();
        col.pluginDataRef['test'] = 42;
        const pd = col.pluginData;
        pd['other'] = 99;
        expect(col.pluginData).not.toHaveProperty('other');
    });

    it('pluginDataRef retourne la référence directe', () => {
        const col = makeColumn();
        col.pluginDataRef['key'] = 'value';
        expect(col.pluginDataRef['key']).toBe('value');
    });

    it('setPluginData stocke et émet change', () => {
        const col = makeColumn();
        const spy = vi.fn();
        col.on('change', spy);

        col.setPluginData('wip', 5);
        expect(col.pluginData['wip']).toBe(5);
        expect(spy).toHaveBeenCalledOnce();
    });
});

// ---------------------------------------------------------------
// addCard
// ---------------------------------------------------------------

describe('Column — addCard', () => {
    it('ajoute en fin par défaut', () => {
        const col = makeColumn({ cards: [makeCard('a')] });
        col.addCard(makeCard('b'));
        expect(col.cards.map((c) => c.id)).toEqual(['a', 'b']);
    });

    it("ajoute à l'index spécifié", () => {
        const col = makeColumn({ cards: [makeCard('a'), makeCard('c')] });
        col.addCard(makeCard('b'), 1);
        expect(col.cards.map((c) => c.id)).toEqual(['a', 'b', 'c']);
    });

    it("ajoute à l'index 0", () => {
        const col = makeColumn({ cards: [makeCard('a')] });
        col.addCard(makeCard('b'), 0);
        expect(col.cards.map((c) => c.id)).toEqual(['b', 'a']);
    });

    it('émet change', () => {
        const col = makeColumn();
        const spy = vi.fn();
        col.on('change', spy);
        col.addCard(makeCard());
        expect(spy).toHaveBeenCalledOnce();
    });
});

// ---------------------------------------------------------------
// removeCard
// ---------------------------------------------------------------

describe('Column — removeCard', () => {
    it('retire et retourne la carte', () => {
        const card = makeCard('card-1');
        const col = makeColumn({ cards: [card] });
        const removed = col.removeCard('card-1');
        expect(removed).toBe(card);
        expect(col.count).toBe(0);
    });

    it("retourne undefined si la carte n'existe pas", () => {
        const col = makeColumn({ cards: [makeCard()] });
        expect(col.removeCard('nope')).toBeUndefined();
    });

    it('émet change', () => {
        const col = makeColumn({ cards: [makeCard()] });
        const spy = vi.fn();
        col.on('change', spy);
        col.removeCard('card-1');
        expect(spy).toHaveBeenCalledOnce();
    });
});

// ---------------------------------------------------------------
// moveCard (réordonnancement interne)
// ---------------------------------------------------------------

describe('Column — moveCard', () => {
    it('déplace une carte de la position 0 vers 2', () => {
        const col = makeColumn({
            cards: [makeCard('a'), makeCard('b'), makeCard('c')],
        });
        col.moveCard(0, 2);
        expect(col.cards.map((c) => c.id)).toEqual(['b', 'c', 'a']);
    });

    it("enregistre un reorder dans l'historique de la carte", () => {
        const col = makeColumn({
            cards: [makeCard('a'), makeCard('b')],
        });
        col.moveCard(0, 1);
        const card = col.getCardById('a');
        const last = card.history[card.history.length - 1];
        expect(last.action).toBe('reordered');
    });

    it('émet change', () => {
        const col = makeColumn({ cards: [makeCard('a'), makeCard('b')] });
        const spy = vi.fn();
        col.on('change', spy);
        col.moveCard(0, 1);
        expect(spy).toHaveBeenCalledOnce();
    });
});

// ---------------------------------------------------------------
// replaceCards
// ---------------------------------------------------------------

describe('Column — replaceCards', () => {
    it('remplace toutes les cartes', () => {
        const col = makeColumn({ cards: [makeCard('a')] });
        col.replaceCards([makeCard('x'), makeCard('y')]);
        expect(col.cards.map((c) => c.id)).toEqual(['x', 'y']);
    });

    it('émet change une seule fois', () => {
        const col = makeColumn({ cards: [makeCard('a')] });
        const spy = vi.fn();
        col.on('change', spy);
        col.replaceCards([makeCard('x')]);
        expect(spy).toHaveBeenCalledOnce();
    });
});

// ---------------------------------------------------------------
// updateTitle
// ---------------------------------------------------------------

describe('Column — updateTitle', () => {
    it('met à jour le titre', () => {
        const col = makeColumn();
        col.updateTitle('Done');
        expect(col.title).toBe('Done');
    });

    it('émet change', () => {
        const col = makeColumn();
        const spy = vi.fn();
        col.on('change', spy);
        col.updateTitle('Done');
        expect(spy).toHaveBeenCalledOnce();
    });
});

// ---------------------------------------------------------------
// toJSON
// ---------------------------------------------------------------

describe('Column — toJSON', () => {
    it('sérialise correctement', () => {
        const col = makeColumn({ cards: [makeCard('a')], pluginData: { wip: 3 } });
        const json = col.toJSON();

        expect(json.id).toBe('col-1');
        expect(json.title).toBe('Todo');
        expect(json.cards).toHaveLength(1);
        expect(json.cards[0].id).toBe('a');
        expect(json.pluginData).toEqual({ wip: 3 });
    });
});
