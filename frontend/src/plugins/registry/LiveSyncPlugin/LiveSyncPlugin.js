/**
 * LiveSyncPlugin — Synchronisation multi-onglet par event log.
 *
 * Les snapshots (Board.toJSON()) restent la source de vérité.
 * Ce plugin maintient un event log parallèle dans IndexedDB
 * qui enregistre les changements à chaque sauvegarde.
 *
 * Data-flow :
 *
 *   Onglet A (producteur)            IndexedDB                Onglet B (consommateur)
 *     board:saved                                               setInterval (poll)
 *       │                                                          │
 *       ├─ diff(prev, curr) → ops                                  ├─ lire log
 *       ├─ append ──────────────► kanban-board:events ────────────► ├─ filtrer (rev, tabId)
 *       └─ update snapshot                                         ├─ appliquer ops
 *                                                                  └─ update snapshot
 *
 * Composants extraits :
 *   - EventLogStore.js : lecture/écriture du log
 *   - OpApplier.js : application des opérations
 *   - BoardDiffer.js : calcul des différences
 */
import Container from '../../../Container.js';
import { diff } from '../../../sync/BoardDiffer.js';
import EventLogStore from './EventLogStore.js';
import OpApplier from '../../../sync/OpApplier.js';
import StorageService from '../../../services/StorageService.js';
import { generateId } from '../../../utils/id.js';

/** Clé pour persister l'intervalle de polling */
const SETTINGS_KEY = 'kanban:liveSync:pollInterval';

/** Intervalle de polling par défaut (3 s) */
const DEFAULT_POLL_INTERVAL = 3000;

/**
 * Options proposées dans le settings panel.
 * @type {Array<{ label: string, value: number }>}
 */
export const POLL_OPTIONS = [
    { label: '1 seconde', value: 1000 },
    { label: '2 secondes', value: 2000 },
    { label: '3 secondes', value: 3000 },
    { label: '5 secondes', value: 5000 },
    { label: '10 secondes', value: 10_000 },
];

export default class LiveSyncPlugin {
    /** @type {number} */
    _pollInterval = DEFAULT_POLL_INTERVAL;

    /** @type {string} */
    _tabId = generateId('tab');

    /** @type {number|null} */
    _intervalId = null;

    /** @type {number} */
    _lastKnownRev = 0;

    /** @type {Object|null} */
    _previousSnapshot = null;

    /** @type {boolean} */
    _fallbackInProgress = false;

    /** @type {import('../../HookRegistry.js').default|null} */
    _hooksRegistry = null;

    /** @type {Object<string, Function>} */
    _handlers = {};

    /** @type {EventLogStore} */
    _eventLog;

    /** @type {OpApplier} */
    _opApplier;

    constructor() {
        this._eventLog = new EventLogStore();
        this._opApplier = new OpApplier();
    }

    // ---------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------

    /**
     * @param {import('../../HookRegistry.js').default} hooks
     * @returns {Promise<void>}
     */
    async install(hooks) {
        this._hooksRegistry = hooks;
        await this._loadSettings();

        this._handlers.onBoardWillChange = () => this._onBoardWillChange();
        hooks.addAction('board:willChange', this._handlers.onBoardWillChange);

        this._handlers.onBoardRendered = () => this._onBoardRendered();
        hooks.addAction('board:rendered', this._handlers.onBoardRendered);

        this._handlers.onBoardSaved = () => this._onBoardSaved();
        hooks.addAction('board:saved', this._handlers.onBoardSaved);

        this._startPolling();
    }

    /**
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        if (this._handlers.onBoardWillChange) {
            hooks.removeAction('board:willChange', this._handlers.onBoardWillChange);
        }
        if (this._handlers.onBoardRendered) {
            hooks.removeAction('board:rendered', this._handlers.onBoardRendered);
        }
        if (this._handlers.onBoardSaved) {
            hooks.removeAction('board:saved', this._handlers.onBoardSaved);
        }

        if (this._intervalId !== null) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }

        this._resetState();
        this._hooksRegistry = null;
        this._handlers = {};
    }

    // ---------------------------------------------------------------
    // Settings
    // ---------------------------------------------------------------

    /** @private */
    async _loadSettings() {
        const stored = await StorageService.get(SETTINGS_KEY, null);
        if (stored !== null) {
            const parsed = Number(stored);
            if (POLL_OPTIONS.some((o) => o.value === parsed)) {
                this._pollInterval = parsed;
            }
        }
    }

    /** @private */
    async _saveSettings() {
        await StorageService.set(SETTINGS_KEY, this._pollInterval);
    }

    // ---------------------------------------------------------------
    // Polling
    // ---------------------------------------------------------------

    /** @private */
    _startPolling() {
        this._intervalId = setInterval(() => this._poll(), this._pollInterval);
    }

    /** Redémarre le polling avec le nouvel intervalle. */
    restartPolling() {
        if (this._intervalId !== null) {
            clearInterval(this._intervalId);
        }
        this._startPolling();
    }

