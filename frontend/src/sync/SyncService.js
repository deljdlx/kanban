/**
 * SyncService — Orchestrateur de synchronisation backend.
 *
 * Service offline-first qui synchronise les modifications locales
 * avec un backend REST. IndexedDB reste la source de vérité.
 *
 * Data-flow :
 *
 *   Mutation locale (board:saved)        Changement distant (pull timer)
 *     │                                      │
 *     ├─ diff(prev, curr) → ops              ├─ adapter.pullOps(boardId, rev)
 *     ├─ syncQueue.enqueue(boardId, ops)     ├─ opApplier.applyAll(ops)
 *     ├─ drain() si online                   ├─ save() (persiste localement)
 *     └─ update snapshot                     └─ update serverRevision
 *
 * Coexistence avec LiveSyncPlugin :
 *   - LiveSyncPlugin : sync cross-tab (même machine), poll 3s
 *   - SyncService    : sync backend (cross-machine), poll 30s
 *   - Les deux écoutent board:saved mais sont indépendants
 *   - Les deux utilisent pauseAutoSave()/resumeAutoSave()
 */
import Container from '../Container.js';
import Hooks from '../plugins/HookRegistry.js';
import StorageService from '../services/StorageService.js';
import { diff } from './BoardDiffer.js';
import OpApplier from './OpApplier.js';
import SyncQueue from './SyncQueue.js';
import { NoOpBackendAdapter } from './BackendAdapter.js';
import { getDB, STORES } from '../services/storage/Database.js';

/** Intervalle de pull par défaut (30 secondes). */
const DEFAULT_PULL_INTERVAL = 30_000;

/** Clé de stockage pour la révision serveur d'un board. */
const REVISION_KEY_PREFIX = 'sync:board:';

class SyncService {
    /**
     * Adapteur backend (NoOp par défaut).
     * @type {import('./BackendAdapter.js').BackendAdapter}
     */
    _adapter;

    /**
     * Queue de synchronisation persistante.
     * @type {SyncQueue}
     */
    _syncQueue;

    /**
     * Appliqueur d'opérations sur le board.
     * @type {OpApplier}
     */
    _opApplier;

    /**
     * Snapshot précédent pour le diff (évite de re-différer
     * les changements appliqués par pull).
     * @type {Object|null}
     */
    _previousSnapshot;

    /**
     * Révision serveur du board courant.
     * @type {number}
     */
    _serverRevision;

    /**
     * Timer du pull périodique.
     * @type {number|null}
     */
    _pullTimerId;

    /**
     * Intervalle de pull en millisecondes.
     * @type {number}
     */
    _pullInterval;

    /**
     * Indique si un drain est en cours (évite les drains concurrents).
     * @type {boolean}
     */
    _draining;

    /**
     * Indique si un pull est en cours (évite les pulls concurrents).
     * @type {boolean}
     */
    _pulling;

    /**
     * Références vers les handlers pour pouvoir les retirer.
     * @type {Object<string, Function>}
     */
    _handlers;

    constructor() {
        this._adapter = new NoOpBackendAdapter();
        this._syncQueue = new SyncQueue();
        this._opApplier = new OpApplier();
        this._previousSnapshot = null;
        this._serverRevision = 0;
        this._pullTimerId = null;
        this._pullInterval = DEFAULT_PULL_INTERVAL;
        this._draining = false;
        this._pulling = false;
        this._handlers = {};
    }

    // ---------------------------------------------------------------
    // Initialisation
    // ---------------------------------------------------------------

    /**
     * Initialise le service : récupère les entrées stale, bind les hooks
     * et écoute les changements de connectivité.
     *
     * Appelé une seule fois au démarrage, APRÈS les plugins.
     *
     * @returns {Promise<void>}
     */
    async init() {
        // Vérifie que le store sync-queue existe (upgrade v2 peut être bloqué
        // si un autre onglet utilise encore la v1).
        const db = await getDB();
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
            console.warn(
                'SyncService: store sync-queue absent — upgrade IndexedDB probablement bloqué. ' +
                    'Fermez les autres onglets et rechargez.',
            );
            return;
        }

        // Recovery : les entrées restées en 'sending' après un crash
        const recovered = await this._syncQueue.recoverStale();
        if (recovered > 0) {
            console.warn(`SyncService: ${recovered} stale entries recovered`);
        }

        // Hooks — board:saved à priority 20 (après LiveSyncPlugin à 10)
        this._handlers.onBoardSaved = () => this._onBoardSaved();
        Hooks.addAction('board:saved', this._handlers.onBoardSaved, 20);

