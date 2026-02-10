/**
 * Tests unitaires — HookRegistry (actions, filters, contextes).
 *
 * Crée une instance fraîche à chaque test (pas le singleton) pour l'isolation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HookRegistry } from './HookRegistry.js';

/** @type {HookRegistry} */
let hooks;

beforeEach(() => {
    hooks = new HookRegistry();
});

// ---------------------------------------------------------------
// Déclaration de hooks
// ---------------------------------------------------------------

describe('HookRegistry — registerHook', () => {
    it('enregistre un hook sans métadonnées', () => {
        hooks.registerHook('test:hook');
        expect(hooks.getHookMeta('test:hook')).toEqual({});
    });

    it('enregistre un hook avec métadonnées', () => {
        hooks.registerHook('test:hook', { label: 'Test', category: 'Divers' });
        expect(hooks.getHookMeta('test:hook')).toEqual({ label: 'Test', category: 'Divers' });
    });

    it('getHookMeta retourne null pour un hook inconnu', () => {
        expect(hooks.getHookMeta('nope')).toBeNull();
    });

    it('getRegisteredHooks retourne une copie', () => {
        hooks.registerHook('a');
        hooks.registerHook('b');
        const map = hooks.getRegisteredHooks();
        expect(map.size).toBe(2);
        map.delete('a');
        // L'original n'est pas affecté
        expect(hooks.getHookMeta('a')).toEqual({});
    });
});

// ---------------------------------------------------------------
// Actions
// ---------------------------------------------------------------

describe('HookRegistry — actions', () => {
    it('addAction + doAction appelle le callback', () => {
        hooks.registerHook('test:action');
        const spy = vi.fn();
        hooks.addAction('test:action', spy);
        hooks.doAction('test:action', { data: 42 });

        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith({ data: 42 });
    });

    it('doAction sans listeners ne crash pas', () => {
        hooks.registerHook('test:noop');
        hooks.doAction('test:noop', 'anything');
        // Pas d'erreur
    });

    it("doAction appelle les callbacks dans l'ordre de priorité", () => {
        hooks.registerHook('test:order');
        const order = [];

        hooks.addAction('test:order', () => order.push('C'), 30);
        hooks.addAction('test:order', () => order.push('A'), 1);
        hooks.addAction('test:order', () => order.push('B'), 10);

        hooks.doAction('test:order');
        expect(order).toEqual(['A', 'B', 'C']);
    });

    it('removeAction retire un callback spécifique', () => {
        hooks.registerHook('test:rm');
        const spy1 = vi.fn();
        const spy2 = vi.fn();

        hooks.addAction('test:rm', spy1);
        hooks.addAction('test:rm', spy2);
        hooks.removeAction('test:rm', spy1);
        hooks.doAction('test:rm');

        expect(spy1).not.toHaveBeenCalled();
        expect(spy2).toHaveBeenCalledOnce();
    });

    it('removeAction sur un hook inexistant ne crash pas', () => {
        hooks.removeAction('nope', () => {});
    });

    it('doAction passe plusieurs arguments', () => {
        hooks.registerHook('test:args');
        const spy = vi.fn();
        hooks.addAction('test:args', spy);
        hooks.doAction('test:args', 'a', 'b', 'c');
        expect(spy).toHaveBeenCalledWith('a', 'b', 'c');
    });
});

// ---------------------------------------------------------------
// Filters
// ---------------------------------------------------------------

describe('HookRegistry — filters', () => {
    it('applyFilters retourne la valeur transformée', () => {
        hooks.registerHook('test:filter');
        hooks.addFilter('test:filter', (val) => val + 1);
        hooks.addFilter('test:filter', (val) => val * 2);

        // Pipeline: 5 → +1 → 6 → *2 → 12
        expect(hooks.applyFilters('test:filter', 5)).toBe(12);
    });

    it('applyFilters sans callbacks retourne la valeur initiale', () => {
        hooks.registerHook('test:noop');
        expect(hooks.applyFilters('test:noop', 'hello')).toBe('hello');
    });

    it("applyFilters respecte l'ordre de priorité", () => {
        hooks.registerHook('test:prio');
        hooks.addFilter('test:prio', (val) => val + '-late', 20);
        hooks.addFilter('test:prio', (val) => val + '-early', 1);

        expect(hooks.applyFilters('test:prio', 'start')).toBe('start-early-late');
    });

    it('removeFilter retire un callback', () => {
        hooks.registerHook('test:rmf');
        const double = (val) => val * 2;
        hooks.addFilter('test:rmf', double);
        hooks.removeFilter('test:rmf', double);

        expect(hooks.applyFilters('test:rmf', 5)).toBe(5);
    });

    it('applyFilters passe les arguments supplémentaires', () => {
        hooks.registerHook('test:extra');
        hooks.addFilter('test:extra', (val, ctx) => val + ctx.bonus);
        expect(hooks.applyFilters('test:extra', 10, { bonus: 5 })).toBe(15);
    });
});

// ---------------------------------------------------------------
// Error boundary — un callback qui plante ne casse pas les autres
// ---------------------------------------------------------------

