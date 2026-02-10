/**
 * Tests unitaires — CardComments (collection de commentaires).
 *
 * CardComments est le conteneur qui gère le CRUD des Comment d'une carte.
 * On vérifie surtout :
 * - La construction depuis des données brutes (restauration IndexedDB)
 * - Que getAll retourne des instances Comment (pas des objets nus)
 * - Que updateText retourne l'ancien texte (nécessaire pour l'historique)
 * - L'isolation mémoire (getAll retourne une copie du tableau)
 */
import { describe, it, expect } from 'vitest';
import CardComments from './CardComments.js';
import Comment from './Comment.js';

// ---------------------------------------------------------------
// Helper
// ---------------------------------------------------------------

function makeRawComments() {
    return [
        { id: 'c-1', text: 'Premier', authorId: 'user-1', date: '2025-01-01T00:00:00.000Z' },
        { id: 'c-2', text: 'Deuxième', authorId: 'user-2', date: '2025-01-02T00:00:00.000Z' },
    ];
}

// ---------------------------------------------------------------
// Construction — null-safe, reconstruit des Comment depuis le JSON brut
// ---------------------------------------------------------------

describe('CardComments — construction', () => {
    it('initialise vide sans arguments', () => {
        const comments = new CardComments();
        expect(comments.getAll()).toHaveLength(0);
        expect(comments.count).toBe(0);
    });

    it('initialise vide avec null', () => {
        const comments = new CardComments(null);
        expect(comments.count).toBe(0);
    });

    it('restaure depuis des données brutes', () => {
        const comments = new CardComments(makeRawComments());
        expect(comments.count).toBe(2);
        expect(comments.getAll()[0]).toBeInstanceOf(Comment);
        expect(comments.getAll()[0].text).toBe('Premier');
    });
});

// ---------------------------------------------------------------
// getAll — copie défensive + vérification du type des éléments
// ---------------------------------------------------------------

describe('CardComments — getAll', () => {
    it('retourne une copie du tableau', () => {
        const comments = new CardComments(makeRawComments());
        const all1 = comments.getAll();
        all1.push('junk');
        expect(comments.getAll()).toHaveLength(2);
    });

    it('retourne des instances Comment', () => {
        const comments = new CardComments(makeRawComments());
        for (const c of comments.getAll()) {
            expect(c).toBeInstanceOf(Comment);
        }
    });
});

// ---------------------------------------------------------------
// add
// ---------------------------------------------------------------

describe('CardComments — add', () => {
    it('ajoute un commentaire', () => {
        const comments = new CardComments();
        const comment = new Comment({ text: 'Nouveau', authorId: 'user-1' });
        comments.add(comment);
        expect(comments.count).toBe(1);
        expect(comments.getAll()[0].text).toBe('Nouveau');
    });

    it('incrémente le count', () => {
        const comments = new CardComments(makeRawComments());
        expect(comments.count).toBe(2);
        comments.add(new Comment({ text: 'Trois' }));
        expect(comments.count).toBe(3);
    });
});

// ---------------------------------------------------------------
// findById
// ---------------------------------------------------------------

describe('CardComments — findById', () => {
    it('trouve un commentaire par id', () => {
        const comments = new CardComments(makeRawComments());
        const found = comments.findById('c-1');
        expect(found).toBeTruthy();
        expect(found.text).toBe('Premier');
    });

    it('retourne undefined si non trouvé', () => {
        const comments = new CardComments(makeRawComments());
        expect(comments.findById('c-999')).toBeUndefined();
    });
});

// ---------------------------------------------------------------
// updateText — retourne oldText pour que CardHistory puisse enregistrer le diff
// ---------------------------------------------------------------

describe('CardComments — updateText', () => {
    it("modifie le texte et retourne l'ancien", () => {
        const comments = new CardComments(makeRawComments());
        const result = comments.updateText('c-1', 'Modifié');
        expect(result).not.toBeNull();
        expect(result.oldText).toBe('Premier');
        expect(result.comment.text).toBe('Modifié');
    });

    it('le changement est visible via getAll', () => {
        const comments = new CardComments(makeRawComments());
        comments.updateText('c-1', 'Modifié');
        expect(comments.getAll()[0].text).toBe('Modifié');
    });

    it('retourne null si id non trouvé', () => {
        const comments = new CardComments(makeRawComments());
        expect(comments.updateText('c-999', 'Nope')).toBeNull();
    });

    it('ne modifie pas les autres commentaires', () => {
        const comments = new CardComments(makeRawComments());
        comments.updateText('c-1', 'Modifié');
        expect(comments.getAll()[1].text).toBe('Deuxième');
    });
});

// ---------------------------------------------------------------
// toJSON — round-trip pour la persistence IndexedDB
// ---------------------------------------------------------------

describe('CardComments — toJSON', () => {
    it('sérialise tous les commentaires', () => {
        const comments = new CardComments(makeRawComments());
        const json = comments.toJSON();
        expect(json).toHaveLength(2);
        expect(json[0].id).toBe('c-1');
        expect(json[1].id).toBe('c-2');
    });

    it('retourne un tableau vide si aucun commentaire', () => {
        expect(new CardComments().toJSON()).toEqual([]);
    });

    it('est compatible avec le constructeur (round-trip)', () => {
        const original = new CardComments(makeRawComments());
        original.add(new Comment({ id: 'c-3', text: 'Trois', authorId: 'user-3', date: '2025-01-03T00:00:00.000Z' }));
        const json = original.toJSON();
        const restored = new CardComments(json);
        expect(restored.count).toBe(3);
        expect(restored.getAll()[2].text).toBe('Trois');
    });
});