    // ---------------------------------------------------------------
    // Board lifecycle
    // ---------------------------------------------------------------

    /** @private */
    _onBoardWillChange() {
        this._resetState();
    }

    /** @private */
    async _onBoardRendered() {
        const boardService = Container.get('BoardService');
        const board = boardService.getBoard();

        this._eventLog.setBoardId(boardService.getCurrentBoardId());
        this._previousSnapshot = this._cloneSnapshot(board.toJSON());

        const log = await this._eventLog.read();
        this._lastKnownRev = log.revision;
    }

    /** @private */
    _resetState() {
        this._previousSnapshot = null;
        this._lastKnownRev = 0;
        this._fallbackInProgress = false;
        this._eventLog.setBoardId(null);
    }

    // ---------------------------------------------------------------
    // Producteur : board:saved → diff → append
    // ---------------------------------------------------------------

    /** @private */
    async _onBoardSaved() {
        const board = Container.get('BoardService').getBoard();
        const currentSnapshot = this._cloneSnapshot(board.toJSON());

        if (!this._previousSnapshot) {
            this._previousSnapshot = currentSnapshot;
            return;
        }

        const ops = diff(this._previousSnapshot, currentSnapshot);

        if (ops.length > 0) {
            await this._eventLog.append(ops, this._tabId);
        }

        this._previousSnapshot = currentSnapshot;
    }

    // ---------------------------------------------------------------
    // Consommateur : polling → lire log → appliquer ops
    // ---------------------------------------------------------------

    /** @private */
    async _poll() {
        if (!this._previousSnapshot) return;
        if (document.hidden) return;
        if (this._isDirty()) return;

        const log = await this._eventLog.read();
        const newEntries = this._eventLog.filterNewEntries(log, this._lastKnownRev, this._tabId);

        if (newEntries.length === 0) return;

        // Trou dans le log → fallback snapshot diff
        if (this._eventLog.hasGap(log, this._lastKnownRev)) {
            if (!this._fallbackInProgress) {
                this._fallbackSnapshotDiff();
            }
            return;
        }

        this._applyEntries(newEntries);
    }

    /**
     * @param {Array<{ rev: number, ops: Array }>} entries
     * @private
     */
    _applyEntries(entries) {
        const boardService = Container.get('BoardService');
        boardService.pauseAutoSave();

        try {
            for (const entry of entries) {
                this._opApplier.applyAll(entry.ops);
            }
        } finally {
            boardService.resumeAutoSave();
            this._lastKnownRev = entries[entries.length - 1].rev;

            const board = boardService.getBoard();
            this._previousSnapshot = this._cloneSnapshot(board.toJSON());
        }

        // Notification
        const operations = [
            ...new Set(entries.flatMap((e) => (Array.isArray(e.ops) ? e.ops.map((op) => op.type) : []))),
        ];
        this._hooksRegistry.doAction('sync:applied', {
            entriesCount: entries.length,
            operations,
        });
    }

    // ---------------------------------------------------------------
    // Fallback : snapshot diff (recovery)
    // ---------------------------------------------------------------

    /** @private */
    async _fallbackSnapshotDiff() {
        this._fallbackInProgress = true;
        console.info('LiveSync: fallback snapshot diff');

        try {
            const boardService = Container.get('BoardService');
            const board = boardService.getBoard();

            const log = await this._eventLog.read();
            const rawSnapshot = await boardService.loadSnapshot();

            if (!rawSnapshot) {
                this._lastKnownRev = log.revision;
                return;
            }

            const savedState = this._hooksRegistry?.applyFilters('board:afterLoad', rawSnapshot) ?? rawSnapshot;
            const localState = board.toJSON();
            const ops = diff(localState, savedState);

            if (ops.length === 0) {
                this._lastKnownRev = log.revision;
                this._previousSnapshot = this._cloneSnapshot(board.toJSON());
                return;
            }

            boardService.pauseAutoSave();

            try {
                this._opApplier.applyAll(ops);
            } finally {
                boardService.resumeAutoSave();
                this._lastKnownRev = log.revision;
                this._previousSnapshot = this._cloneSnapshot(board.toJSON());
            }

            const operations = [...new Set(ops.map((op) => op.type))];
            this._hooksRegistry?.doAction('sync:applied', {
                entriesCount: 1,
                fallback: true,
                operations,
            });
        } finally {
            this._fallbackInProgress = false;
        }
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    /** @private */
    _isDirty() {
        if (!this._previousSnapshot) return false;

        const board = Container.get('BoardService').getBoard();
        if (!board) return false;

        return JSON.stringify(board.toJSON()) !== JSON.stringify(this._previousSnapshot);
    }

    /**
     * @param {Object} snapshot
     * @returns {Object}
     * @private
     */
    _cloneSnapshot(snapshot) {
        return JSON.parse(JSON.stringify(snapshot));
    }
}