describe('HookRegistry — error boundary', () => {
    // Un callback d'action qui throw ne doit pas empêcher les callbacks suivants
    it("doAction : un callback qui throw n'empêche pas les suivants", () => {
        hooks.registerHook('test:crash');
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const order = [];

        hooks.addAction('test:crash', () => order.push('A'), 1);
        hooks.addAction(
            'test:crash',
            () => {
                throw new Error('boom');
            },
            5,
        );
        hooks.addAction('test:crash', () => order.push('C'), 10);

        hooks.doAction('test:crash');

        expect(order).toEqual(['A', 'C']);
        expect(errorSpy).toHaveBeenCalledOnce();
        expect(errorSpy.mock.calls[0][0]).toContain('a planté');
        errorSpy.mockRestore();
    });

    // Un callback de filtre qui throw ne doit pas interrompre le pipeline,
    // la valeur courante est conservée et passée au callback suivant
    it('applyFilters : un callback qui throw conserve la valeur courante', () => {
        hooks.registerHook('test:fcrash');
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        hooks.addFilter('test:fcrash', (val) => val + 1, 1); // 5 → 6
        hooks.addFilter(
            'test:fcrash',
            () => {
                throw new Error('boom');
            },
            5,
        ); // crash → garde 6
        hooks.addFilter('test:fcrash', (val) => val * 10, 10); // 6 → 60

        const result = hooks.applyFilters('test:fcrash', 5);

        expect(result).toBe(60);
        expect(errorSpy).toHaveBeenCalledOnce();
        expect(errorSpy.mock.calls[0][0]).toContain('valeur courante est conservée');
        errorSpy.mockRestore();
    });

    // Vérifie que la profondeur est correctement décrémentée même en cas de throw
    it('doAction : la profondeur est correcte après un throw', () => {
        hooks.registerHook('test:depth-crash');
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        hooks.addAction('test:depth-crash', () => {
            throw new Error('boom');
        });
        hooks.doAction('test:depth-crash');

        // Un appel suivant doit fonctionner normalement (profondeur à 0)
        const spy = vi.fn();
        hooks.registerHook('test:after');
        hooks.addAction('test:after', spy);
        hooks.doAction('test:after');
        expect(spy).toHaveBeenCalledOnce();

        errorSpy.mockRestore();
    });
});

// ---------------------------------------------------------------
// Récursion
// ---------------------------------------------------------------

describe('HookRegistry — protection récursion', () => {
    it('coupe la chaîne après maxDepth et log une erreur', () => {
        hooks.registerHook('test:loop');
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        hooks.addAction('test:loop', () => {
            hooks.doAction('test:loop');
        });

        hooks.doAction('test:loop');

        expect(errorSpy).toHaveBeenCalled();
        const msg = errorSpy.mock.calls[0][0].message;
        expect(msg).toContain('récursion infinie');
        errorSpy.mockRestore();
    });

    it('la profondeur revient à 0 après un appel normal', () => {
        hooks.registerHook('test:depth');
        hooks.addAction('test:depth', () => {});
        hooks.doAction('test:depth');

        // On peut encore appeler normalement
        const spy = vi.fn();
        hooks.addAction('test:depth', spy);
        hooks.doAction('test:depth');
        expect(spy).toHaveBeenCalledOnce();
    });

    it('applyFilters aussi protégé contre la récursion', () => {
        hooks.registerHook('test:floop');
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        hooks.addFilter('test:floop', (val) => hooks.applyFilters('test:floop', val));
        const result = hooks.applyFilters('test:floop', 42);

        expect(errorSpy).toHaveBeenCalled();
        expect(result).toBe(42); // Retourne la valeur initiale en cas de récursion
        errorSpy.mockRestore();
    });
});

// ---------------------------------------------------------------
// Contexte d'exécution
// ---------------------------------------------------------------

describe('HookRegistry — contexte', () => {
    it('getContext est null par défaut', () => {
        expect(hooks.getContext()).toBeNull();
    });

    it("withContext change le contexte pendant l'exécution", () => {
        let captured = null;
        hooks.withContext('automation', () => {
            captured = hooks.getContext();
        });
        expect(captured).toBe('automation');
        expect(hooks.getContext()).toBeNull(); // Restauré
    });

    it("withContext restaure même en cas d'erreur", () => {
        try {
            hooks.withContext('sync', () => {
                throw new Error('oops');
            });
        } catch {
            // Attendu
        }
        expect(hooks.getContext()).toBeNull();
    });

    it("withContext supporte l'imbrication", () => {
        const contexts = [];
        hooks.withContext('automation', () => {
            contexts.push(hooks.getContext());
            hooks.withContext('sync', () => {
                contexts.push(hooks.getContext());
            });
            contexts.push(hooks.getContext());
        });
        expect(contexts).toEqual(['automation', 'sync', 'automation']);
    });

    it('withContext retourne la valeur de fn', () => {
        const result = hooks.withContext('test', () => 42);
        expect(result).toBe(42);
    });
});
