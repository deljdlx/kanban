/**
 * Tests unitaires — PluginAssembler.
 *
 * Vérifie que assemblePlugin() copie correctement les métadonnées
 * du manifest sur l'objet plugin, y compris le champ priority.
 */
import { describe, it, expect } from 'vitest';
import { assemblePlugin } from './PluginAssembler.js';

/**
 * Crée un manifest minimal valide.
 *
 * @param {Object} [overrides] - Champs à surcharger
 * @returns {Object}
 */
function makeManifest(overrides = {}) {
    return { name: 'test-plugin', label: 'Test Plugin', ...overrides };
}

// ---------------------------------------------------------------
// Métadonnées de base
// ---------------------------------------------------------------

describe('assemblePlugin — métadonnées', () => {
    it('copie name et label du manifest', () => {
        const plugin = {};
        assemblePlugin(makeManifest(), plugin);

        expect(plugin.name).toBe('test-plugin');
        expect(plugin.label).toBe('Test Plugin');
    });

    it('description vide par défaut', () => {
        const plugin = {};
        assemblePlugin(makeManifest(), plugin);

        expect(plugin.description).toBe('');
    });

    it('copie description si présente', () => {
        const plugin = {};
        assemblePlugin(makeManifest({ description: 'Un super plugin' }), plugin);

        expect(plugin.description).toBe('Un super plugin');
    });

    it('tags vide par défaut', () => {
        const plugin = {};
        assemblePlugin(makeManifest(), plugin);

        expect(plugin.tags).toEqual([]);
    });

    it('copie hooks si présents', () => {
        const hooks = { provides: ['test:hook'], listens: ['card:created'] };
        const plugin = {};
        assemblePlugin(makeManifest({ hooks }), plugin);

        expect(plugin.hooks).toEqual(hooks);
    });
});

// ---------------------------------------------------------------
// Priorité
// ---------------------------------------------------------------

describe('assemblePlugin — priority', () => {
    it('copie priority du manifest', () => {
        const plugin = {};
        assemblePlugin(makeManifest({ priority: 5 }), plugin);

        expect(plugin.priority).toBe(5);
    });

    it('priority vaut 10 par défaut si absent du manifest', () => {
        const plugin = {};
        assemblePlugin(makeManifest(), plugin);

        expect(plugin.priority).toBe(10);
    });

    it('priority 0 est respecté (pas confondu avec falsy)', () => {
        const plugin = {};
        assemblePlugin(makeManifest({ priority: 0 }), plugin);

        expect(plugin.priority).toBe(0);
    });

    it('priority 99 pour les plugins de fin de chaîne', () => {
        const plugin = {};
        assemblePlugin(makeManifest({ priority: 99 }), plugin);

        expect(plugin.priority).toBe(99);
    });
});

// ---------------------------------------------------------------
// Modules optionnels
// ---------------------------------------------------------------

describe('assemblePlugin — modules', () => {
    it('câble _injectStyles si styles fourni', () => {
        const plugin = {};
        assemblePlugin(makeManifest(), plugin, { styles: '.test { color: red; }' });

        expect(typeof plugin._injectStyles).toBe('function');
    });

    it('câble settingsPanel si fourni', () => {
        const plugin = {};
        const buildPanel = () => {};
        assemblePlugin(makeManifest(), plugin, { settingsPanel: buildPanel });

        expect(typeof plugin.settingsPanel).toBe('function');
    });

    it("retourne l'objet plugin", () => {
        const plugin = {};
        const result = assemblePlugin(makeManifest(), plugin);

        expect(result).toBe(plugin);
    });
});
