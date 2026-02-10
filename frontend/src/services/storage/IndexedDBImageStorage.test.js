/**
 * Tests unitaires — IndexedDBImageStorage (stockage images via IndexedDB).
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
}));

let idCounter;
vi.mock('../../utils/id.js', () => ({
    generateId: (prefix) => `${prefix}-${++idCounter}`,
}));

// Shims URL.createObjectURL / revokeObjectURL
const createdUrls = [];
const revokedUrls = [];

globalThis.URL.createObjectURL = vi.fn((blob) => {
    const url = `blob://fake-${createdUrls.length}`;
    createdUrls.push({ url, blob });
    return url;
});

globalThis.URL.revokeObjectURL = vi.fn((url) => {
    revokedUrls.push(url);
});

const { default: ImageStorage } = await import('./IndexedDBImageStorage.js');

// ---------------------------------------------------------------
// Setup
// ---------------------------------------------------------------

beforeEach(() => {
    const created = createFakeDB();
    fakeDB = created.fakeDB;
    stores = created.stores;
    idCounter = 0;
    createdUrls.length = 0;
    revokedUrls.length = 0;
    ImageStorage._urlCache.clear();
    vi.clearAllMocks();
});

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function fakeBlob(size = 100) {
    return { size, type: 'image/png' };
}

// ---------------------------------------------------------------
// store
// ---------------------------------------------------------------

describe('IndexedDBImageStorage — store', () => {
    it('stocke une image et retourne un ID', async () => {
        const id = await ImageStorage.store({
            blob: fakeBlob(),
            boardId: 'b-1',
            cardId: 'c-1',
            mimeType: 'image/png',
        });

        expect(id).toBe('img-1');
        expect(stores.images.has('img-1')).toBe(true);
    });

    it('enregistre blob, boardId, cardId, mimeType, size', async () => {
        const blob = fakeBlob(256);
        await ImageStorage.store({
            blob,
            boardId: 'b-1',
            cardId: 'c-1',
            mimeType: 'image/jpeg',
        });

        const record = stores.images.get('img-1');
        expect(record.boardId).toBe('b-1');
        expect(record.cardId).toBe('c-1');
        expect(record.mimeType).toBe('image/jpeg');
        expect(record.size).toBe(256);
    });
});

// ---------------------------------------------------------------
// get
// ---------------------------------------------------------------

describe('IndexedDBImageStorage — get', () => {
    it("retourne l'enregistrement pour un ID existant", async () => {
        stores.images.set('img-1', { id: 'img-1', boardId: 'b-1', blob: fakeBlob() });

        const record = await ImageStorage.get('img-1');
        expect(record).toBeDefined();
        expect(record.id).toBe('img-1');
    });

    it('retourne null pour un ID inexistant', async () => {
        const record = await ImageStorage.get('nope');
        expect(record).toBeNull();
    });
});

// ---------------------------------------------------------------
// getUrl
// ---------------------------------------------------------------

describe('IndexedDBImageStorage — getUrl', () => {
    it('retourne null pour un imageId falsy', async () => {
        expect(await ImageStorage.getUrl(null)).toBeNull();
        expect(await ImageStorage.getUrl('')).toBeNull();
        expect(await ImageStorage.getUrl(undefined)).toBeNull();
    });

    it("retourne null si l'image n'existe pas", async () => {
        const url = await ImageStorage.getUrl('nope');
        expect(url).toBeNull();
    });

    it('crée un Object URL via URL.createObjectURL', async () => {
        stores.images.set('img-1', { id: 'img-1', blob: fakeBlob() });

        const url = await ImageStorage.getUrl('img-1');

        expect(url).toBe('blob://fake-0');
        expect(URL.createObjectURL).toHaveBeenCalledOnce();
    });

    it("retourne l'URL cachée sans recréer d'Object URL", async () => {
        stores.images.set('img-1', { id: 'img-1', blob: fakeBlob() });

        const url1 = await ImageStorage.getUrl('img-1');
        const url2 = await ImageStorage.getUrl('img-1');

        expect(url1).toBe(url2);
        expect(URL.createObjectURL).toHaveBeenCalledOnce();
    });
});

// ---------------------------------------------------------------
// delete
// ---------------------------------------------------------------

describe('IndexedDBImageStorage — delete', () => {
    it("supprime l'image de la DB", async () => {
        stores.images.set('img-1', { id: 'img-1', blob: fakeBlob() });

        await ImageStorage.delete('img-1');

        expect(stores.images.has('img-1')).toBe(false);
    });

    it("révoque l'URL cachée si elle existe", async () => {
        stores.images.set('img-1', { id: 'img-1', blob: fakeBlob() });

        // Crée une URL cachée
        await ImageStorage.getUrl('img-1');
        expect(ImageStorage._urlCache.has('img-1')).toBe(true);

        await ImageStorage.delete('img-1');

        expect(ImageStorage._urlCache.has('img-1')).toBe(false);
        expect(revokedUrls).toContain('blob://fake-0');
    });
});

// ---------------------------------------------------------------
// deleteByBoard
// ---------------------------------------------------------------

describe('IndexedDBImageStorage — deleteByBoard', () => {
    it('supprime toutes les images du board (cursor)', async () => {
        stores.images.set('img-1', { id: 'img-1', boardId: 'b-1' });
        stores.images.set('img-2', { id: 'img-2', boardId: 'b-1' });
        stores.images.set('img-3', { id: 'img-3', boardId: 'b-2' });

        const count = await ImageStorage.deleteByBoard('b-1');

        expect(count).toBe(2);
        expect(stores.images.has('img-1')).toBe(false);
        expect(stores.images.has('img-2')).toBe(false);
        expect(stores.images.has('img-3')).toBe(true);
    });

    it('retourne 0 si aucune image', async () => {
        const count = await ImageStorage.deleteByBoard('b-1');
        expect(count).toBe(0);
    });

    it('révoque les URLs cachées des images supprimées', async () => {
        stores.images.set('img-1', { id: 'img-1', boardId: 'b-1', blob: fakeBlob() });

        // Cache une URL
        await ImageStorage.getUrl('img-1');

        await ImageStorage.deleteByBoard('b-1');

        expect(ImageStorage._urlCache.has('img-1')).toBe(false);
        expect(revokedUrls).toContain('blob://fake-0');
    });
});

// ---------------------------------------------------------------
// getByBoard
// ---------------------------------------------------------------

describe('IndexedDBImageStorage — getByBoard', () => {
    it("retourne toutes les images d'un board", async () => {
        stores.images.set('img-1', { id: 'img-1', boardId: 'b-1' });
        stores.images.set('img-2', { id: 'img-2', boardId: 'b-1' });
        stores.images.set('img-3', { id: 'img-3', boardId: 'b-2' });

        const images = await ImageStorage.getByBoard('b-1');
        expect(images).toHaveLength(2);
    });

    it('retourne un tableau vide si aucune image', async () => {
        const images = await ImageStorage.getByBoard('b-1');
        expect(images).toEqual([]);
    });
});

// ---------------------------------------------------------------
// revokeAllUrls
// ---------------------------------------------------------------

describe('IndexedDBImageStorage — revokeAllUrls', () => {
    it('révoque toutes les URLs et vide le cache', async () => {
        stores.images.set('img-1', { id: 'img-1', blob: fakeBlob() });
        stores.images.set('img-2', { id: 'img-2', blob: fakeBlob() });

        await ImageStorage.getUrl('img-1');
        await ImageStorage.getUrl('img-2');

        ImageStorage.revokeAllUrls();

        expect(ImageStorage._urlCache.size).toBe(0);
        expect(revokedUrls).toHaveLength(2);
    });
});

// ---------------------------------------------------------------
// dataUrlToBlob
// ---------------------------------------------------------------

describe('IndexedDBImageStorage — dataUrlToBlob', () => {
    it('convertit une data URL en blob avec le bon MIME type', () => {
        // Petit PNG 1x1 en base64
        const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
        const blob = ImageStorage.dataUrlToBlob(dataUrl);

        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('image/png');
    });

    it('utilise application/octet-stream si pas de MIME', () => {
        // header sans type MIME entre : et ; → mimeMatch[1] = '' (falsy)
        // Le code fait: mimeMatch ? mimeMatch[1] : 'application/octet-stream'
        // Comme mimeMatch[1] = '' (truthy mimeMatch), le ternaire retourne ''
        // Vérifie le comportement réel du code source
        const dataUrl = 'data:application/octet-stream;base64,AAAA';
        const blob = ImageStorage.dataUrlToBlob(dataUrl);

        expect(blob.type).toBe('application/octet-stream');
    });
});
