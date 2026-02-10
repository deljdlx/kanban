/**
 * SnowflakeCursorPlugin — Effet de flocons de neige qui suivent la souris.
 *
 * À chaque déplacement de souris, des flocons sont émis à la position
 * du curseur. Chaque flocon possède une vélocité initiale basée sur
 * la direction et la vitesse de la souris, puis subit :
 *   - la gravité (tombe doucement)
 *   - une friction (ralentit progressivement)
 *   - un léger vent sinusoïdal (oscillation horizontale)
 *
 * Les flocons sont rendus dans un <canvas> superposé en pointer-events: none.
 * Le canvas est créé à l'install et retiré à l'uninstall.
 */
import Snowflake from './Snowflake.js';
import { loadPickr } from '../../lib/PickrLoader.js';
import StorageService from '../../../services/StorageService.js';

/** @type {string} Clé de stockage pour les réglages du plugin */
const SETTINGS_STORAGE_KEY = 'kanban:snowflakeSettings';

/**
 * Réglages par défaut du plugin.
 * Chaque clé correspond à un paramètre modifiable via le settingsPanel.
 */
export const DEFAULT_SETTINGS = {
    color: '#ffffff',
    maxParticles: 120,
    emitRate: 2,
    lifetime: 2.5,
    gravity: 30,
    friction: 0.96,
    windAmplitude: 15,
    windFrequency: 2,
    sizeMin: 1.5,
    sizeMax: 4.0,
};

