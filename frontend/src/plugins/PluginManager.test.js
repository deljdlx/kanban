/**
 * Tests unitaires — PluginManager.
 *
 * Crée une instance fraîche à chaque test (pas le singleton) pour l'isolation.
 * Les dépendances (StorageService, HookRegistry, Container) sont mockées.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mocks des dépendances ---

vi.mock('../services/StorageService.js', () => ({
    default: {
        get: vi.fn().mockResolvedValue([]),
        set: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('./HookRegistry.js', () => ({
    default: {
        registerHook: vi.fn(),
    },
}));

vi.mock('../Container.js', () => ({
    default: {
        set: vi.fn(),
        get: vi.fn(),
        has: vi.fn(),
    },
}));

import { PluginManager } from './PluginManager.js';
import StorageService from '../services/StorageService.js';
import Hooks from './HookRegistry.js';

/** @type {PluginManager} */
let pm;

beforeEach(async () => {
    vi.clearAllMocks();
    pm = new PluginManager();
    await pm.init();
});

/**
 * Crée un plugin minimal valide.
 *
 * @param {string} name - Nom du plugin
 * @param {Object} [overrides] - Propriétés à surcharger (install, hooks, etc.)
 * @returns {Object}
 */
function makePlugin(name, overrides = {}) {
    return {
        name,
        install: vi.fn(),
        ...overrides,
    };
}

// ---------------------------------------------------------------
// register()
// ---------------------------------------------------------------

describe('PluginManager — register', () => {
    it('enregistre un plugin sync (installed: true)', async () => {
        const plugin = makePlugin('sync-plugin');

        await pm.register(plugin);

        expect(pm.isEnabled('sync-plugin')).toBe(true);
        expect(plugin.install).toHaveBeenCalledOnce();
        expect(plugin.install).toHaveBeenCalledWith(Hooks);
    });

    it('enregistre un plugin async (installed: true)', async () => {
        const plugin = makePlugin('async-plugin', {
            install: vi.fn().mockResolvedValue(undefined),
        });

        await pm.register(plugin);

        expect(pm.isEnabled('async-plugin')).toBe(true);
        expect(plugin.install).toHaveBeenCalledOnce();
    });

    it("n'installe pas un plugin désactivé", async () => {
        // Simule un plugin précédemment désactivé en IndexedDB
        StorageService.get.mockResolvedValueOnce(['disabled-plugin']);
        pm = new PluginManager();
        await pm.init();

        const plugin = makePlugin('disabled-plugin');
        await pm.register(plugin);

        expect(pm.isEnabled('disabled-plugin')).toBe(false);
        expect(plugin.install).not.toHaveBeenCalled();
    });

    it('gère une erreur dans install() (installed: false, error set)', async () => {
        const error = new Error('boom');
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const plugin = makePlugin('broken-plugin', {
            install: vi.fn(() => {
                throw error;
            }),
        });

        await pm.register(plugin);

        expect(pm.isEnabled('broken-plugin')).toBe(false);
        const all = pm.getAll();
        const entry = all.find((e) => e.instance.name === 'broken-plugin');
        expect(entry.error).toBe(error);

        errorSpy.mockRestore();
    });

    it('gère une erreur dans install() async', async () => {
        const error = new Error('async boom');
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const plugin = makePlugin('broken-async', {
            install: vi.fn().mockRejectedValue(error),
        });

        await pm.register(plugin);

        expect(pm.isEnabled('broken-async')).toBe(false);
        const all = pm.getAll();
        const entry = all.find((e) => e.instance.name === 'broken-async');
        expect(entry.error).toBe(error);

        errorSpy.mockRestore();
    });

    it('refuse un plugin sans name', async () => {
        await expect(pm.register({ install: vi.fn() })).rejects.toThrow('doit avoir une propriété "name"');
    });

    it('refuse un plugin déjà enregistré', async () => {
        await pm.register(makePlugin('dup'));

        await expect(pm.register(makePlugin('dup'))).rejects.toThrow('déjà enregistré');
    });

    it('enregistre les hooks provides du plugin', async () => {
        const plugin = makePlugin('hook-provider', {
            hooks: { provides: ['custom:event'] },
        });

        await pm.register(plugin);

        expect(Hooks.registerHook).toHaveBeenCalledWith('custom:event');
    });

    it('enregistre les hooks provides même si plugin désactivé', async () => {
        StorageService.get.mockResolvedValueOnce(['hook-disabled']);
        pm = new PluginManager();
        await pm.init();

        const plugin = makePlugin('hook-disabled', {
            hooks: { provides: [{ name: 'my:hook', label: 'Mon hook' }] },
        });

        await pm.register(plugin);

        expect(Hooks.registerHook).toHaveBeenCalledWith('my:hook', { name: 'my:hook', label: 'Mon hook' });
    });

    it('émet change après register', async () => {
        const spy = vi.fn();
        pm.on('change', spy);

        await pm.register(makePlugin('emitter'));

        expect(spy).toHaveBeenCalledOnce();
    });
});

