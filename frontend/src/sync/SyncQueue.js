/**
 * SyncQueue — Queue persistante d'opérations de synchronisation.
 *
 * Stocke les batches d'opérations dans le store IndexedDB 'sync-queue'.
 * Chaque entrée correspond à un diff produit par un board:saved.
 * La queue est FIFO (auto-increment = ordre naturel) et persiste
 * à travers les crashes navigateur.
 *
 * Machine d'état d'une entrée :
 *
 *   pending ──dequeue()──► sending ──ack()──► (supprimé)
 *                              │
 *                            nack()
 *                              │
 *                              ▼
 *                           failed (retryCount < MAX_RETRIES → repasse pending)
 */
import { getDB, STORES } from '../services/storage/Database.js';

/** Nombre max de tentatives avant qu'une entrée reste en 'failed'. */
const MAX_RETRIES = 5;

export default class SyncQueue {
    // ---------------------------------------------------------------
    // Écriture
    // ---------------------------------------------------------------

    /**
     * Ajoute un batch d'opérations à la queue.
     *
     * @param {string} boardId - ID du board concerné
     * @param {Array} ops - Opérations issues de BoardDiffer.diff()
     * @returns {Promise<number>} ID de l'entrée créée
     */
    async enqueue(boardId, ops) {
        const db = await getDB();
        const entry = {
            boardId,
            ops,
            status: 'pending',
            retryCount: 0,
            createdAt: Date.now(),
            error: null,
        };
        return await db.add(STORES.SYNC_QUEUE, entry);
    }

    // ---------------------------------------------------------------
    // Lecture / transition
    // ---------------------------------------------------------------

    /**
     * Prend la prochaine entrée 'pending' pour un board et la passe
     * en 'sending'. Opération atomique (transaction readwrite).
     *
     * @param {string} boardId - ID du board
     * @returns {Promise<Object|null>} L'entrée en 'sending', ou null si rien à envoyer
     */
    async dequeue(boardId) {
        const db = await getDB();
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        const index = store.index('by-board');

        // Parcourt les entrées du board par ordre d'ID (FIFO)
        let cursor = await index.openCursor(boardId);
        while (cursor) {
            if (cursor.value.status === 'pending') {
                const entry = { ...cursor.value, status: 'sending' };
                await cursor.update(entry);
                await tx.done;
                return entry;
            }
            cursor = await cursor.continue();
        }

        await tx.done;
        return null;
    }

    /**
     * Confirme l'envoi réussi : supprime l'entrée de la queue.
     *
     * @param {number} entryId - ID de l'entrée à confirmer
     * @returns {Promise<void>}
     */
    async ack(entryId) {
        const db = await getDB();
        await db.delete(STORES.SYNC_QUEUE, entryId);
    }

    /**
     * Signale un échec d'envoi. Incrémente le compteur de tentatives.
     * Si le max est atteint, l'entrée reste en 'failed'.
     * Sinon elle repasse en 'pending' pour retry.
     *
     * @param {number} entryId - ID de l'entrée
     * @param {string} error - Message d'erreur
     * @returns {Promise<void>}
     */
    async nack(entryId, error) {
        const db = await getDB();
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
        const store = tx.objectStore(STORES.SYNC_QUEUE);

        const entry = await store.get(entryId);
        if (!entry) {
            await tx.done;
            return;
        }

        entry.retryCount += 1;
        entry.error = error;
        entry.status = entry.retryCount >= MAX_RETRIES ? 'failed' : 'pending';

        await store.put(entry);
        await tx.done;
    }

    // ---------------------------------------------------------------
    // Requêtes
    // ---------------------------------------------------------------

    /**
     * Nombre d'entrées en attente (pending + sending) pour un board.
     *
     * @param {string} boardId - ID du board
     * @returns {Promise<number>}
     */
    async pendingCount(boardId) {
        const db = await getDB();
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
        const index = tx.objectStore(STORES.SYNC_QUEUE).index('by-board');

        let count = 0;
        let cursor = await index.openCursor(boardId);
        while (cursor) {
            if (cursor.value.status === 'pending' || cursor.value.status === 'sending') {
                count++;
            }
            cursor = await cursor.continue();
        }

        return count;
    }

    // ---------------------------------------------------------------
    // Nettoyage
    // ---------------------------------------------------------------

    /**
     * Vide toutes les entrées d'un board (toutes statuts confondus).
     *
     * @param {string} boardId - ID du board
     * @returns {Promise<void>}
     */
    async clearBoard(boardId) {
        const db = await getDB();
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        const index = store.index('by-board');

        let cursor = await index.openCursor(boardId);
        while (cursor) {
            await cursor.delete();
            cursor = await cursor.continue();
        }

        await tx.done;
    }

    /**
     * Remet toutes les entrées 'sending' en 'pending'.
     * Recovery après crash : si le navigateur a été fermé pendant
     * un envoi, les entrées restées en 'sending' sont réintégrées.
     *
     * @returns {Promise<number>} Nombre d'entrées récupérées
     */
    async recoverStale() {
        const db = await getDB();
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        const index = store.index('by-status');

        let recovered = 0;
        let cursor = await index.openCursor('sending');
        while (cursor) {
            const entry = { ...cursor.value, status: 'pending' };
            await cursor.update(entry);
            recovered++;
            cursor = await cursor.continue();
        }

        await tx.done;
        return recovered;
    }
}
