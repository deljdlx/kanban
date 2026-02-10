/**
 * Tests unitaires — CardHistory (historique d'une carte).
 *
 * CardHistory encapsule la timeline d'une carte. Deux chemins de construction :
 * - Nouvelle carte (pas de rawEntries) → crée automatiquement l'entrée "created"
 * - Restauration (rawEntries fournis) → reconstruit depuis la persistence
 *
 * Les méthodes record* sont des raccourcis typés (recordMove, recordComment, etc.)
 * qui délèguent à record(). On vérifie que chaque raccourci produit le bon format
 * de changes, et que recordUpdate ignore les diffs vides (pas de pollution historique).
 */
import { describe, it, expect } from 'vitest';
import CardHistory from './CardHistory.js';

// ---------------------------------------------------------------
// Construction — deux chemins : nouvelle carte vs restauration
// ---------------------------------------------------------------

describe('CardHistory — construction', () => {
    it('crée une entrée "created" par défaut si pas de rawEntries', () => {
        const history = new CardHistory();
        const entries = history.getAll();
        expect(entries).toHaveLength(1);
        expect(entries[0].action).toBe('created');
    });

    it("utilise createdAt et authorId pour l'entrée initiale", () => {
        const date = '2025-01-01T00:00:00.000Z';
        const history = new CardHistory(null, date, 'user-1');
        const entries = history.getAll();
        expect(entries[0].date).toBe(date);
        expect(entries[0].userId).toBe('user-1');
    });

    it('restaure depuis des entrées brutes', () => {
        const raw = [
            { action: 'created', date: '2025-01-01T00:00:00.000Z', userId: null, changes: null },
            {
                action: 'updated',
                date: '2025-01-02T00:00:00.000Z',
                userId: 'user-1',
                changes: { title: { from: 'A', to: 'B' } },
            },
        ];
        const history = new CardHistory(raw);
        expect(history.getAll()).toHaveLength(2);
        expect(history.getAll()[1].action).toBe('updated');
    });

    it('ignore rawEntries si tableau vide (crée "created")', () => {
        const history = new CardHistory([]);
        expect(history.getAll()).toHaveLength(1);
        expect(history.getAll()[0].action).toBe('created');
    });
});

// ---------------------------------------------------------------
// record
// ---------------------------------------------------------------

describe('CardHistory — record', () => {
    it('ajoute une entrée générique', () => {
        const history = new CardHistory();
        history.record('custom-action', 'user-1', { foo: 'bar' });
        const entries = history.getAll();
        expect(entries).toHaveLength(2);
        expect(entries[1].action).toBe('custom-action');
        expect(entries[1].userId).toBe('user-1');
        expect(entries[1].changes).toEqual({ foo: 'bar' });
    });

    it('génère une date si non fournie', () => {
        const history = new CardHistory();
        history.record('test', null, null);
        const entry = history.getAll()[1];
        expect(entry.date).toBeTruthy();
        expect(new Date(entry.date).toISOString()).toBe(entry.date);
    });

    it('utilise la date fournie si présente', () => {
        const history = new CardHistory();
        const date = '2025-06-15T10:00:00.000Z';
        history.record('test', null, null, date);
        expect(history.getAll()[1].date).toBe(date);
    });
});

// ---------------------------------------------------------------
// recordUpdate — ne doit rien écrire si le diff est vide
// ---------------------------------------------------------------

describe('CardHistory — recordUpdate', () => {
    it('enregistre un update avec le diff', () => {
        const history = new CardHistory();
        history.recordUpdate({ title: { from: 'A', to: 'B' } }, 'user-1');
        const entries = history.getAll();
        expect(entries).toHaveLength(2);
        expect(entries[1].action).toBe('updated');
        expect(entries[1].changes.title).toEqual({ from: 'A', to: 'B' });
    });

    it("n'enregistre rien si le diff est vide", () => {
        const history = new CardHistory();
        history.recordUpdate({}, 'user-1');
        expect(history.getAll()).toHaveLength(1);
    });
});

// ---------------------------------------------------------------
// recordComment
// ---------------------------------------------------------------

describe('CardHistory — recordComment', () => {
    it('enregistre un commentaire', () => {
        const history = new CardHistory();
        const date = '2025-06-15T10:00:00.000Z';
        history.recordComment('user-1', date);
        const entry = history.getAll()[1];
        expect(entry.action).toBe('commented');
        expect(entry.userId).toBe('user-1');
        expect(entry.date).toBe(date);
    });
});

// ---------------------------------------------------------------
// recordCommentEdit
// ---------------------------------------------------------------

describe('CardHistory — recordCommentEdit', () => {
    it("enregistre l'édition d'un commentaire", () => {
        const history = new CardHistory();
        history.recordCommentEdit('ancien texte', 'nouveau texte', 'user-1');
        const entry = history.getAll()[1];
        expect(entry.action).toBe('comment_edited');
        expect(entry.changes.comment).toEqual({ from: 'ancien texte', to: 'nouveau texte' });
    });
});

// ---------------------------------------------------------------
// recordMove
// ---------------------------------------------------------------

describe('CardHistory — recordMove', () => {
    it('enregistre un déplacement', () => {
        const history = new CardHistory();
        history.recordMove('À faire', 'En cours', 'user-1');
        const entry = history.getAll()[1];
        expect(entry.action).toBe('moved');
        expect(entry.changes.column).toEqual({ from: 'À faire', to: 'En cours' });
    });
});

// ---------------------------------------------------------------
// recordReorder — convertit les index 0-based en positions 1-based pour l'affichage
// ---------------------------------------------------------------

describe('CardHistory — recordReorder', () => {
    it('enregistre un réordonnancement (positions 1-based)', () => {
        const history = new CardHistory();
        history.recordReorder('À faire', 0, 2, 'user-1');
        const entry = history.getAll()[1];
        expect(entry.action).toBe('reordered');
        expect(entry.changes.position).toEqual({ from: 1, to: 3 });
        expect(entry.changes.column).toEqual({ from: 'À faire', to: 'À faire' });
    });
});

// ---------------------------------------------------------------
// getAll — copie défensive, empêche la mutation externe du tableau
// ---------------------------------------------------------------

describe('CardHistory — getAll', () => {
    it('retourne une copie (pas la référence interne)', () => {
        const history = new CardHistory();
        const entries1 = history.getAll();
        entries1.push('junk');
        expect(history.getAll()).toHaveLength(1);
    });
});

// ---------------------------------------------------------------
// toJSON
// ---------------------------------------------------------------

describe('CardHistory — toJSON', () => {
    it('sérialise toutes les entrées', () => {
        const history = new CardHistory(null, '2025-01-01T00:00:00.000Z', 'user-1');
        history.record('updated', 'user-1', { title: { from: 'A', to: 'B' } });
        const json = history.toJSON();
        expect(json).toHaveLength(2);
        expect(json[0].action).toBe('created');
        expect(json[1].action).toBe('updated');
    });

    it('est compatible avec le constructeur (round-trip)', () => {
        const history = new CardHistory(null, '2025-01-01T00:00:00.000Z', 'user-1');
        history.recordMove('A', 'B', 'user-2');
        const json = history.toJSON();
        const restored = new CardHistory(json);
        expect(restored.getAll()).toHaveLength(2);
        expect(restored.getAll()[0].action).toBe('created');
        expect(restored.getAll()[1].action).toBe('moved');
    });
});
