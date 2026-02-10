/**
 * Tests unitaires — CardLinksPlugin.
 *
 * Le plugin exporte un objet literal. Pour isoler l'état entre tests,
 * chaque beforeEach crée un clone frais via Object.create() et reset
 * les propriétés mutables.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import pluginProto from './CardLinksPlugin.js';

// Mock Application (import statique dans le plugin)
vi.mock('../../../Application.js', () => ({ default: { instance: null } }));

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

/** @type {ReturnType<typeof makePlugin>} */
let plugin;

/**
 * Crée un clone frais du plugin avec état reset.
 */
function makePlugin() {
    const p = Object.create(pluginProto);
    p._board = null;
    p._linksMap = {};
    p._boardObserver = null;
    p._registeredHooks = [];
    return p;
}

/**
 * Crée un mock de board minimal.
 *
 * @param {Object} pluginData - Données plugin du board
 * @param {Array<{ id: string, title?: string, type?: string }>} cards - Cartes du board
 * @returns {Object} Board mocké
 */
function makeBoard(pluginData = {}, cards = []) {
    const columns = [
        {
            cards: cards.map((c) => ({
                id: c.id,
                title: c.title || `Carte ${c.id}`,
                type: c.type || 'standard',
            })),
        },
    ];

    const _pluginData = { ...pluginData };

    return {
        pluginData: { ...pluginData },
        pluginDataRef: _pluginData,
        setPluginData: vi.fn((key, value) => {
            _pluginData[key] = value;
        }),
        emit: vi.fn(),
        columns,
        getCardById(id) {
            for (const col of columns) {
                const card = col.cards.find((c) => c.id === id);
                if (card) return { card, column: col };
            }
            return null;
        },
    };
}

/**
 * Crée un élément DOM .card[data-id].
 *
 * @param {string} id
 * @returns {HTMLElement}
 */
function makeCardEl(id) {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.id = id;
    return el;
}

/**
 * Crée et injecte un élément .card[data-id] dans le body.
 *
 * @param {string} id
 * @returns {HTMLElement}
 */
function injectCardEl(id) {
    const el = makeCardEl(id);
    document.body.appendChild(el);
    return el;
}

// ---------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------

beforeEach(() => {
    plugin = makePlugin();
});

afterEach(() => {
    document.body.innerHTML = '';
});

// ---------------------------------------------------------------
// 1. Gestion des liens — symétrie
// ---------------------------------------------------------------

describe('CardLinksPlugin — gestion des liens', () => {
    beforeEach(() => {
        plugin._board = makeBoard();
    });

    it('_addLink crée le lien A→B et B→A', () => {
        plugin._addLink('a', 'b');

        expect(plugin._linksMap['a']).toContain('b');
        expect(plugin._linksMap['b']).toContain('a');
    });

    it('_addLink ignore un self-link (A→A)', () => {
        plugin._addLink('a', 'a');

        expect(plugin._linksMap['a']).toBeUndefined();
    });

    it('_addLink ignore un doublon', () => {
        plugin._addLink('a', 'b');
        plugin._addLink('a', 'b');

        expect(plugin._linksMap['a']).toEqual(['b']);
        expect(plugin._linksMap['b']).toEqual(['a']);
    });

    it('_addLink appelle _saveLinks (setPluginData)', () => {
        plugin._addLink('a', 'b');

        expect(plugin._board.setPluginData).toHaveBeenCalledOnce();
        expect(plugin._board.setPluginData).toHaveBeenCalledWith(
            'card-links',
            expect.objectContaining({ a: ['b'], b: ['a'] }),
        );
    });

    it('_removeLink retire le lien dans les deux sens', () => {
        plugin._addLink('a', 'b');
        plugin._removeLink('a', 'b');

        expect(plugin._linksMap['a']).toBeUndefined();
        expect(plugin._linksMap['b']).toBeUndefined();
    });

    it("_removeLink supprime l'entrée si array vide après retrait", () => {
        plugin._addLink('a', 'b');
        plugin._addLink('a', 'c');
        plugin._removeLink('a', 'b');

        // a a encore le lien vers c
        expect(plugin._linksMap['a']).toEqual(['c']);
        // b n'a plus de liens → entrée supprimée
        expect(plugin._linksMap['b']).toBeUndefined();
    });

    it("_removeLink est no-op si le lien n'existe pas", () => {
        plugin._board.setPluginData.mockClear();
        plugin._removeLink('x', 'y');

        // _saveLinks est quand même appelé, mais pas d'erreur
        expect(plugin._board.setPluginData).toHaveBeenCalledOnce();
    });

    it('_getLinks retourne [] si cardId inconnu', () => {
        expect(plugin._getLinks('inexistant')).toEqual([]);
    });
});