// ---------------------------------------------------------------
// enable() / disable()
// ---------------------------------------------------------------

describe('PluginManager — enable / disable', () => {
    it('disable désactive un plugin installé', async () => {
        const plugin = makePlugin('to-disable', {
            uninstall: vi.fn(),
        });
        await pm.register(plugin);
        expect(pm.isEnabled('to-disable')).toBe(true);

        await pm.disable('to-disable');

        expect(pm.isEnabled('to-disable')).toBe(false);
        expect(plugin.uninstall).toHaveBeenCalledWith(Hooks);
        // Vérifie la persistence
        expect(StorageService.set).toHaveBeenCalled();
    });

    it('enable réactive un plugin désactivé', async () => {
        const plugin = makePlugin('to-enable', {
            uninstall: vi.fn(),
        });
        await pm.register(plugin);
        await pm.disable('to-enable');
        plugin.install.mockClear();

        await pm.enable('to-enable');

        expect(pm.isEnabled('to-enable')).toBe(true);
        expect(plugin.install).toHaveBeenCalledOnce();
    });

    it('enable gère une erreur dans install()', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const plugin = makePlugin('enable-fail', {
            uninstall: vi.fn(),
        });
        await pm.register(plugin);
        await pm.disable('enable-fail');

        // Maintenant install va échouer
        plugin.install.mockImplementation(() => {
            throw new Error('fail');
        });

        await pm.enable('enable-fail');

        expect(pm.isEnabled('enable-fail')).toBe(false);

        errorSpy.mockRestore();
    });

    it('disable est no-op si plugin pas installé', async () => {
        StorageService.get.mockResolvedValueOnce(['already-off']);
        pm = new PluginManager();
        await pm.init();

        await pm.register(makePlugin('already-off'));
        StorageService.set.mockClear();

        await pm.disable('already-off');

        // Pas de sauvegarde supplémentaire
        expect(StorageService.set).not.toHaveBeenCalled();
    });

    it('enable est no-op si plugin déjà installé', async () => {
        const plugin = makePlugin('already-on');
        await pm.register(plugin);
        plugin.install.mockClear();

        await pm.enable('already-on');

        expect(plugin.install).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------
// unregister()
// ---------------------------------------------------------------

describe('PluginManager — unregister', () => {
    it('retire un plugin du registre', async () => {
        await pm.register(makePlugin('bye'));
        expect(pm.getPlugin('bye')).toBeDefined();

        await pm.unregister('bye');

        expect(pm.getPlugin('bye')).toBeUndefined();
    });

    it('appelle uninstall si installé', async () => {
        const plugin = makePlugin('bye2', { uninstall: vi.fn() });
        await pm.register(plugin);

        await pm.unregister('bye2');

        expect(plugin.uninstall).toHaveBeenCalledWith(Hooks);
    });

    it('unregister est no-op pour un plugin inconnu', async () => {
        await pm.unregister('nope');
        // Pas d'erreur
    });
});

// ---------------------------------------------------------------
// Error boundary — un uninstall qui plante ne casse pas le flow
// ---------------------------------------------------------------

describe('PluginManager — error boundary uninstall', () => {
    // Un plugin dont uninstall() throw ne doit pas empêcher disable() de terminer
    it('disable continue même si uninstall() throw', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const plugin = makePlugin('crash-disable', {
            uninstall: vi.fn(() => {
                throw new Error('uninstall boom');
            }),
        });
        await pm.register(plugin);

        await pm.disable('crash-disable');

        // Le plugin est quand même désactivé
        expect(pm.isEnabled('crash-disable')).toBe(false);
        expect(errorSpy).toHaveBeenCalled();
        expect(errorSpy.mock.calls[0][0]).toContain('uninstall');
        errorSpy.mockRestore();
    });

    // Un plugin dont uninstall() async rejette ne doit pas empêcher disable()
    it('disable continue même si uninstall() async rejette', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const plugin = makePlugin('crash-disable-async', {
            uninstall: vi.fn().mockRejectedValue(new Error('async uninstall boom')),
        });
        await pm.register(plugin);

        await pm.disable('crash-disable-async');

        expect(pm.isEnabled('crash-disable-async')).toBe(false);
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    // Un plugin dont uninstall() throw ne doit pas empêcher unregister() de terminer
    it('unregister continue même si uninstall() throw', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const plugin = makePlugin('crash-unreg', {
            uninstall: vi.fn(() => {
                throw new Error('unregister boom');
            }),
        });
        await pm.register(plugin);

        await pm.unregister('crash-unreg');

        // Le plugin est quand même retiré du registre
        expect(pm.getPlugin('crash-unreg')).toBeUndefined();
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });
});

// ---------------------------------------------------------------
// _installWithTimeout()
// ---------------------------------------------------------------

describe('PluginManager — timeout async', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('pas de warning si install est sync', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const plugin = makePlugin('sync-fast');

        await pm.register(plugin);

        // Avance au-delà du timeout pour vérifier qu'aucun timer ne traîne
        await vi.advanceTimersByTimeAsync(6000);

        expect(warnSpy).not.toHaveBeenCalled();

        warnSpy.mockRestore();
    });

    it('pas de warning si install async résout rapidement', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const plugin = makePlugin('async-fast', {
            install: vi.fn().mockResolvedValue(undefined),
        });

        await pm.register(plugin);

        // Avance au-delà du timeout
        await vi.advanceTimersByTimeAsync(6000);

        expect(warnSpy).not.toHaveBeenCalled();

        warnSpy.mockRestore();
    });

    it('log un warning si install async dépasse 5s', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        let resolveInstall;
        const plugin = makePlugin('slow-plugin', {
            install: vi.fn(
                () =>
                    new Promise((r) => {
                        resolveInstall = r;
                    }),
            ),
        });

        const registerPromise = pm.register(plugin);

        // Avance juste au seuil de 5s
        await vi.advanceTimersByTimeAsync(5000);

        expect(warnSpy).toHaveBeenCalledOnce();
        expect(warnSpy.mock.calls[0][0]).toContain('slow-plugin');
        expect(warnSpy.mock.calls[0][0]).toContain('5s');

        // Résout pour terminer proprement
        resolveInstall();
        await registerPromise;

        warnSpy.mockRestore();
    });

    it('le timer est nettoyé après résolution rapide (pas de warning tardif)', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        let resolveInstall;
        const plugin = makePlugin('fast-resolve', {
            install: vi.fn(
                () =>
                    new Promise((r) => {
                        resolveInstall = r;
                    }),
            ),
        });

        const registerPromise = pm.register(plugin);

        // Résout après 1s (avant le timeout)
        await vi.advanceTimersByTimeAsync(1000);
        resolveInstall();
        await registerPromise;

        // Avance bien au-delà du timeout
        await vi.advanceTimersByTimeAsync(10000);

        expect(warnSpy).not.toHaveBeenCalled();

        warnSpy.mockRestore();
    });

    it("le timer est nettoyé même en cas d'erreur", async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        let rejectInstall;
        const plugin = makePlugin('fail-plugin', {
            install: vi.fn(
                () =>
                    new Promise((_r, rej) => {
                        rejectInstall = rej;
                    }),
            ),
        });

        const registerPromise = pm.register(plugin);

        // Rejette avant le timeout
        await vi.advanceTimersByTimeAsync(1000);
        rejectInstall(new Error('plugin crashed'));
        await registerPromise;

        // Avance au-delà du timeout
        await vi.advanceTimersByTimeAsync(10000);

        expect(warnSpy).not.toHaveBeenCalled();

        warnSpy.mockRestore();
        errorSpy.mockRestore();
    });

    it('le warning fonctionne aussi via enable()', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Enregistre puis désactive
        let resolveInstall;
        const plugin = makePlugin('slow-enable', {
            uninstall: vi.fn(),
        });
        await pm.register(plugin);
        await pm.disable('slow-enable');

        // Reconfigure install pour être lent
        plugin.install = vi.fn(
            () =>
                new Promise((r) => {
                    resolveInstall = r;
                }),
        );

        const enablePromise = pm.enable('slow-enable');

        await vi.advanceTimersByTimeAsync(5000);

        expect(warnSpy).toHaveBeenCalledOnce();
        expect(warnSpy.mock.calls[0][0]).toContain('slow-enable');

        resolveInstall();
        await enablePromise;

        warnSpy.mockRestore();
    });
});