        this._handlers.onBoardWillChange = () => this._onBoardWillChange();
        Hooks.addAction('board:willChange', this._handlers.onBoardWillChange);

        this._handlers.onBoardDidChange = (ctx) => this._onBoardDidChange(ctx);
        Hooks.addAction('board:didChange', this._handlers.onBoardDidChange);

        // Connectivité
        this._handlers.onOnline = () => this._onOnline();
        window.addEventListener('online', this._handlers.onOnline);

        // Container
        Container.set('SyncService', this);
    }

    // ---------------------------------------------------------------
    // API publique
    // ---------------------------------------------------------------

    /**
     * Remplace l'adapteur backend.
     *
     * @param {import('./BackendAdapter.js').BackendAdapter} adapter
     */
    setAdapter(adapter) {
        this._adapter = adapter;
    }

    /**
     * Change l'intervalle de pull et redémarre le timer.
     *
     * @param {number} ms - Intervalle en millisecondes
     */
    setPullInterval(ms) {
        this._pullInterval = ms;
        // Redémarre le timer si actif
        if (this._pullTimerId !== null) {
            this._stopPullTimer();
            this._startPullTimer();
        }
    }

    /**
     * Force un pull + drain immédiat.
     *
     * @returns {Promise<void>}
     */
    async syncNow() {
        await this._pull();
        await this._drain();
    }

    /**
     * Nombre d'opérations en attente pour le board courant.
     *
     * @returns {Promise<number>}
     */
    async pendingCount() {
        const boardId = this._getCurrentBoardId();
        if (!boardId) return 0;
        return await this._syncQueue.pendingCount(boardId);
    }

    // ---------------------------------------------------------------
    // Board lifecycle hooks
    // ---------------------------------------------------------------

    /**
     * board:willChange — Arrête le pull timer et reset l'état.
     * @private
     */
    _onBoardWillChange() {
        this._stopPullTimer();
        this._previousSnapshot = null;
        this._serverRevision = 0;
    }

    /**
     * board:didChange — Capture le snapshot initial, charge la révision
     * serveur, et démarre le pull timer.
     *
     * @param {{ board: Object }} ctx
     * @private
     */
    async _onBoardDidChange(ctx) {
        const board = ctx.board;
        this._previousSnapshot = this._cloneSnapshot(board.toJSON());

        // Charge la révision serveur depuis IndexedDB
        await this._loadServerRevision();

        this._startPullTimer();

        // Drain les éventuelles ops en attente (ex: accumulées offline)
        if (navigator.onLine) {
            this._drain();
        }
    }

    // ---------------------------------------------------------------
    // Producteur : board:saved → diff → enqueue → drain
    // ---------------------------------------------------------------

    /**
     * Handler pour board:saved (priority 20).
     * Compare le snapshot précédent avec l'état actuel et enqueue
     * les opérations de différence.
     *
     * @private
     */
    async _onBoardSaved() {
        const boardService = Container.get('BoardService');
        const board = boardService.getBoard();
        if (!board) return;

        const currentSnapshot = this._cloneSnapshot(board.toJSON());

        if (!this._previousSnapshot) {
            this._previousSnapshot = currentSnapshot;
            return;
        }

        const ops = diff(this._previousSnapshot, currentSnapshot);
        this._previousSnapshot = currentSnapshot;

        if (ops.length === 0) return;

        const boardId = boardService.getCurrentBoardId();
        await this._syncQueue.enqueue(boardId, ops);

        Hooks.doAction('sync:queued', { boardId, opsCount: ops.length });

        // Drain en fire-and-forget si online
        if (navigator.onLine) {
            this._drain();
        }
    }

    // ---------------------------------------------------------------
    // Drain : envoie la queue au backend (FIFO strict)
    // ---------------------------------------------------------------

    /**
     * Envoie les entrées de la queue au backend une par une.
     * S'arrête au premier échec pour préserver l'ordre.
     *
     * @private
     */
    async _drain() {
        if (this._draining) return;
        if (!navigator.onLine) return;

        this._draining = true;

        try {
            const boardId = this._getCurrentBoardId();
            if (!boardId) return;

            while (true) {
                const entry = await this._syncQueue.dequeue(boardId);
                if (!entry) break;

                try {
                    const result = await this._adapter.pushOps(boardId, entry.ops, this._serverRevision);

                    await this._syncQueue.ack(entry.id);

                    if (result.serverRevision) {
                        this._serverRevision = result.serverRevision;
                        await this._saveServerRevision();
                    }

                    Hooks.doAction('sync:pushed', {
                        boardId,
                        opsCount: entry.ops.length,
                        serverRevision: this._serverRevision,
                    });
                } catch (err) {
                    await this._syncQueue.nack(entry.id, err.message);

                    Hooks.doAction('sync:pushFailed', {
                        boardId,
                        error: err.message,
                        retryCount: entry.retryCount + 1,
                    });

                    // Stop au premier échec (FIFO strict)
                    break;
                }
            }
        } finally {
            this._draining = false;
        }
    }

    // ---------------------------------------------------------------
    // Consommateur : pull timer → pullOps → apply
    // ---------------------------------------------------------------

    /**
     * Récupère les opérations distantes et les applique localement.
     *
     * @private
     */
    async _pull() {
        if (this._pulling) return;
        if (!navigator.onLine) return;

        const boardId = this._getCurrentBoardId();
        if (!boardId) return;

        this._pulling = true;

        try {
            const result = await this._adapter.pullOps(boardId, this._serverRevision);

            if (!result.ops || result.ops.length === 0) {
                // Même sans ops, mettre à jour la révision si elle a changé
                if (result.serverRevision && result.serverRevision !== this._serverRevision) {
                    this._serverRevision = result.serverRevision;
                    await this._saveServerRevision();
                }
                return;
            }

            // Applique les ops distantes
            const boardService = Container.get('BoardService');
            boardService.pauseAutoSave();

            try {
                this._opApplier.applyAll(result.ops);
            } finally {
                boardService.resumeAutoSave();
            }

            // Persiste localement
            await boardService.save();

            // Met à jour le snapshot pour éviter de re-différer
            const board = boardService.getBoard();
            this._previousSnapshot = this._cloneSnapshot(board.toJSON());

            // Met à jour la révision serveur
            if (result.serverRevision) {
                this._serverRevision = result.serverRevision;
                await this._saveServerRevision();
            }

            Hooks.doAction('sync:pulled', {
                boardId,
                opsCount: result.ops.length,
                serverRevision: this._serverRevision,
            });
        } catch (err) {
            Hooks.doAction('sync:pullFailed', {
                boardId,
                error: err.message,
            });
        } finally {
            this._pulling = false;
        }
    }

    // ---------------------------------------------------------------
    // Connectivité
    // ---------------------------------------------------------------

    /**
     * Handler pour l'événement 'online' du navigateur.
     * Déclenche un pull puis un drain.
     *
     * @private
     */
    async _onOnline() {
        Hooks.doAction('sync:online', {
            boardId: this._getCurrentBoardId(),
        });

        await this._pull();
        await this._drain();
    }

    // ---------------------------------------------------------------
    // Pull timer
    // ---------------------------------------------------------------

    /**
     * Démarre le timer de pull périodique.
     * @private
     */
    _startPullTimer() {
        if (this._pullTimerId !== null) return;
        this._pullTimerId = setInterval(() => this._pull(), this._pullInterval);
    }

    /**
     * Arrête le timer de pull périodique.
     * @private
     */
    _stopPullTimer() {
        if (this._pullTimerId !== null) {
            clearInterval(this._pullTimerId);
            this._pullTimerId = null;
        }
    }

    // ---------------------------------------------------------------
    // Révision serveur (persistence dans IndexedDB meta store)
    // ---------------------------------------------------------------

    /**
     * Charge la révision serveur depuis IndexedDB.
     * @private
     */
    async _loadServerRevision() {
        const boardId = this._getCurrentBoardId();
        if (!boardId) return;

        const key = REVISION_KEY_PREFIX + boardId + ':revision';
        const data = await StorageService.get(key, null);
        if (data && typeof data.serverRevision === 'number') {
            this._serverRevision = data.serverRevision;
        } else {
            this._serverRevision = 0;
        }
    }

    /**
     * Sauvegarde la révision serveur dans IndexedDB.
     * @private
     */
    async _saveServerRevision() {
        const boardId = this._getCurrentBoardId();
        if (!boardId) return;

        const key = REVISION_KEY_PREFIX + boardId + ':revision';
        await StorageService.set(key, {
            serverRevision: this._serverRevision,
            lastSyncedAt: Date.now(),
        });
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    /**
     * Retourne l'ID du board courant via BoardService.
     *
     * @returns {string|null}
     * @private
     */
    _getCurrentBoardId() {
        if (!Container.has('BoardService')) return null;
        return Container.get('BoardService').getCurrentBoardId();
    }

    /**
     * Clone un snapshot via JSON round-trip.
     *
     * @param {Object} snapshot
     * @returns {Object}
     * @private
     */
    _cloneSnapshot(snapshot) {
        return JSON.parse(JSON.stringify(snapshot));
    }
}

const syncService = new SyncService();
export default syncService;