// ---------------------------------------------------------------
// 2. Cleanup cascade
// ---------------------------------------------------------------

describe('CardLinksPlugin — cleanup cascade', () => {
    beforeEach(() => {
        plugin._board = makeBoard();
    });

    it('_cleanupCardLinks retire cardId de toutes les cartes liées', () => {
        plugin._addLink('x', 'a');
        plugin._addLink('x', 'b');
        plugin._board.emit.mockClear();

        plugin._cleanupCardLinks('x');

        expect(plugin._linksMap['a']).toBeUndefined();
        expect(plugin._linksMap['b']).toBeUndefined();
    });

    it("_cleanupCardLinks supprime l'entrée de la carte elle-même", () => {
        plugin._addLink('x', 'a');
        plugin._board.emit.mockClear();

        plugin._cleanupCardLinks('x');

        expect(plugin._linksMap['x']).toBeUndefined();
    });

    it('_cleanupCardLinks est no-op si aucun lien', () => {
        plugin._board.emit.mockClear();

        plugin._cleanupCardLinks('solo');

        // Pas de save si pas de liens
        expect(plugin._board.emit).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------
// 3. Purge orphelins batch
// ---------------------------------------------------------------

describe('CardLinksPlugin — purge orphelins', () => {
    it('_renderLinksList purge les liens vers cartes inexistantes', () => {
        const board = makeBoard({}, [{ id: 'a' }, { id: 'b' }]);
        plugin._board = board;

        // Lien a→b (valide) + a→ghost (orphelin)
        plugin._linksMap = { a: ['b', 'ghost'], b: ['a'], ghost: ['a'] };

        const container = document.createElement('div');
        plugin._renderLinksList(container, 'a');

        // ghost a été purgé
        expect(plugin._linksMap['a']).toEqual(['b']);
        expect(plugin._linksMap['ghost']).toBeUndefined();
    });

    it('purge batch = 1 seul setPluginData, pas N', () => {
        const board = makeBoard({}, [{ id: 'a' }]);
        plugin._board = board;

        // Deux orphelins
        plugin._linksMap = { a: ['ghost1', 'ghost2'], ghost1: ['a'], ghost2: ['a'] };

        const container = document.createElement('div');
        plugin._renderLinksList(container, 'a');

        // Un seul setPluginData pour tout le batch
        expect(board.setPluginData).toHaveBeenCalledTimes(1);
    });

    it('après purge, seuls les liens valides sont affichés', () => {
        const board = makeBoard({}, [{ id: 'a' }, { id: 'b' }]);
        plugin._board = board;

        plugin._linksMap = { a: ['b', 'ghost'], b: ['a'], ghost: ['a'] };

        const container = document.createElement('div');
        plugin._renderLinksList(container, 'a');

        // Un seul item affiché (b), pas ghost
        const items = container.querySelectorAll('.clp-link-item');
        expect(items.length).toBe(1);
        expect(items[0].querySelector('span').textContent).toBe('Carte b');
    });
});

// ---------------------------------------------------------------
// 4. Badge DOM
// ---------------------------------------------------------------

describe('CardLinksPlugin — badge DOM', () => {
    it('_updateBadge crée .clp-badge avec texte "🔗 N"', () => {
        const el = makeCardEl('a');

        plugin._updateBadge(el, 3);

        const badge = el.querySelector('.clp-badge');
        expect(badge).not.toBeNull();
        expect(badge.textContent).toBe('🔗 3');
    });

    it('_updateBadge met à jour un badge existant', () => {
        const el = makeCardEl('a');
        plugin._updateBadge(el, 1);
        plugin._updateBadge(el, 5);

        const badges = el.querySelectorAll('.clp-badge');
        expect(badges.length).toBe(1);
        expect(badges[0].textContent).toBe('🔗 5');
    });

    it('_updateBadge supprime le badge si count = 0', () => {
        const el = makeCardEl('a');
        plugin._updateBadge(el, 2);
        plugin._updateBadge(el, 0);

        expect(el.querySelector('.clp-badge')).toBeNull();
    });

    it('_refreshBadges met à jour tous les badges visibles', () => {
        plugin._board = makeBoard();
        plugin._linksMap = { a: ['b'], b: ['a'] };

        const elA = injectCardEl('a');
        const elB = injectCardEl('b');
        const elC = injectCardEl('c');

        plugin._refreshBadges();

        expect(elA.querySelector('.clp-badge').textContent).toBe('🔗 1');
        expect(elB.querySelector('.clp-badge').textContent).toBe('🔗 1');
        expect(elC.querySelector('.clp-badge')).toBeNull();
    });
});

// ---------------------------------------------------------------
// 5. Hover / Highlight
// ---------------------------------------------------------------

describe('CardLinksPlugin — hover / highlight', () => {
    it('_highlightLinkedCards(id, true) ajoute .clp-highlight aux cartes liées', () => {
        plugin._linksMap = { a: ['b', 'c'] };

        injectCardEl('a');
        const elB = injectCardEl('b');
        const elC = injectCardEl('c');

        plugin._highlightLinkedCards('a', true);

        expect(elB.classList.contains('clp-highlight')).toBe(true);
        expect(elC.classList.contains('clp-highlight')).toBe(true);
    });

    it('_highlightLinkedCards(id, false) retire .clp-highlight', () => {
        plugin._linksMap = { a: ['b'] };

        injectCardEl('a');
        const elB = injectCardEl('b');
        elB.classList.add('clp-highlight');

        plugin._highlightLinkedCards('a', false);

        expect(elB.classList.contains('clp-highlight')).toBe(false);
    });

    it('_setupHoverHandlers ne duplique pas (flag _clpHover)', () => {
        const el = makeCardEl('a');
        const addSpy = vi.spyOn(el, 'addEventListener');

        plugin._setupHoverHandlers(el, 'a');
        plugin._setupHoverHandlers(el, 'a');

        // mouseenter + mouseleave = 2 appels, pas 4
        expect(addSpy).toHaveBeenCalledTimes(2);
        expect(el._clpHover).toBe(true);
    });
});

// ---------------------------------------------------------------
// 6. Lifecycle
// ---------------------------------------------------------------

describe('CardLinksPlugin — lifecycle', () => {
    /**
     * Crée un mock HookRegistry minimal.
     */
    function makeHooks() {
        return {
            addAction: vi.fn(),
            removeAction: vi.fn(),
        };
    }

    it('install enregistre 5 hooks via _listen', () => {
        const hooks = makeHooks();
        plugin.install(hooks);

        expect(hooks.addAction).toHaveBeenCalledTimes(5);

        const hookNames = hooks.addAction.mock.calls.map((c) => c[0]);
        expect(hookNames).toContain('board:didChange');
        expect(hookNames).toContain('board:willChange');
        expect(hookNames).toContain('board:rendered');
        expect(hookNames).toContain('modal:editCard:opened');
        expect(hookNames).toContain('card:deleted');
    });

    it('uninstall retire tous les hooks enregistrés', () => {
        const hooks = makeHooks();
        plugin.install(hooks);

        plugin.uninstall(hooks);

        expect(hooks.removeAction).toHaveBeenCalledTimes(5);
        expect(plugin._registeredHooks).toEqual([]);
        expect(plugin._board).toBeNull();
    });

    it('_onBoardWillChange reset _linksMap, déconnecte observer, retire badges/highlights DOM', () => {
        // Setup : un observer actif, des badges et highlights dans le DOM
        const mockObserver = { disconnect: vi.fn() };
        plugin._boardObserver = mockObserver;
        plugin._linksMap = { a: ['b'] };

        const el = injectCardEl('a');
        const badge = document.createElement('div');
        badge.className = 'clp-badge';
        el.appendChild(badge);
        el.classList.add('clp-highlight');

        plugin._onBoardWillChange();

        expect(mockObserver.disconnect).toHaveBeenCalledOnce();
        expect(plugin._boardObserver).toBeNull();
        expect(plugin._linksMap).toEqual({});
        expect(document.querySelector('.clp-badge')).toBeNull();
        expect(el.classList.contains('clp-highlight')).toBe(false);
    });

    it('_onBoardDidChange charge le board et le linksMap', () => {
        const board = makeBoard({ 'card-links': { a: ['b'], b: ['a'] } });

        plugin._onBoardDidChange(board);

        expect(plugin._board).toBe(board);
        expect(plugin._linksMap).toEqual({ a: ['b'], b: ['a'] });
    });
});
