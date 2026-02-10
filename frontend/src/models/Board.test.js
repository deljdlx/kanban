/**
 * Tests unitaires — Board (modèle du plateau Kanban).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Board from './Board.js';
import Column from './Column.js';
import Card from './Card.js';

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function makeCard(id = 'card-1', title = 'Task') {
    return new Card({ id, title, description: '', tags: {} });
}

function makeColumn(id = 'col-1', title = 'Todo', cards = []) {
    return new Column({ id, title, cards });
}

function makeBoard(columns = [], overrides = {}) {
    return new Board(columns, { name: 'Test Board', ...overrides });
}

// ---------------------------------------------------------------
// Construction
// ---------------------------------------------------------------

describe('Board — construction', () => {
    it('stocke le nom et les colonnes', () => {
        const board = makeBoard([makeColumn('c1', 'A'), makeColumn('c2', 'B')]);
        expect(board.name).toBe('Test Board');
        expect(board.columns).toHaveLength(2);
    });

    it('utilise des valeurs par défaut', () => {
        const board = new Board([]);
        expect(board.name).toBe('Kanban');
        expect(board.description).toBe('');
        expect(board.coverImage).toBeNull();
        expect(board.backgroundImage).toBeNull();
        expect(board.pluginData).toEqual({});
    });
});

// ---------------------------------------------------------------
// Propriétés scalaires
// ---------------------------------------------------------------

describe('Board — propriétés', () => {
    it('name setter émet change', () => {
        const board = makeBoard();
        const spy = vi.fn();
        board.on('change', spy);
        board.name = 'New Name';
        expect(board.name).toBe('New Name');
        expect(spy).toHaveBeenCalledOnce();
    });

    it("name setter n'émet pas change si valeur identique", () => {
        const board = makeBoard();
        const spy = vi.fn();
        board.on('change', spy);
        board.name = 'Test Board';
        expect(spy).not.toHaveBeenCalled();
    });

    it('description setter émet change', () => {
        const board = makeBoard();
        const spy = vi.fn();
        board.on('change', spy);
        board.description = 'Desc';
        expect(board.description).toBe('Desc');
        expect(spy).toHaveBeenCalledOnce();
    });

    it('coverImage setter émet change', () => {
        const board = makeBoard();
        const spy = vi.fn();
        board.on('change', spy);
        board.coverImage = { id: 'img-1' };
        expect(board.coverImage).toEqual({ id: 'img-1' });
        expect(board.coverImageId).toBe('img-1');
        expect(spy).toHaveBeenCalledOnce();
    });

    it("coverImage setter n'émet pas change si identique", () => {
        const board = makeBoard([], { coverImage: { id: 'img-1' } });
        const spy = vi.fn();
        board.on('change', spy);
        board.coverImage = { id: 'img-1' };
        expect(spy).not.toHaveBeenCalled();
    });

    it('backgroundImage setter gère les objets et strings', () => {
        const board = makeBoard();
        board.backgroundImage = { id: 'bg-1' };
        expect(board.backgroundImageId).toBe('bg-1');
        expect(board.hasLegacyBackgroundImage).toBe(false);

        board.backgroundImage = 'data:image/png;base64,abc';
        expect(board.backgroundImageId).toBeNull();
        expect(board.hasLegacyBackgroundImage).toBe(true);
    });
});

// ---------------------------------------------------------------
// pluginData
// ---------------------------------------------------------------

describe('Board — pluginData', () => {
    it('pluginData retourne une copie shallow', () => {
        const board = makeBoard([], { pluginData: { colors: { a: 'red' } } });
        const pd = board.pluginData;
        pd['extra'] = true;
        expect(board.pluginData).not.toHaveProperty('extra');
    });

    it('pluginData lectures accèdent aux valeurs imbriquées', () => {
        const board = makeBoard([], { pluginData: { colors: { a: 'red' } } });
        // La copie shallow donne accès aux valeurs imbriquées par référence
        expect(board.pluginData.colors.a).toBe('red');
    });

    it('pluginDataRef retourne la référence directe', () => {
        const board = makeBoard();
        board.pluginDataRef['key'] = 'value';
        expect(board.pluginDataRef['key']).toBe('value');
    });

    it('setPluginData stocke et émet change', () => {
        const board = makeBoard();
        const spy = vi.fn();
        board.on('change', spy);
        board.setPluginData('test', 42);
        expect(board.pluginData['test']).toBe(42);
        expect(spy).toHaveBeenCalledOnce();
    });
});

// ---------------------------------------------------------------
// Colonnes — CRUD
// ---------------------------------------------------------------

describe('Board — colonnes', () => {
    it('columns retourne une copie', () => {
        const board = makeBoard([makeColumn()]);
        const cols = board.columns;
        cols.push(makeColumn('c2'));
        expect(board.columns).toHaveLength(1);
    });

    it('getColumnById retourne la colonne ou undefined', () => {
        const col = makeColumn('c1', 'Todo');
        const board = makeBoard([col]);
        expect(board.getColumnById('c1')).toBe(col);
        expect(board.getColumnById('nope')).toBeUndefined();
    });

    it('getColumnByTitle retourne la colonne', () => {
        const col = makeColumn('c1', 'Todo');
        const board = makeBoard([col]);
        expect(board.getColumnByTitle('Todo')).toBe(col);
    });

    it('addColumn ajoute et émet change', () => {
        const board = makeBoard();
        const spy = vi.fn();
        board.on('change', spy);
        board.addColumn(makeColumn('c1'));
        expect(board.columns).toHaveLength(1);
        expect(spy).toHaveBeenCalledOnce();
    });

    it('addColumn souscrit au change de la colonne', () => {
        const board = makeBoard();
        const spy = vi.fn();
        board.on('change', spy);

        const col = makeColumn('c1');
        board.addColumn(col);
        spy.mockClear();

        // Une mutation sur la colonne doit bubble vers le board
        col.addCard(makeCard());
        expect(spy).toHaveBeenCalledOnce();
    });

    it('removeColumn supprime et désouscrit', () => {
        const col = makeColumn('c1');
        const board = makeBoard([col]);
        const spy = vi.fn();
        board.on('change', spy);

        board.removeColumn('c1');
        expect(board.columns).toHaveLength(0);
        expect(spy).toHaveBeenCalledOnce();

        spy.mockClear();
        // La colonne supprimée ne doit plus faire bubble
        col.addCard(makeCard());
        expect(spy).not.toHaveBeenCalled();
    });

    it('removeColumn ignore un id inconnu', () => {
        const board = makeBoard([makeColumn()]);
        board.removeColumn('nope');
        expect(board.columns).toHaveLength(1);
    });

    it('moveColumn réordonne', () => {
        const board = makeBoard([makeColumn('a', 'A'), makeColumn('b', 'B'), makeColumn('c', 'C')]);
        board.moveColumn(0, 2);
        expect(board.columns.map((c) => c.id)).toEqual(['b', 'c', 'a']);
    });

    it('reorderColumns réordonne selon les ids', () => {
        const board = makeBoard([makeColumn('a'), makeColumn('b'), makeColumn('c')]);
        board.reorderColumns(['c', 'a', 'b']);
        expect(board.columns.map((c) => c.id)).toEqual(['c', 'a', 'b']);
    });

    it('reorderColumns ignore si un id est inconnu', () => {
        const board = makeBoard([makeColumn('a'), makeColumn('b')]);
        board.reorderColumns(['a', 'x']);
        // Taille ne correspond pas → ignoré
        expect(board.columns.map((c) => c.id)).toEqual(['a', 'b']);
    });

    it('reorderColumns ignore si la longueur ne correspond pas', () => {
        const board = makeBoard([makeColumn('a'), makeColumn('b')]);
        board.reorderColumns(['a']);
        expect(board.columns.map((c) => c.id)).toEqual(['a', 'b']);
    });
});

// ---------------------------------------------------------------
// Cartes — recherche et transfert
// ---------------------------------------------------------------

describe('Board — cartes', () => {
    it('getCardById retourne la carte et sa colonne', () => {
        const card = makeCard('k1');
        const col = makeColumn('c1', 'Todo', [card]);
        const board = makeBoard([col]);

        const result = board.getCardById('k1');
        expect(result.card).toBe(card);
        expect(result.column).toBe(col);
    });

    it('getCardById retourne null si introuvable', () => {
        const board = makeBoard([makeColumn('c1')]);
        expect(board.getCardById('nope')).toBeNull();
    });

    it('moveCard transfère entre colonnes', () => {
        const card = makeCard('k1');
        const from = makeColumn('c1', 'Todo', [card]);
        const to = makeColumn('c2', 'Done');
        const board = makeBoard([from, to]);

        board.moveCard('k1', 'c1', 'c2', 0);

        expect(from.count).toBe(0);
        expect(to.count).toBe(1);
        expect(to.getCardById('k1')).toBe(card);
    });

    it("moveCard enregistre un move dans l'historique", () => {
        const card = makeCard('k1');
        const from = makeColumn('c1', 'Todo', [card]);
        const to = makeColumn('c2', 'Done');
        const board = makeBoard([from, to]);

        board.moveCard('k1', 'c1', 'c2', 0, 'user-1');

        const last = card.history[card.history.length - 1];
        expect(last.action).toBe('moved');
        expect(last.changes.column).toEqual({ from: 'Todo', to: 'Done' });
    });

    it('moveCard dans la même colonne ne record pas de move', () => {
        const card = makeCard('k1');
        const col = makeColumn('c1', 'Todo', [card, makeCard('k2')]);
        const board = makeBoard([col]);
        const histLen = card.history.length;

        board.moveCard('k1', 'c1', 'c1', 1);

        // Pas d'entrée "moved" ajoutée (même colonne)
        expect(card.history.length).toBe(histLen);
    });

    it('moveCard avec colonnes invalides ne crash pas', () => {
        const board = makeBoard([makeColumn('c1', 'Todo', [makeCard('k1')])]);
        // Colonne cible inexistante → return silencieux (guard null)
        board.moveCard('k1', 'c1', 'nope', 0);
        expect(board.getColumnById('c1').count).toBe(1); // Carte toujours là
    });

    it('moveCard avec colonne source invalide ne crash pas', () => {
        const board = makeBoard([makeColumn('c1')]);
        board.moveCard('k1', 'nope', 'c1', 0);
        // Pas de crash
    });
});

// ---------------------------------------------------------------
// Itérateurs
// ---------------------------------------------------------------

describe('Board — itérateurs', () => {
    it('allCards itère toutes les cartes', () => {
        const board = makeBoard([
            makeColumn('c1', 'A', [makeCard('a1'), makeCard('a2')]),
            makeColumn('c2', 'B', [makeCard('b1')]),
        ]);
        const ids = [...board.allCards()].map((c) => c.id);
        expect(ids).toEqual(['a1', 'a2', 'b1']);
    });

    it('entries retourne des paires { card, column }', () => {
        const col = makeColumn('c1', 'A', [makeCard('k1')]);
        const board = makeBoard([col]);
        const entries = [...board.entries()];

        expect(entries).toHaveLength(1);
        expect(entries[0].card.id).toBe('k1');
        expect(entries[0].column.id).toBe('c1');
    });

    it('findCards filtre les cartes', () => {
        const board = makeBoard([makeColumn('c1', 'A', [makeCard('a1', 'Bug'), makeCard('a2', 'Feature')])]);
        const results = board.findCards((c) => c.title === 'Bug');
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('a1');
    });

    it('findColumns filtre les colonnes', () => {
        const board = makeBoard([makeColumn('c1', 'Todo'), makeColumn('c2', 'Done')]);
        const results = board.findColumns((c) => c.title === 'Done');
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('c2');
    });
});

// ---------------------------------------------------------------
// Event bubbling
// ---------------------------------------------------------------

describe('Board — event bubbling', () => {
    it('une mutation de colonne émet change sur le board', () => {
        const col = makeColumn('c1', 'A');
        const board = makeBoard([col]);
        const spy = vi.fn();
        board.on('change', spy);

        col.addCard(makeCard());
        expect(spy).toHaveBeenCalledOnce();
    });

    it('plusieurs colonnes peuvent toutes bubble', () => {
        const c1 = makeColumn('c1', 'A');
        const c2 = makeColumn('c2', 'B');
        const board = makeBoard([c1, c2]);
        const spy = vi.fn();
        board.on('change', spy);

        c1.updateTitle('X');
        c2.updateTitle('Y');
        expect(spy).toHaveBeenCalledTimes(2);
    });
});

// ---------------------------------------------------------------
// toJSON
// ---------------------------------------------------------------

describe('Board — toJSON', () => {
    it('sérialise le board complet', () => {
        const board = makeBoard([makeColumn('c1', 'Todo', [makeCard('k1')])], {
            description: 'Desc',
            coverImage: { id: 'img-1' },
            pluginData: { test: true },
        });
        const json = board.toJSON();

        expect(json.name).toBe('Test Board');
        expect(json.description).toBe('Desc');
        expect(json.coverImage).toEqual({ id: 'img-1' });
        expect(json.pluginData).toEqual({ test: true });
        expect(json.columns).toHaveLength(1);
        expect(json.columns[0].id).toBe('c1');
        expect(json.columns[0].cards).toHaveLength(1);
    });
});
