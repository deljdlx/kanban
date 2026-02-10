/**
 * EventLogStore — Gestion du journal d'événements pour la synchronisation.
 *
 * Responsabilités :
 *   - Lecture/écriture du log d'événements dans IndexedDB
 *   - Purge des entrées expirées (compaction)
 *   - Génération de la clé de stockage par board
 */
import StorageService from '../../../services/StorageService.js';

/** Préfixe de la clé pour l'event log */
const EVENTS_KEY_PREFIX = 'kanban:board:';
const EVENTS_KEY_SUFFIX = ':events';

/** Durée de rétention des entries dans le log (30 s) */
const LOG_MAX_AGE = 30_000;

export default class EventLogStore {
    /**
     * ID du board courant.
     * @type {string|null}
     */
    _boardId;

    constructor() {
        this._boardId = null;
    }

    /**
     * Définit l'ID du board courant.
     *
     * @param {string|null} boardId
     */
    setBoardId(boardId) {
        this._boardId = boardId;
    }

    /**
     * Retourne la clé de stockage pour l'event log.
     *
     * @returns {string}
     */
    getKey() {
        return EVENTS_KEY_PREFIX + (this._boardId || 'default') + EVENTS_KEY_SUFFIX;
    }

    /**
     * Lit l'event log depuis IndexedDB.
     * Retourne un log vide si rien n'existe ou si le JSON est corrompu.
     *
     * @returns {Promise<{ revision: number, entries: Array }>}
     */
    async read() {
        const parsed = await StorageService.get(this.getKey(), null);
        if (parsed && typeof parsed.revision === 'number' && Array.isArray(parsed.entries)) {
            return parsed;
        }
        return { revision: 0, entries: [] };
    }

    /**
     * Écrit des opérations dans le log.
     * Incrémente la révision et purge les entrées expirées.
     *
     * @param {Array} ops - Tableau d'opérations à écrire
     * @param {string} tabId - ID de l'onglet producteur
     * @returns {Promise<void>}
     */
    async append(ops, tabId) {
        try {
            const log = await this.read();
            const now = Date.now();

            log.revision++;
            log.entries.push({
                rev: log.revision,
                tabId,
                ops,
                ts: now,
            });

            // Compaction : purge les entries de plus de LOG_MAX_AGE
            const cutoff = now - LOG_MAX_AGE;
            log.entries = log.entries.filter((e) => e.ts >= cutoff);

            await StorageService.set(this.getKey(), log);
        } catch (err) {
            console.error('EventLogStore: échec écriture', err);
        }
    }

    /**
     * Filtre les entrées du log pour trouver celles à appliquer.
     *
     * @param {{ revision: number, entries: Array }} log
     * @param {number} lastKnownRev - Dernière révision connue
     * @param {string} tabId - ID de l'onglet courant (à exclure)
     * @returns {Array} Entrées à appliquer
     */
    filterNewEntries(log, lastKnownRev, tabId) {
        return log.entries.filter((e) => e.rev > lastKnownRev && e.tabId !== tabId);
    }

    /**
     * Vérifie s'il y a un trou dans le log (onglet dormant trop longtemps).
     *
     * @param {{ entries: Array }} log
     * @param {number} lastKnownRev
     * @returns {boolean}
     */
    hasGap(log, lastKnownRev) {
        if (log.entries.length === 0 || lastKnownRev === 0) {
            return false;
        }
        const oldestEntry = log.entries[0];
        return lastKnownRev < oldestEntry.rev;
    }
}
