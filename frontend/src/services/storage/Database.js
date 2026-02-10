/**
 * Database — Connexion IndexedDB unifiée via idb.
 *
 * Toutes les données de l'application sont stockées dans une seule DB
 * IndexedDB avec plusieurs stores :
 *
 *   - meta    : registre des boards + settings globaux
 *   - boards  : données complètes de chaque board
 *   - images  : blobs des images avec indexes
 *
 * Ce module exporte une promesse qui résout vers l'instance de DB.
 * Utiliser `await getDB()` pour obtenir la connexion.
 *
 * @example
 * import { getDB } from './Database.js';
 *
 * const db = await getDB();
 * await db.put('boards', boardData);
 * const board = await db.get('boards', boardId);
 */
import { openDB } from 'idb';

const DB_NAME = 'kanban';
const DB_VERSION = 2;

/**
 * Stores disponibles dans la DB.
 */
export const STORES = {
    META: 'meta',
    BOARDS: 'boards',
    IMAGES: 'images',
    SYNC_QUEUE: 'sync-queue',
};

/**
 * Clés utilisées dans le store 'meta'.
 */
export const META_KEYS = {
    REGISTRY: 'board-registry',
    SETTINGS: 'global-settings',
};

/**
 * Instance de la DB (singleton via promesse).
 * @type {Promise<import('idb').IDBPDatabase>|null}
 */
let dbPromise = null;

/**
 * Retourne l'instance de la DB, l'initialisant si nécessaire.
 *
 * @returns {Promise<import('idb').IDBPDatabase>}
 */
export async function getDB() {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            blocked() {
                console.warn(
                    'Database : upgrade bloqué — un autre onglet utilise une ancienne version. ' +
                        'Fermez les autres onglets et rechargez la page.',
                );
            },
            upgrade(db, oldVersion) {
                // --- v0 → v1 : stores initiaux ---
                if (oldVersion < 1) {
                    db.createObjectStore(STORES.META, { keyPath: 'key' });
                    db.createObjectStore(STORES.BOARDS, { keyPath: 'id' });

                    const imagesStore = db.createObjectStore(STORES.IMAGES, { keyPath: 'id' });
                    imagesStore.createIndex('by-board', 'boardId', { unique: false });
                    imagesStore.createIndex('by-card', 'cardId', { unique: false });
                }

                // --- v1 → v2 : sync-queue pour le backend sync ---
                if (oldVersion < 2) {
                    const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                    syncStore.createIndex('by-board', 'boardId', { unique: false });
                    syncStore.createIndex('by-status', 'status', { unique: false });
                }
            },
        });
    }

    return dbPromise;
}

/**
 * Ferme la connexion à la DB (utile pour les tests).
 */
export async function closeDB() {
    if (dbPromise) {
        const db = await dbPromise;
        db.close();
        dbPromise = null;
    }
}

/**
 * Supprime complètement la DB (utile pour les tests ou reset).
 */
export async function deleteDB() {
    await closeDB();
    await indexedDB.deleteDatabase(DB_NAME);
}

export default { getDB, closeDB, deleteDB, STORES, META_KEYS };
