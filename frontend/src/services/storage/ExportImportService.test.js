/**
 * Tests unitaires — ExportImportService (export/import des données Kanban).
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

vi.mock('./BoardStorage.js', async () => {
    // Import réel pour déléguer (utilise déjà le fakeDB mocké)
    const actual = await import('./BoardStorage.js');
    return { default: actual.default };
});

vi.mock('./IndexedDBImageStorage.js', async () => {
    const actual = await import('./IndexedDBImageStorage.js');
    return { default: actual.default };
});

let idCounter;
vi.mock('../../utils/id.js', () => ({
    generateId: (prefix) => `${prefix}-${++idCounter}`,
}));

// Shims URL
globalThis.URL.createObjectURL = globalThis.URL.createObjectURL || vi.fn(() => 'blob://fake');
globalThis.URL.revokeObjectURL = globalThis.URL.revokeObjectURL || vi.fn();

const { default: ExportImportService } = await import('./ExportImportService.js');
const { default: boardStorage } = await import('./BoardStorage.js');
const { default: imageStorage } = await import('./IndexedDBImageStorage.js');

// ---------------------------------------------------------------
// Setup
// ---------------------------------------------------------------

beforeEach(() => {
    const created = createFakeDB();
    fakeDB = created.fakeDB;
    stores = created.stores;
    idCounter = 0;
    imageStorage._urlCache.clear();
});

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function validBoard(overrides = {}) {
    return {
        id: 'b-1',
        name: 'Test',
        version: 1,
        description: '',
        coverImage: null,
        backgroundImage: null,
        columns: [
            {
                id: 'col-1',
                title: 'Todo',
                cards: [{ id: 'card-1', title: 'Task 1' }],
            },
        ],
        pluginData: {},
        ...overrides,
    };
}

// ---------------------------------------------------------------
// _validateBoardStructure
// ---------------------------------------------------------------

describe('ExportImportService — _validateBoardStructure', () => {
    it('valide un board minimal', () => {
        const result = ExportImportService._validateBoardStructure(validBoard());
        expect(result.valid).toBe(true);
    });

    it('rejette null / non-objet', () => {
        expect(ExportImportService._validateBoardStructure(null).valid).toBe(false);
        expect(ExportImportService._validateBoardStructure('string').valid).toBe(false);
        expect(ExportImportService._validateBoardStructure(42).valid).toBe(false);
    });

    it('rejette un board sans id / id non-string', () => {
        expect(ExportImportService._validateBoardStructure({ columns: [] }).valid).toBe(false);
        expect(ExportImportService._validateBoardStructure({ id: 123, columns: [] }).valid).toBe(false);
    });

    it('rejette sans columns / columns non-tableau', () => {
        expect(ExportImportService._validateBoardStructure({ id: 'b-1' }).valid).toBe(false);
        expect(ExportImportService._validateBoardStructure({ id: 'b-1', columns: 'nope' }).valid).toBe(false);
    });

    it('rejette une colonne sans id / sans title / sans cards', () => {
        const noId = validBoard({ columns: [{ title: 'A', cards: [] }] });
        expect(ExportImportService._validateBoardStructure(noId).valid).toBe(false);

        const noTitle = validBoard({ columns: [{ id: 'c1', cards: [] }] });
        expect(ExportImportService._validateBoardStructure(noTitle).valid).toBe(false);

        const noCards = validBoard({ columns: [{ id: 'c1', title: 'A' }] });
        expect(ExportImportService._validateBoardStructure(noCards).valid).toBe(false);
    });

    it('rejette une carte sans id / sans title', () => {
        const noId = validBoard({
            columns: [{ id: 'c1', title: 'A', cards: [{ title: 'T' }] }],
        });
        expect(ExportImportService._validateBoardStructure(noId).valid).toBe(false);

        const noTitle = validBoard({
            columns: [{ id: 'c1', title: 'A', cards: [{ id: 'k1' }] }],
        });
        expect(ExportImportService._validateBoardStructure(noTitle).valid).toBe(false);
    });

    it("le message indique l'index fautif", () => {
        const bad = validBoard({
            columns: [
                { id: 'c1', title: 'OK', cards: [] },
                { id: 'c2', title: 'Bad', cards: [{ id: 'k1', title: 'T' }, { title: 'Nope' }] },
            ],
        });
        const result = ExportImportService._validateBoardStructure(bad);
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('columns[1]');
        expect(result.reason).toContain('cards[1]');
    });
});

// ---------------------------------------------------------------
// _remapImageReferences
// ---------------------------------------------------------------

describe('ExportImportService — _remapImageReferences', () => {
    const map = new Map([
        ['old-cover', 'new-cover'],
        ['old-bg', 'new-bg'],
        ['old-card-img', 'new-card-img'],
        ['old-data-img', 'new-data-img'],
        ['old-file', 'new-file'],
        ['old-comment-file', 'new-comment-file'],
    ]);

    it('remappe coverImage.id, backgroundImage.id', () => {
        const data = validBoard({
            coverImage: { id: 'old-cover' },
            backgroundImage: { id: 'old-bg' },
            columns: [],
        });
        const result = ExportImportService._remapImageReferences(data, map);
        expect(result.coverImage.id).toBe('new-cover');
        expect(result.backgroundImage.id).toBe('new-bg');
    });

    it('remappe card.image.id, card.data.imageId', () => {
        const data = validBoard({
            columns: [
                {
                    id: 'c1',
                    title: 'A',
                    cards: [
                        {
                            id: 'k1',
                            title: 'T',
                            image: { id: 'old-card-img' },
                            data: { imageId: 'old-data-img' },
                        },
                    ],
                },
            ],
        });
        const result = ExportImportService._remapImageReferences(data, map);
        expect(result.columns[0].cards[0].image.id).toBe('new-card-img');
        expect(result.columns[0].cards[0].data.imageId).toBe('new-data-img');
    });

    it('remappe fichiers joints (card.data.files[].id)', () => {
        const data = validBoard({
            columns: [
                {
                    id: 'c1',
                    title: 'A',
                    cards: [
                        {
                            id: 'k1',
                            title: 'T',
                            data: { files: [{ id: 'old-file', name: 'doc.pdf' }] },
                        },
                    ],
                },
            ],
        });
        const result = ExportImportService._remapImageReferences(data, map);
        expect(result.columns[0].cards[0].data.files[0].id).toBe('new-file');
    });

    it('remappe images markdown dans description et summary', () => {
        const imgMap = new Map([['img-old', 'img-new']]);
        const data = validBoard({
            columns: [
                {
                    id: 'c1',
                    title: 'A',
                    cards: [
                        {
                            id: 'k1',
                            title: 'T',
                            description: 'text ![photo](img:img-old) end',
                            summary: '![thumb](img:img-old)',
                        },
                    ],
                },
            ],
        });
        const result = ExportImportService._remapImageReferences(data, imgMap);
        expect(result.columns[0].cards[0].description).toContain('img:img-new');
        expect(result.columns[0].cards[0].summary).toContain('img:img-new');
    });

    it('remappe images markdown dans les commentaires', () => {
        const imgMap = new Map([['img-old', 'img-new']]);
        const data = validBoard({
            columns: [
                {
                    id: 'c1',
                    title: 'A',
                    cards: [
                        {
                            id: 'k1',
                            title: 'T',
                            comments: [{ text: 'see ![](img:img-old)' }],
                        },
                    ],
                },
            ],
        });
        const result = ExportImportService._remapImageReferences(data, imgMap);
        expect(result.columns[0].cards[0].comments[0].text).toContain('img:img-new');
    });

    it('remappe fichiers joints aux commentaires', () => {
        const data = validBoard({
            columns: [
                {
                    id: 'c1',
                    title: 'A',
                    cards: [
                        {
                            id: 'k1',
                            title: 'T',
                            comments: [{ text: 'hi', files: [{ id: 'old-comment-file', name: 'f.png' }] }],
                        },
                    ],
                },
            ],
        });
        const result = ExportImportService._remapImageReferences(data, map);
        expect(result.columns[0].cards[0].comments[0].files[0].id).toBe('new-comment-file');
    });

    it('ne modifie pas les IDs absents de la map', () => {
        const data = validBoard({ coverImage: { id: 'unknown' }, columns: [] });
        const result = ExportImportService._remapImageReferences(data, map);
        expect(result.coverImage.id).toBe('unknown');
    });

    it('retourne une copie profonde', () => {
        const data = validBoard();
        const result = ExportImportService._remapImageReferences(data, new Map());
        expect(result).not.toBe(data);
        expect(result.columns[0]).not.toBe(data.columns[0]);
    });
});

// ---------------------------------------------------------------
// _remapImageMarkdown
// ---------------------------------------------------------------

describe('ExportImportService — _remapImageMarkdown', () => {
    it('remplace ![alt](img:oldId) par ![alt](img:newId)', () => {
        const map = new Map([['abc', 'xyz']]);
        const result = ExportImportService._remapImageMarkdown('![photo](img:abc)', map);
        expect(result).toBe('![photo](img:xyz)');
    });

    it('gère plusieurs images dans le même texte', () => {
        const map = new Map([
            ['a', 'x'],
            ['b', 'y'],
        ]);
        const text = '![1](img:a) and ![2](img:b)';
        const result = ExportImportService._remapImageMarkdown(text, map);
        expect(result).toBe('![1](img:x) and ![2](img:y)');
    });

    it('ne modifie pas les images hors de la map', () => {
        const map = new Map([['a', 'x']]);
        const text = '![pic](img:unknown)';
        const result = ExportImportService._remapImageMarkdown(text, map);
        expect(result).toBe('![pic](img:unknown)');
    });
});

// ---------------------------------------------------------------
// exportAll
// ---------------------------------------------------------------

describe('ExportImportService — exportAll', () => {
    beforeEach(async () => {
        // Prépare un board + registre + settings + image
        const registry = {
            version: 1,
            activeBoard: 'b-1',
            boards: [{ id: 'b-1', name: 'Board 1' }],
        };
        stores.meta.set('board-registry', { key: 'board-registry', value: registry });
        stores.meta.set('setting:theme', { key: 'setting:theme', value: 'dark' });
        stores.boards.set('b-1', validBoard());
    });

    it('exporte boards, images, settings et registre', async () => {
        const result = await ExportImportService.exportAll();

        expect(result.version).toBe(1);
        expect(result.exportedAt).toBeDefined();
        expect(result.boards).toHaveLength(1);
        expect(result.settings.theme).toBe('dark');
        expect(result.registry.activeBoard).toBe('b-1');
    });

    it('exclut les images si includeImages=false', async () => {
        stores.images.set('img-1', {
            id: 'img-1',
            boardId: 'b-1',
            blob: new Blob(['data'], { type: 'image/png' }),
        });

        const result = await ExportImportService.exportAll({ includeImages: false });
        expect(result.images).toEqual([]);
    });

    it('continue même si une image échoue', async () => {
        // Image avec un blob qui va casser blobToDataUrl
        stores.images.set('img-bad', {
            id: 'img-bad',
            boardId: 'b-1',
            blob: null,
        });

        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = await ExportImportService.exportAll();

        expect(result.images).toEqual([]);
        spy.mockRestore();
    });
});

// ---------------------------------------------------------------
// importAll
// ---------------------------------------------------------------

describe('ExportImportService — importAll', () => {
    it('rejette un format avec version incorrecte', async () => {
        await expect(ExportImportService.importAll({ version: 99 })).rejects.toThrow("Format d'export non supporté");
    });

    it('rejette null', async () => {
        await expect(ExportImportService.importAll(null)).rejects.toThrow();
    });

    it('importe les boards dans le registre et le store', async () => {
        const data = {
            version: 1,
            boards: [validBoard()],
            images: [],
            settings: {},
            registry: { activeBoard: 'b-1' },
        };

        const result = await ExportImportService.importAll(data);

        expect(result.success).toBe(true);
        expect(result.stats.boardsImported).toBe(1);
        expect(stores.boards.has('b-1')).toBe(true);
    });

    it('ignore un board qui échoue à la validation', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const data = {
            version: 1,
            boards: [{ id: 123 }], // invalid: id is not a string
            images: [],
            settings: {},
        };

        const result = await ExportImportService.importAll(data);

        expect(result.stats.boardsImported).toBe(0);
        spy.mockRestore();
    });

    it('ne duplique pas un board déjà présent', async () => {
        // Board déjà dans le registre
        const registry = {
            version: 1,
            activeBoard: 'b-1',
            boards: [{ id: 'b-1', name: 'Existing' }],
        };
        stores.meta.set('board-registry', { key: 'board-registry', value: registry });

        const data = {
            version: 1,
            boards: [validBoard()],
            images: [],
            settings: {},
        };

        // merge=true pour ne pas supprimer les existants d'abord
        await ExportImportService.importAll(data, { merge: true });

        const updatedRegistry = await boardStorage.getRegistry();
        // Le board ne doit pas être en double dans le registre
        const matches = updatedRegistry.boards.filter((b) => b.id === 'b-1');
        expect(matches).toHaveLength(1);
    });

    it("retourne les statistiques d'import", async () => {
        const data = {
            version: 1,
            boards: [validBoard()],
            images: [],
            settings: { theme: 'dark', lang: 'fr' },
            registry: { activeBoard: 'b-1' },
        };

        const result = await ExportImportService.importAll(data);

        expect(result.stats.boardsImported).toBe(1);
        expect(result.stats.settingsImported).toBe(2);
        expect(result.stats.imagesImported).toBe(0);
    });
});

// ---------------------------------------------------------------
// exportBoard
// ---------------------------------------------------------------

describe('ExportImportService — exportBoard', () => {
    it('exporte un board avec ses images', async () => {
        stores.boards.set('b-1', validBoard());
        stores.images.set('img-1', {
            id: 'img-1',
            boardId: 'b-1',
            cardId: null,
            mimeType: 'image/png',
            size: 100,
            blob: new Blob(['data'], { type: 'image/png' }),
            createdAt: '2025-01-01T00:00:00.000Z',
        });

        // Stub blobToDataUrl car happy-dom FileReader ne gère pas les blobs du fakeDB
        vi.spyOn(imageStorage, 'blobToDataUrl').mockResolvedValue('data:image/png;base64,AAAA');

        const result = await ExportImportService.exportBoard('b-1');

        expect(result.version).toBe(1);
        expect(result.type).toBe('single-board');
        expect(result.board.id).toBe('b-1');
        expect(result.images).toHaveLength(1);
        expect(result.images[0].dataUrl).toBeDefined();
    });

    it("lève une erreur si le board n'existe pas", async () => {
        await expect(ExportImportService.exportBoard('nope')).rejects.toThrow('Board non trouvé');
    });
});

// ---------------------------------------------------------------
// importBoard
// ---------------------------------------------------------------

describe('ExportImportService — importBoard', () => {
    it('rejette un format avec version incorrecte', async () => {
        await expect(ExportImportService.importBoard({ version: 99, board: validBoard() })).rejects.toThrow(
            "Format d'export non supporté",
        );
    });

    it('crée un nouveau board avec un nouvel ID', async () => {
        const data = {
            version: 1,
            board: validBoard(),
            images: [],
        };

        const result = await ExportImportService.importBoard(data);

        expect(result.success).toBe(true);
        expect(result.boardId).toBe('board-1');
        expect(stores.boards.has('board-1')).toBe(true);
    });

    it('remappe les IDs des images', async () => {
        const data = {
            version: 1,
            board: validBoard({ coverImage: { id: 'old-img' } }),
            images: [
                {
                    id: 'old-img',
                    boardId: 'b-1',
                    cardId: null,
                    mimeType: 'image/png',
                    size: 10,
                    dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
                    createdAt: '2025-01-01T00:00:00.000Z',
                },
            ],
        };

        const result = await ExportImportService.importBoard(data);
        const board = stores.boards.get(result.boardId);

        // generateId('board') → board-1, generateId('img') → img-2
        expect(stores.images.has('old-img')).toBe(false);
        expect(board.coverImage.id).toBe('img-2');
    });

    it('utilise le nom personnalisé si fourni', async () => {
        const data = {
            version: 1,
            board: validBoard(),
            images: [],
        };

        await ExportImportService.importBoard(data, { newName: 'Custom Name' });
        const board = stores.boards.get('board-1');
        expect(board.name).toBe('Custom Name');
    });

    it('ajoute le board au registre', async () => {
        const data = {
            version: 1,
            board: validBoard(),
            images: [],
        };

        await ExportImportService.importBoard(data);

        const registry = await boardStorage.getRegistry();
        const found = registry.boards.find((b) => b.id === 'board-1');
        expect(found).toBeDefined();
    });
});
