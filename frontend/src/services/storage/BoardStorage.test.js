/**
 * Tests unitaires — BoardStorage (CRUD multi-board via IndexedDB).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeDB } from './__tests__/fakeDB.js';

// ---------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------

let fakeDB, stores;

vi.mock('./Database.js', () => ({
    getDB: () => Promise.resolve(fakeDB),
    STORES: { META: 'meta', BOARDS: 'boards', IMAGES: 'images' },
    META_KEYS: { REGISTRY: 'board-registry', SETTINGS: 'global-settings' },
}));

let idCounter;
vi.mock('../../utils/id.js', () => ({
    generateId: (prefix) => `${prefix}-${++idCounter}`,
}));

// Import après les mocks pour que vi.mock soit appliqué
const { default: BoardStorage } = await import('./BoardStorage.js');

// ---------------------------------------------------------------
// Setup
// ---------------------------------------------------------------

beforeEach(() => {
    const created = createFakeDB();
    fakeDB = created.fakeDB;
    stores = created.stores;
    idCounter = 0;
});

// ---------------------------------------------------------------
// getRegistry
// ---------------------------------------------------------------

describe('BoardStorage — getRegistry', () => {
    it('retourne un registre vide si aucun enregistrement existe', async () => {
        const registry = await BoardStorage.getRegistry();

        expect(registry.version).toBe(1);
        expect(registry.activeBoard).toBeNull();
        expect(registry.boards).toEqual([]);
    });

    it('retourne le registre existant depuis la DB', async () => {
        const existing = { version: 1, activeBoard: 'b-1', boards: [{ id: 'b-1', name: 'Test' }] };
        stores.meta.set('board-registry', { key: 'board-registry', value: existing });

        const registry = await BoardStorage.getRegistry();

        expect(registry.activeBoard).toBe('b-1');
        expect(registry.boards).toHaveLength(1);
    });
});

// ---------------------------------------------------------------
// saveRegistry
// ---------------------------------------------------------------

describe('BoardStorage — saveRegistry', () => {
    it('sauvegarde le registre dans le store meta', async () => {
        const registry = { version: 1, activeBoard: null, boards: [] };
        await BoardStorage.saveRegistry(registry);

        const stored = stores.meta.get('board-registry');
        expect(stored).toBeDefined();
        expect(stored.value.boards).toEqual([]);
    });

    it('force la version du registre', async () => {
        const registry = { version: 99, activeBoard: null, boards: [] };
        await BoardStorage.saveRegistry(registry);

        expect(registry.version).toBe(1);
    });
});

// ---------------------------------------------------------------
// createBoard
// ---------------------------------------------------------------

describe('BoardStorage — createBoard', () => {
    it('crée un board avec le nom par défaut', async () => {
        await BoardStorage.createBoard();

        const board = stores.boards.get('board-1');
        expect(board.name).toBe('Nouveau Board');
    });

    it('crée un board avec un nom personnalisé', async () => {
        await BoardStorage.createBoard('Mon Projet');

        const board = stores.boards.get('board-1');
        expect(board.name).toBe('Mon Projet');
    });

    it("retourne l'ID du board créé", async () => {
        const id = await BoardStorage.createBoard();
        expect(id).toBe('board-1');
    });

    it('ajoute le board au registre', async () => {
        await BoardStorage.createBoard('Test');

        const registry = await BoardStorage.getRegistry();
        expect(registry.boards).toHaveLength(1);
        expect(registry.boards[0].name).toBe('Test');
    });

    it('définit le board créé comme activeBoard', async () => {
        await BoardStorage.createBoard();

        const registry = await BoardStorage.getRegistry();
        expect(registry.activeBoard).toBe('board-1');
    });

    it('les données ont la structure attendue (columns=[], pluginData={})', async () => {
        await BoardStorage.createBoard();

        const board = stores.boards.get('board-1');
        expect(board.columns).toEqual([]);
        expect(board.pluginData).toEqual({});
        expect(board.coverImage).toBeNull();
        expect(board.backgroundImage).toBeNull();
        expect(board.description).toBe('');
    });
});

// ---------------------------------------------------------------
// loadBoard
// ---------------------------------------------------------------

describe('BoardStorage — loadBoard', () => {
    it('charge un board existant par son ID', async () => {
        stores.boards.set('b-1', { id: 'b-1', name: 'Hello', columns: [] });

        const board = await BoardStorage.loadBoard('b-1');
        expect(board.name).toBe('Hello');
    });

    it('retourne null pour un boardId inexistant', async () => {
        const board = await BoardStorage.loadBoard('nope');
        expect(board).toBeNull();
    });

    it("retourne null pour un boardId falsy (null, undefined, '')", async () => {
        expect(await BoardStorage.loadBoard(null)).toBeNull();
        expect(await BoardStorage.loadBoard(undefined)).toBeNull();
        expect(await BoardStorage.loadBoard('')).toBeNull();
    });
});

// ---------------------------------------------------------------
// saveBoard
// ---------------------------------------------------------------

describe('BoardStorage — saveBoard', () => {
    it('sauvegarde les données dans le store boards', async () => {
        const data = { id: 'b-1', name: 'Test', columns: [], pluginData: {} };
        await BoardStorage.saveBoard('b-1', data);

        expect(stores.boards.has('b-1')).toBe(true);
    });

    it("force la version et l'ID dans les données", async () => {
        const data = { id: 'wrong', version: 99, name: 'Test', columns: [] };
        await BoardStorage.saveBoard('b-1', data);

        expect(data.version).toBe(1);
        expect(data.id).toBe('b-1');
    });

    it('met à jour les métadonnées dans le registre (cardCount, columnCount, coverImageId)', async () => {
        // Prépare un registre avec un board
        const registry = {
            version: 1,
            activeBoard: 'b-1',
            boards: [{ id: 'b-1', name: 'Old', cardCount: 0, columnCount: 0 }],
        };
        stores.meta.set('board-registry', { key: 'board-registry', value: registry });

        const data = {
            id: 'b-1',
            name: 'Updated',
            description: 'desc',
            coverImage: { id: 'img-42' },
            columns: [
                { id: 'c1', cards: [{ id: 'k1' }, { id: 'k2' }] },
                { id: 'c2', cards: [{ id: 'k3' }] },
            ],
        };
        await BoardStorage.saveBoard('b-1', data);

        const updated = await BoardStorage.getRegistry();
        const meta = updated.boards.find((b) => b.id === 'b-1');
        expect(meta.name).toBe('Updated');
        expect(meta.cardCount).toBe(3);
        expect(meta.columnCount).toBe(2);
        expect(meta.coverImageId).toBe('img-42');
    });
});

// ---------------------------------------------------------------
// deleteBoard
// ---------------------------------------------------------------

describe('BoardStorage — deleteBoard', () => {
    beforeEach(async () => {
        // Crée 2 boards dans le registre et les stores
        const registry = {
            version: 1,
            activeBoard: 'b-1',
            boards: [
                { id: 'b-1', name: 'Board 1' },
                { id: 'b-2', name: 'Board 2' },
            ],
        };
        stores.meta.set('board-registry', { key: 'board-registry', value: registry });
        stores.boards.set('b-1', { id: 'b-1', name: 'Board 1', columns: [] });
        stores.boards.set('b-2', { id: 'b-2', name: 'Board 2', columns: [] });
    });

    it('supprime le board du registre et du store', async () => {
        await BoardStorage.deleteBoard('b-1');

        expect(stores.boards.has('b-1')).toBe(false);
        const registry = await BoardStorage.getRegistry();
        expect(registry.boards.find((b) => b.id === 'b-1')).toBeUndefined();
    });

    it("retourne false si le board n'existe pas dans le registre", async () => {
        const result = await BoardStorage.deleteBoard('nope');
        expect(result).toBe(false);
    });

    it('met à jour activeBoard vers le premier board restant', async () => {
        await BoardStorage.deleteBoard('b-1');

        const registry = await BoardStorage.getRegistry();
        expect(registry.activeBoard).toBe('b-2');
    });

    it('met activeBoard à null si aucun board ne reste', async () => {
        await BoardStorage.deleteBoard('b-1');
        await BoardStorage.deleteBoard('b-2');

        const registry = await BoardStorage.getRegistry();
        expect(registry.activeBoard).toBeNull();
    });

    it('supprime les images associées au board (cursor)', async () => {
        stores.images.set('img-1', { id: 'img-1', boardId: 'b-1' });
        stores.images.set('img-2', { id: 'img-2', boardId: 'b-1' });
        stores.images.set('img-3', { id: 'img-3', boardId: 'b-2' });

        await BoardStorage.deleteBoard('b-1');

        expect(stores.images.has('img-1')).toBe(false);
        expect(stores.images.has('img-2')).toBe(false);
        expect(stores.images.has('img-3')).toBe(true);
    });
});

// ---------------------------------------------------------------
// duplicateBoard
// ---------------------------------------------------------------

describe('BoardStorage — duplicateBoard', () => {
    beforeEach(() => {
        const registry = {
            version: 1,
            activeBoard: 'b-1',
            boards: [{ id: 'b-1', name: 'Original' }],
        };
        stores.meta.set('board-registry', { key: 'board-registry', value: registry });
        stores.boards.set('b-1', {
            id: 'b-1',
            name: 'Original',
            description: '',
            coverImage: null,
            backgroundImage: null,
            columns: [
                {
                    id: 'col-old',
                    title: 'Todo',
                    cards: [{ id: 'card-old', title: 'Task', image: { id: 'img-1' } }],
                },
            ],
            pluginData: {},
        });
    });

    it('crée une copie avec un nouvel ID', async () => {
        const newId = await BoardStorage.duplicateBoard('b-1');
        expect(newId).toBe('board-1');
        expect(stores.boards.has('board-1')).toBe(true);
    });

    it('utilise le nom "(copie)" par défaut', async () => {
        await BoardStorage.duplicateBoard('b-1');
        const copy = stores.boards.get('board-1');
        expect(copy.name).toBe('Original (copie)');
    });

    it("retourne null si le board source n'existe pas", async () => {
        const result = await BoardStorage.duplicateBoard('nope');
        expect(result).toBeNull();
    });

    it('régénère les IDs des colonnes et cartes', async () => {
        await BoardStorage.duplicateBoard('b-1');
        const copy = stores.boards.get('board-1');

        expect(copy.columns[0].id).not.toBe('col-old');
        expect(copy.columns[0].cards[0].id).not.toBe('card-old');
    });

    it('met les images des cartes à null', async () => {
        await BoardStorage.duplicateBoard('b-1');
        const copy = stores.boards.get('board-1');

        expect(copy.columns[0].cards[0].image).toBeNull();
    });
});

// ---------------------------------------------------------------
// renameBoard
// ---------------------------------------------------------------

describe('BoardStorage — renameBoard', () => {
    beforeEach(() => {
        stores.boards.set('b-1', { id: 'b-1', name: 'Old', columns: [] });
        const registry = {
            version: 1,
            activeBoard: 'b-1',
            boards: [{ id: 'b-1', name: 'Old', cardCount: 0, columnCount: 0 }],
        };
        stores.meta.set('board-registry', { key: 'board-registry', value: registry });
    });

    it('renomme le board et met à jour la DB', async () => {
        const result = await BoardStorage.renameBoard('b-1', 'New Name');

        expect(result).toBe(true);
        const board = stores.boards.get('b-1');
        expect(board.name).toBe('New Name');
    });

    it("retourne false si le board n'existe pas", async () => {
        const result = await BoardStorage.renameBoard('nope', 'Name');
        expect(result).toBe(false);
    });
});

// ---------------------------------------------------------------
// setActiveBoard
// ---------------------------------------------------------------

describe('BoardStorage — setActiveBoard', () => {
    beforeEach(() => {
        const registry = {
            version: 1,
            activeBoard: 'b-1',
            boards: [
                { id: 'b-1', name: 'A' },
                { id: 'b-2', name: 'B' },
            ],
        };
        stores.meta.set('board-registry', { key: 'board-registry', value: registry });
    });

    it('définit le board actif dans le registre', async () => {
        const result = await BoardStorage.setActiveBoard('b-2');

        expect(result).toBe(true);
        const registry = await BoardStorage.getRegistry();
        expect(registry.activeBoard).toBe('b-2');
    });

    it("retourne false si le board n'existe pas", async () => {
        const result = await BoardStorage.setActiveBoard('nope');
        expect(result).toBe(false);
    });
});

// ---------------------------------------------------------------
// Settings
// ---------------------------------------------------------------

describe('BoardStorage — settings', () => {
    it("getSetting retourne la valeur par défaut si la clé n'existe pas", async () => {
        const value = await BoardStorage.getSetting('theme', 'light');
        expect(value).toBe('light');
    });

    it('setSetting stocke avec le préfixe setting:', async () => {
        await BoardStorage.setSetting('theme', 'dark');

        const record = stores.meta.get('setting:theme');
        expect(record.value).toBe('dark');
    });

    it('deleteSetting supprime la clé', async () => {
        await BoardStorage.setSetting('theme', 'dark');
        await BoardStorage.deleteSetting('theme');

        expect(stores.meta.has('setting:theme')).toBe(false);
    });
});

// ---------------------------------------------------------------
// _countCards
// ---------------------------------------------------------------

describe('BoardStorage — _countCards', () => {
    it('retourne 0 pour un board sans colonnes', () => {
        expect(BoardStorage._countCards({ columns: [] })).toBe(0);
        expect(BoardStorage._countCards({})).toBe(0);
    });

    it('compte toutes les cartes de toutes les colonnes', () => {
        const data = {
            columns: [{ cards: [{ id: '1' }, { id: '2' }] }, { cards: [{ id: '3' }] }, { cards: [] }],
        };
        expect(BoardStorage._countCards(data)).toBe(3);
    });
});