// ---------------------------------------------------------------
// registerAll() — tri par priorité
// ---------------------------------------------------------------

describe('PluginManager — registerAll', () => {
    it('enregistre les plugins triés par priority croissante', async () => {
        const order = [];
        const track = (name) =>
            makePlugin(name, {
                install: vi.fn(() => {
                    order.push(name);
                }),
            });

        await pm.registerAll([
            { ...track('toast'), priority: 99 },
            { ...track('theme'), priority: 1 },
            { ...track('markdown'), priority: 10 },
        ]);

        expect(order).toEqual(['theme', 'markdown', 'toast']);
    });

    it('défaut 10 pour les plugins sans priority (taxonomy)', async () => {
        const order = [];
        const track = (name) =>
            makePlugin(name, {
                install: vi.fn(() => {
                    order.push(name);
                }),
            });

        await pm.registerAll([
            { ...track('toast'), priority: 99 },
            track('taxonomy'), // pas de priority → défaut 10
            { ...track('theme'), priority: 10 },
        ]);

        // taxonomy (10 implicite) et theme (10 explicite) gardent leur ordre relatif (tri stable)
        expect(order[0]).toBe('taxonomy');
        expect(order[2]).toBe('toast');
    });

    it("priorités identiques conservent l'ordre relatif (tri stable)", async () => {
        const order = [];
        const track = (name) =>
            makePlugin(name, {
                install: vi.fn(() => {
                    order.push(name);
                }),
                priority: 10,
            });

        await pm.registerAll([track('a'), track('b'), track('c')]);

        expect(order).toEqual(['a', 'b', 'c']);
    });

    it('tableau vide ne crash pas', async () => {
        await pm.registerAll([]);

        expect(pm.getAll()).toHaveLength(0);
    });

    it("continue l'enregistrement si un plugin échoue à l'install", async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const order = [];

        await pm.registerAll([
            {
                ...makePlugin('first', {
                    install: vi.fn(() => {
                        order.push('first');
                    }),
                }),
                priority: 1,
            },
            {
                ...makePlugin('broken', {
                    install: vi.fn(() => {
                        throw new Error('boom');
                    }),
                }),
                priority: 5,
            },
            {
                ...makePlugin('last', {
                    install: vi.fn(() => {
                        order.push('last');
                    }),
                }),
                priority: 10,
            },
        ]);

        // Les 3 sont enregistrés, seul broken a échoué
        expect(pm.getAll()).toHaveLength(3);
        expect(pm.isEnabled('first')).toBe(true);
        expect(pm.isEnabled('broken')).toBe(false);
        expect(pm.isEnabled('last')).toBe(true);
        expect(order).toEqual(['first', 'last']);

        errorSpy.mockRestore();
    });

    it('ne mute pas le tableau original', async () => {
        const plugins = [
            { ...makePlugin('c'), priority: 99 },
            { ...makePlugin('a'), priority: 1 },
        ];

        await pm.registerAll(plugins);

        expect(plugins[0].name).toBe('c'); // Pas muté
    });
});

// ---------------------------------------------------------------
// getPlugin() / getAll()
// ---------------------------------------------------------------

describe('PluginManager — accesseurs', () => {
    it("getPlugin retourne l'instance", async () => {
        const plugin = makePlugin('my-plugin');
        await pm.register(plugin);

        expect(pm.getPlugin('my-plugin')).toBe(plugin);
    });

    it('getPlugin retourne undefined pour un plugin inconnu', () => {
        expect(pm.getPlugin('nope')).toBeUndefined();
    });

    it('getAll retourne tous les plugins avec leur état', async () => {
        await pm.register(makePlugin('a'));
        await pm.register(makePlugin('b'));

        const all = pm.getAll();

        expect(all).toHaveLength(2);
        expect(all[0].installed).toBe(true);
        expect(all[1].installed).toBe(true);
    });
});
