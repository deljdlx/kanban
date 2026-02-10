/**
 * Tests unitaires — HistoryEntry (entrée d'historique).
 *
 * HistoryEntry est un value object totalement immuable.
 * On vérifie que les valeurs par défaut (date auto-générée, userId/changes null)
 * sont correctes et que toJSON produit un objet reconstituable par le constructeur.
 */
import { describe, it, expect } from 'vitest';
import HistoryEntry from './HistoryEntry.js';

// ---------------------------------------------------------------
// Construction — action obligatoire, date/userId/changes optionnels
// ---------------------------------------------------------------

describe('HistoryEntry — construction', () => {
    it("stocke l'action", () => {
        const entry = new HistoryEntry({ action: 'created' });
        expect(entry.action).toBe('created');
    });

    it('génère une date si absente', () => {
        const entry = new HistoryEntry({ action: 'created' });
        expect(entry.date).toBeTruthy();
        expect(new Date(entry.date).toISOString()).toBe(entry.date);
    });

    it('préserve la date si fournie', () => {
        const date = '2025-01-01T00:00:00.000Z';
        const entry = new HistoryEntry({ action: 'created', date });
        expect(entry.date).toBe(date);
    });

    it('userId null par défaut', () => {
        const entry = new HistoryEntry({ action: 'created' });
        expect(entry.userId).toBeNull();
    });

    it('stocke le userId', () => {
        const entry = new HistoryEntry({ action: 'created', userId: 'user-1' });
        expect(entry.userId).toBe('user-1');
    });

    it('changes null par défaut', () => {
        const entry = new HistoryEntry({ action: 'created' });
        expect(entry.changes).toBeNull();
    });

    it('stocke les changes', () => {
        const changes = { title: { from: 'A', to: 'B' } };
        const entry = new HistoryEntry({ action: 'updated', changes });
        expect(entry.changes).toEqual(changes);
    });
});

// ---------------------------------------------------------------
// toJSON — round-trip garanti pour la persistence IndexedDB
// ---------------------------------------------------------------

describe('HistoryEntry — toJSON', () => {
    it('sérialise toutes les propriétés', () => {
        const entry = new HistoryEntry({
            action: 'moved',
            date: '2025-01-01T00:00:00.000Z',
            userId: 'user-1',
            changes: { column: { from: 'A', to: 'B' } },
        });
        expect(entry.toJSON()).toEqual({
            action: 'moved',
            date: '2025-01-01T00:00:00.000Z',
            userId: 'user-1',
            changes: { column: { from: 'A', to: 'B' } },
        });
    });

    it('sérialise avec null pour les champs absents', () => {
        const entry = new HistoryEntry({ action: 'created' });
        const json = entry.toJSON();
        expect(json.userId).toBeNull();
        expect(json.changes).toBeNull();
    });

    it('est compatible avec le constructeur (round-trip)', () => {
        const original = new HistoryEntry({
            action: 'updated',
            date: '2025-06-15T10:00:00.000Z',
            userId: 'user-2',
            changes: { title: { from: 'X', to: 'Y' } },
        });
        const restored = new HistoryEntry(original.toJSON());
        expect(restored.action).toBe(original.action);
        expect(restored.date).toBe(original.date);
        expect(restored.userId).toBe(original.userId);
        expect(restored.changes).toEqual(original.changes);
    });
});
