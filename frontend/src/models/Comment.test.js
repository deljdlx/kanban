/**
 * Tests unitaires — Comment (modèle de commentaire).
 *
 * Comment est une entité immuable (id, date, authorId figés à la construction)
 * sauf le texte (updateText). Le champ `files` a été ajouté pour les fichiers
 * joints aux commentaires — on vérifie la backward-compatibility (anciens
 * commentaires sans files → []) et les copies défensives (le getter et toJSON
 * ne doivent pas exposer de référence mutable vers l'état interne).
 */
import { describe, it, expect } from 'vitest';
import Comment from './Comment.js';

// ---------------------------------------------------------------
// Helper
// ---------------------------------------------------------------

function makeComment(overrides = {}) {
    return new Comment({
        text: 'Un commentaire',
        authorId: 'user-1',
        ...overrides,
    });
}

// ---------------------------------------------------------------
// Construction — id et date auto-générés, authorId optionnel
// ---------------------------------------------------------------

describe('Comment — construction', () => {
    it('stocke les propriétés de base', () => {
        const comment = makeComment();
        expect(comment.text).toBe('Un commentaire');
        expect(comment.authorId).toBe('user-1');
    });

    it('génère un id si absent', () => {
        const comment = makeComment();
        expect(comment.id).toBeTruthy();
        expect(comment.id).toMatch(/^comment-/);
    });

    it("préserve l'id si fourni", () => {
        const comment = makeComment({ id: 'comment-custom' });
        expect(comment.id).toBe('comment-custom');
    });

    it('génère une date si absente', () => {
        const comment = makeComment();
        expect(comment.date).toBeTruthy();
        expect(new Date(comment.date).toISOString()).toBe(comment.date);
    });

    it('préserve la date si fournie', () => {
        const date = '2025-01-01T00:00:00.000Z';
        const comment = makeComment({ date });
        expect(comment.date).toBe(date);
    });

    it('authorId null par défaut', () => {
        const comment = new Comment({ text: 'test' });
        expect(comment.authorId).toBeNull();
    });
});

// ---------------------------------------------------------------
// Fichiers joints — backward-compat (null → []) et isolation mémoire
// ---------------------------------------------------------------

describe('Comment — files', () => {
    const sampleFiles = [
        { id: 'file-1', name: 'doc.pdf', size: 1024, mimeType: 'application/pdf' },
        { id: 'file-2', name: 'image.png', size: 2048, mimeType: 'image/png' },
    ];

    it('initialise files à [] si absent (backward-compatible)', () => {
        const comment = makeComment();
        expect(comment.files).toEqual([]);
    });

    it('initialise files à [] si null', () => {
        const comment = makeComment({ files: null });
        expect(comment.files).toEqual([]);
    });

    it('initialise files à [] si non-tableau', () => {
        const comment = makeComment({ files: 'not-an-array' });
        expect(comment.files).toEqual([]);
    });

    it('accepte un tableau de fichiers', () => {
        const comment = makeComment({ files: sampleFiles });
        expect(comment.files).toHaveLength(2);
        expect(comment.files[0].id).toBe('file-1');
        expect(comment.files[1].name).toBe('image.png');
    });

    it('retourne une copie défensive (pas de mutation)', () => {
        const comment = makeComment({ files: sampleFiles });
        const files1 = comment.files;
        files1[0].name = 'HACKED';
        const files2 = comment.files;
        expect(files2[0].name).toBe('doc.pdf');
    });

    it("ne partage pas la référence avec les données d'entrée", () => {
        const input = [{ id: 'f-1', name: 'a.txt', size: 100, mimeType: 'text/plain' }];
        const comment = makeComment({ files: input });
        input[0].name = 'HACKED';
        expect(comment.files[0].name).toBe('a.txt');
    });
});

// ---------------------------------------------------------------
// updateText — seul champ mutable, id et date ne doivent pas bouger
// ---------------------------------------------------------------

describe('Comment — updateText', () => {
    it('modifie le texte', () => {
        const comment = makeComment();
        comment.updateText('Texte modifié');
        expect(comment.text).toBe('Texte modifié');
    });

    it("ne change pas l'id ni la date", () => {
        const comment = makeComment({ id: 'comment-x', date: '2025-01-01T00:00:00.000Z' });
        comment.updateText('Nouveau');
        expect(comment.id).toBe('comment-x');
        expect(comment.date).toBe('2025-01-01T00:00:00.000Z');
    });
});

// ---------------------------------------------------------------
// toJSON — sérialisation IndexedDB, round-trip avec le constructeur
// ---------------------------------------------------------------

describe('Comment — toJSON', () => {
    it('sérialise toutes les propriétés', () => {
        const comment = makeComment({
            id: 'comment-1',
            date: '2025-01-01T00:00:00.000Z',
            files: [{ id: 'f-1', name: 'a.txt', size: 100, mimeType: 'text/plain' }],
        });
        const json = comment.toJSON();
        expect(json).toEqual({
            id: 'comment-1',
            text: 'Un commentaire',
            authorId: 'user-1',
            date: '2025-01-01T00:00:00.000Z',
            files: [{ id: 'f-1', name: 'a.txt', size: 100, mimeType: 'text/plain' }],
        });
    });

    it('retourne files [] si aucun fichier', () => {
        const json = makeComment().toJSON();
        expect(json.files).toEqual([]);
    });

    it('retourne une copie défensive des fichiers', () => {
        const comment = makeComment({
            files: [{ id: 'f-1', name: 'a.txt', size: 100, mimeType: 'text/plain' }],
        });
        const json = comment.toJSON();
        json.files[0].name = 'HACKED';
        expect(comment.files[0].name).toBe('a.txt');
    });

    it('est compatible avec le constructeur (round-trip)', () => {
        const original = makeComment({
            id: 'comment-rt',
            date: '2025-06-15T10:00:00.000Z',
            files: [{ id: 'f-1', name: 'a.txt', size: 100, mimeType: 'text/plain' }],
        });
        const restored = new Comment(original.toJSON());
        expect(restored.id).toBe(original.id);
        expect(restored.text).toBe(original.text);
        expect(restored.authorId).toBe(original.authorId);
        expect(restored.date).toBe(original.date);
        expect(restored.files).toEqual(original.files);
    });
});
