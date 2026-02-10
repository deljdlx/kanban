/**
 * fakeDB — Mock factory pour simuler IndexedDB via des Maps.
 *
 * Fournit un fakeDB compatible avec l'API idb utilisée dans Database.js.
 * Chaque appel à createFakeDB() retourne des stores frais (isolation par test).
 *
 * Supporte : get, put, delete, getAll, getAllFromIndex, transaction
 * avec cursors itérables (value, delete, continue).
 */

/**
 * Shim IDBKeyRange pour happy-dom (pas d'IndexedDB natif).
 */
globalThis.IDBKeyRange = globalThis.IDBKeyRange || {
    only(value) {
        return value;
    },
};

/**
 * Crée un fakeDB in-memory basé sur des Maps.
 *
 * @returns {{ fakeDB: Object, stores: { meta: Map, boards: Map, images: Map } }}
 */
export function createFakeDB() {
    const stores = {
        meta: new Map(),
        boards: new Map(),
        images: new Map(),
    };

    /**
     * Clone profond d'un objet (compatible avec les objets simples).
     * On évite structuredClone car il n'est pas déclaré dans les globals ESLint.
     */
    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Résout le keyPath d'un record pour un store donné.
     * meta → record.key, boards → record.id, images → record.id
     */
    function getKey(storeName, record) {
        if (storeName === 'meta') return record.key;
        return record.id;
    }

    /**
     * Résout la Map correspondant à un nom de store.
     */
    function getStore(storeName) {
        const map = stores[storeName];
        if (!map) throw new Error(`Store inconnu : ${storeName}`);
        return map;
    }

    const fakeDB = {
        /**
         * Lit un enregistrement par clé.
         */
        async get(storeName, key) {
            return getStore(storeName).get(key) || undefined;
        },

        /**
         * Écrit ou met à jour un enregistrement.
         */
        async put(storeName, record) {
            const key = getKey(storeName, record);
            getStore(storeName).set(key, clone(record));
        },

        /**
         * Supprime un enregistrement par clé.
         */
        async delete(storeName, key) {
            getStore(storeName).delete(key);
        },

        /**
         * Retourne tous les enregistrements d'un store.
         */
        async getAll(storeName) {
            return [...getStore(storeName).values()].map((v) => clone(v));
        },

        /**
         * Retourne les enregistrements correspondant à un index.
         * Supporte l'index "by-board" (field: boardId) et "by-card" (field: cardId).
         */
        async getAllFromIndex(storeName, indexName, value) {
            const field = indexName === 'by-board' ? 'boardId' : 'cardId';
            return [...getStore(storeName).values()].filter((r) => r[field] === value).map((v) => clone(v));
        },

        /**
         * Crée une fausse transaction avec support curseur.
         *
         * Usage typique :
         *   const tx = db.transaction('images', 'readwrite');
         *   const index = tx.store.index('by-board');
         *   let cursor = await index.openCursor(IDBKeyRange.only(boardId));
         */
        transaction(storeName, _mode) {
            const map = getStore(storeName);

            const tx = {
                /** Promesse résolue quand la transaction est "terminée". */
                done: Promise.resolve(),

                store: {
                    /**
                     * Retourne un objet index avec openCursor.
                     */
                    index(indexName) {
                        const field = indexName === 'by-board' ? 'boardId' : 'cardId';

                        return {
                            /**
                             * Ouvre un curseur filtré par valeur d'index.
                             * @param {*} rangeValue - Valeur retournée par IDBKeyRange.only()
                             */
                            async openCursor(rangeValue) {
                                const matchingEntries = [...map.entries()].filter(
                                    ([_key, record]) => record[field] === rangeValue,
                                );

                                let position = 0;

                                function buildCursor() {
                                    if (position >= matchingEntries.length) return null;

                                    const [mapKey, record] = matchingEntries[position];
                                    return {
                                        value: clone(record),
                                        async delete() {
                                            map.delete(mapKey);
                                        },
                                        async continue() {
                                            position++;
                                            return buildCursor();
                                        },
                                    };
                                }

                                return buildCursor();
                            },
                        };
                    },
                },
            };

            return tx;
        },
    };

    return { fakeDB, stores };
}
