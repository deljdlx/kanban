/**
 * Tests unitaires — StorageService (facade unifiée pour le stockage).
 *
 * Vérifie que chaque méthode délègue au bon service sous-jacent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------

vi.mock('./storage/Database.js', () => ({
    getDB: vi.fn(() => Promise.resolve({})),
    STORES: { META: 'meta', BOARDS: 'boards', IMAGES: 'images' },
}));

const mockBoardStorage = {
    getSetting: vi.fn(),
    setSetting: vi.fn(),
    deleteSetting: vi.fn(),
    getRegistry: vi.fn(),
    saveRegistry: vi.fn(),
    createBoard: vi.fn(),
    loadBoard: vi.fn(),
    saveBoard: vi.fn(),
    deleteBoard: vi.fn(),
    duplicateBoard: vi.fn(),
    renameBoard: vi.fn(),
    setActiveBoard: vi.fn(),
};

const mockImageStorage = {
    store: vi.fn(),
    getUrl: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    getByBoard: vi.fn(),
    revokeAllUrls: vi.fn(),
    blobToDataUrl: vi.fn(),
    dataUrlToBlob: vi.fn(),
};

vi.mock('./storage/BoardStorage.js', () => ({ default: mockBoardStorage }));
vi.mock('./storage/IndexedDBImageStorage.js', () => ({ default: mockImageStorage }));
vi.mock('../Container.js', () => ({ default: { set: vi.fn() } }));

const { default: StorageService } = await import('./StorageService.js');
const { getDB } = await import('./storage/Database.js');

// ---------------------------------------------------------------
// Setup
// ---------------------------------------------------------------

beforeEach(() => {
    vi.clearAllMocks();
    StorageService._initialized = false;
});

// ---------------------------------------------------------------
// init
// ---------------------------------------------------------------

describe('StorageService — init', () => {
    it('appelle getDB au premier init', async () => {
        await StorageService.init();

        expect(getDB).toHaveBeenCalledOnce();
        expect(StorageService._initialized).toBe(true);
    });

    it('ne rappelle pas getDB si déjà initialisé', async () => {
        await StorageService.init();
        await StorageService.init();

        expect(getDB).toHaveBeenCalledOnce();
    });
});

// ---------------------------------------------------------------
// settings
// ---------------------------------------------------------------

describe('StorageService — settings', () => {
    it('get délègue à boardStorage.getSetting', async () => {
        mockBoardStorage.getSetting.mockResolvedValue('dark');

        const result = await StorageService.get('theme', 'light');

        expect(mockBoardStorage.getSetting).toHaveBeenCalledWith('theme', 'light');
        expect(result).toBe('dark');
    });

    it('set délègue à boardStorage.setSetting', async () => {
        await StorageService.set('theme', 'dark');

        expect(mockBoardStorage.setSetting).toHaveBeenCalledWith('theme', 'dark');
    });

    it('remove délègue à boardStorage.deleteSetting', async () => {
        await StorageService.remove('theme');

        expect(mockBoardStorage.deleteSetting).toHaveBeenCalledWith('theme');
    });
});

// ---------------------------------------------------------------
// boards
// ---------------------------------------------------------------

describe('StorageService — boards', () => {
    it('getBoardRegistry délègue à boardStorage.getRegistry', async () => {
        mockBoardStorage.getRegistry.mockResolvedValue({ boards: [] });

        const result = await StorageService.getBoardRegistry();

        expect(mockBoardStorage.getRegistry).toHaveBeenCalledOnce();
        expect(result).toEqual({ boards: [] });
    });

    it('saveBoardRegistry délègue à boardStorage.saveRegistry', async () => {
        const registry = { boards: [] };
        await StorageService.saveBoardRegistry(registry);

        expect(mockBoardStorage.saveRegistry).toHaveBeenCalledWith(registry);
    });

    it('createBoard délègue à boardStorage.createBoard', async () => {
        mockBoardStorage.createBoard.mockResolvedValue('b-1');

        const id = await StorageService.createBoard('Test');

        expect(mockBoardStorage.createBoard).toHaveBeenCalledWith('Test');
        expect(id).toBe('b-1');
    });

    it('loadBoard délègue à boardStorage.loadBoard', async () => {
        mockBoardStorage.loadBoard.mockResolvedValue({ id: 'b-1' });

        const result = await StorageService.loadBoard('b-1');

        expect(mockBoardStorage.loadBoard).toHaveBeenCalledWith('b-1');
        expect(result.id).toBe('b-1');
    });

    it('saveBoard délègue à boardStorage.saveBoard', async () => {
        const data = { id: 'b-1' };
        await StorageService.saveBoard('b-1', data);

        expect(mockBoardStorage.saveBoard).toHaveBeenCalledWith('b-1', data);
    });

    it('deleteBoard délègue à boardStorage.deleteBoard', async () => {
        mockBoardStorage.deleteBoard.mockResolvedValue(true);

        const result = await StorageService.deleteBoard('b-1');

        expect(mockBoardStorage.deleteBoard).toHaveBeenCalledWith('b-1');
        expect(result).toBe(true);
    });

    it('duplicateBoard délègue à boardStorage.duplicateBoard', async () => {
        mockBoardStorage.duplicateBoard.mockResolvedValue('b-2');

        const id = await StorageService.duplicateBoard('b-1', 'Copy');

        expect(mockBoardStorage.duplicateBoard).toHaveBeenCalledWith('b-1', 'Copy');
        expect(id).toBe('b-2');
    });

    it('renameBoard délègue à boardStorage.renameBoard', async () => {
        mockBoardStorage.renameBoard.mockResolvedValue(true);

        const result = await StorageService.renameBoard('b-1', 'New');

        expect(mockBoardStorage.renameBoard).toHaveBeenCalledWith('b-1', 'New');
        expect(result).toBe(true);
    });

    it('setActiveBoard délègue à boardStorage.setActiveBoard', async () => {
        mockBoardStorage.setActiveBoard.mockResolvedValue(true);

        const result = await StorageService.setActiveBoard('b-1');

        expect(mockBoardStorage.setActiveBoard).toHaveBeenCalledWith('b-1');
        expect(result).toBe(true);
    });
});

// ---------------------------------------------------------------
// images
// ---------------------------------------------------------------

describe('StorageService — images', () => {
    it('storeImage délègue à imageStorage.store', async () => {
        const data = { blob: {}, boardId: 'b-1', mimeType: 'image/png' };
        mockImageStorage.store.mockResolvedValue('img-1');

        const id = await StorageService.storeImage(data);

        expect(mockImageStorage.store).toHaveBeenCalledWith(data);
        expect(id).toBe('img-1');
    });

    it('getImageUrl délègue à imageStorage.getUrl', async () => {
        mockImageStorage.getUrl.mockResolvedValue('blob://fake');

        const url = await StorageService.getImageUrl('img-1');

        expect(mockImageStorage.getUrl).toHaveBeenCalledWith('img-1');
        expect(url).toBe('blob://fake');
    });

    it('getImage délègue à imageStorage.get', async () => {
        mockImageStorage.get.mockResolvedValue({ id: 'img-1' });

        const result = await StorageService.getImage('img-1');

        expect(mockImageStorage.get).toHaveBeenCalledWith('img-1');
        expect(result.id).toBe('img-1');
    });

    it('deleteImage délègue à imageStorage.delete', async () => {
        mockImageStorage.delete.mockResolvedValue(true);

        const result = await StorageService.deleteImage('img-1');

        expect(mockImageStorage.delete).toHaveBeenCalledWith('img-1');
        expect(result).toBe(true);
    });

    it('getImagesByBoard délègue à imageStorage.getByBoard', async () => {
        mockImageStorage.getByBoard.mockResolvedValue([{ id: 'img-1' }]);

        const result = await StorageService.getImagesByBoard('b-1');

        expect(mockImageStorage.getByBoard).toHaveBeenCalledWith('b-1');
        expect(result).toHaveLength(1);
    });

    it('revokeAllImageUrls délègue à imageStorage.revokeAllUrls', () => {
        StorageService.revokeAllImageUrls();

        expect(mockImageStorage.revokeAllUrls).toHaveBeenCalledOnce();
    });

    it('blobToDataUrl délègue à imageStorage.blobToDataUrl', async () => {
        const blob = {};
        mockImageStorage.blobToDataUrl.mockResolvedValue('data:...');

        const result = await StorageService.blobToDataUrl(blob);

        expect(mockImageStorage.blobToDataUrl).toHaveBeenCalledWith(blob);
        expect(result).toBe('data:...');
    });

    it('dataUrlToBlob délègue à imageStorage.dataUrlToBlob', () => {
        mockImageStorage.dataUrlToBlob.mockReturnValue({});

        StorageService.dataUrlToBlob('data:...');

        expect(mockImageStorage.dataUrlToBlob).toHaveBeenCalledWith('data:...');
    });
});