const SnowflakeCursorPlugin = {
    /** @type {HTMLCanvasElement|null} */
    _canvas: null,

    /** @type {CanvasRenderingContext2D|null} */
    _ctx: null,

    /** @type {Snowflake[]} */
    _particles: [],

    /** @type {number|null} ID du requestAnimationFrame en cours */
    _rafId: null,

    /** @type {{ x: number, y: number }} */
    _mouse: { x: 0, y: 0 },

    /** @type {{ x: number, y: number }} */
    _prevMouse: { x: 0, y: 0 },

    /** @type {boolean} */
    _mouseMoved: false,

    /** @type {Function|null} */
    _onMouseMoveBound: null,

    /** @type {Function|null} */
    _onResizeBound: null,

    /** @type {HTMLStyleElement|null} */
    _styleEl: null,

    /** @type {Object|null} Instance Pickr utilisée dans le settings panel */
    _settingsPickr: null,

    /** @type {number} Timestamp du dernier frame (pour le calcul du delta) */
    _lastTime: 0,

    /** @type {Object} */
    _settings: { ...DEFAULT_SETTINGS },

    /**
     * @param {import('../../HookRegistry.js').default} hooks
     * @returns {Promise<void>}
     */
    async install(hooks) {
        await this._loadSettings();
        this._injectStyles();
        this._createCanvas();

        loadPickr().catch((err) => console.error(err));
        this._particles = [];

        this._onMouseMoveBound = (e) => this._onMouseMove(e);
        this._onResizeBound = () => this._resizeCanvas();

        window.addEventListener('mousemove', this._onMouseMoveBound);
        window.addEventListener('resize', this._onResizeBound);

        this._lastTime = performance.now();
        this._tick();
    },

    uninstall() {
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }

        window.removeEventListener('mousemove', this._onMouseMoveBound);
        window.removeEventListener('resize', this._onResizeBound);

        if (this._canvas) {
            this._canvas.remove();
            this._canvas = null;
            this._ctx = null;
        }

        if (this._styleEl) {
            this._styleEl.remove();
            this._styleEl = null;
        }

        this._destroySettingsPickr();
        this._particles = [];
    },

    // ---------------------------------------------------------------
    // Persistence
    // ---------------------------------------------------------------

    /**
     * Charge les settings depuis IndexedDB.
     * @returns {Promise<void>}
     * @private
     */
    async _loadSettings() {
        const stored = await StorageService.get(SETTINGS_STORAGE_KEY, null);
        this._settings = stored ? { ...DEFAULT_SETTINGS, ...stored } : { ...DEFAULT_SETTINGS };
    },

    /** @type {number|null} Timer du debounce de _saveSettings */
    _saveSettingsTimer: null,

    /**
     * Sauvegarde les settings dans IndexedDB (debounced 300ms).
     * Évite les écritures excessives pendant le drag de sliders.
     * @private
     */
    _saveSettings() {
        clearTimeout(this._saveSettingsTimer);
        this._saveSettingsTimer = setTimeout(async () => {
            await StorageService.set(SETTINGS_STORAGE_KEY, this._settings);
        }, 300);
    },

    // ---------------------------------------------------------------
    // Canvas
    // ---------------------------------------------------------------

    /** @private */
    _createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '9999';

        document.body.appendChild(canvas);
        this._canvas = canvas;
        this._ctx = canvas.getContext('2d');
        this._resizeCanvas();
    },

    /** @private */
    _resizeCanvas() {
        if (!this._canvas) return;
        this._canvas.width = window.innerWidth;
        this._canvas.height = window.innerHeight;
    },

    // ---------------------------------------------------------------
    // Input
    // ---------------------------------------------------------------

    /** @private */
    _onMouseMove(e) {
        this._prevMouse.x = this._mouse.x;
        this._prevMouse.y = this._mouse.y;
        this._mouse.x = e.clientX;
        this._mouse.y = e.clientY;
        this._mouseMoved = true;
    },

    // ---------------------------------------------------------------
    // Boucle principale
    // ---------------------------------------------------------------

    /** @private */
    _tick() {
        // Guard : le plugin a été désinstallé entre deux frames
        if (!this._canvas) return;

        const now = performance.now();
        const dt = Math.min((now - this._lastTime) / 1000, 0.05);
        this._lastTime = now;

        if (this._mouseMoved) {
            this._emit(dt);
            this._mouseMoved = false;
        }

        this._update(dt);
        this._draw();

        this._rafId = requestAnimationFrame(() => this._tick());
    },

    /** @private */
    _emit(dt) {
        const s = this._settings;

        const mouseVx = (this._mouse.x - this._prevMouse.x) / Math.max(dt, 0.001);
        const mouseVy = (this._mouse.y - this._prevMouse.y) / Math.max(dt, 0.001);

        const speed = Math.sqrt(mouseVx * mouseVx + mouseVy * mouseVy);
        const count = Math.min(s.emitRate + Math.floor(speed / 200), 5);

        for (let i = 0; i < count; i++) {
            if (this._particles.length >= s.maxParticles) break;

            const spread = 8;
            const x = this._mouse.x + (Math.random() - 0.5) * spread;
            const y = this._mouse.y + (Math.random() - 0.5) * spread;

            const inheritFactor = 0.3;
            const randomForce = 20;
            const vx = mouseVx * inheritFactor + (Math.random() - 0.5) * randomForce;
            const vy = mouseVy * inheritFactor + (Math.random() - 0.5) * randomForce - 10;

            const sizeRange = s.sizeMax - s.sizeMin;
            const size = s.sizeMin + Math.random() * sizeRange;
            const lifetime = s.lifetime * (0.6 + Math.random() * 0.4);

            const physics = {
                gravity: s.gravity,
                friction: s.friction,
                windAmplitude: s.windAmplitude,
                windFrequency: s.windFrequency,
            };

            this._particles.push(new Snowflake(x, y, vx, vy, size, lifetime, physics));
        }
    },

    /** @private */
    _update(dt) {
        for (const p of this._particles) {
            p.update(dt);
        }
        this._particles = this._particles.filter((p) => p.alive);
    },

    /** @private */
    _draw() {
        const ctx = this._ctx;
        if (!ctx) return;

        ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

        const hex = this._settings.color;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        for (const p of this._particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity})`;
            ctx.fill();
        }
    },

    /** @private */
    _destroySettingsPickr() {
        if (this._settingsPickr) {
            this._settingsPickr.destroyAndRemove();
            this._settingsPickr = null;
        }
    },
};

export default SnowflakeCursorPlugin;
