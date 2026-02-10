/**
 * Tests unitaires — Card (modèle de carte).
 */
import { describe, it, expect, vi } from 'vitest';
import Card from './Card.js';
import Comment from './Comment.js';

// ---------------------------------------------------------------
// Helper
// ---------------------------------------------------------------

function makeCard(overrides = {}) {
    return new Card({
        id: 'card-1',
        title: 'Ma carte',
        description: 'Description',
        tags: { type: ['feature'], priority: ['high'] },
        ...overrides,
    });
}

// ---------------------------------------------------------------
// Construction
// ---------------------------------------------------------------

describe('Card — construction', () => {
    it('stocke les propriétés de base', () => {
        const card = makeCard();
        expect(card.id).toBe('card-1');
        expect(card.title).toBe('Ma carte');
        expect(card.description).toBe('Description');
        expect(card.assignee).toBeNull();
        expect(card.author).toBeNull();
        expect(card.type).toBe('standard');
    });

    it('génère createdAt si absent', () => {
        const card = makeCard();
        expect(card.createdAt).toBeTruthy();
        // Doit être une date ISO valide
        expect(new Date(card.createdAt).toISOString()).toBe(card.createdAt);
    });

    it('préserve createdAt si fourni', () => {
        const date = '2025-01-01T00:00:00.000Z';
        const card = makeCard({ createdAt: date });
        expect(card.createdAt).toBe(date);
    });

    it('crée une entrée d\'historique "created"', () => {
        const card = makeCard();
        expect(card.history).toHaveLength(1);
        expect(card.history[0].action).toBe('created');
    });

    it('accepte un type widget', () => {
        const card = makeCard({ type: 'widget:counter' });
        expect(card.type).toBe('widget:counter');
    });

    it('gère image null', () => {
        const card = makeCard({ image: null });
        expect(card.image).toBeNull();
        expect(card.imageId).toBeNull();
    });

    it("copie l'image à la construction", () => {
        const img = { id: 'img-1', url: '/test.png' };
        const card = makeCard({ image: img });
        expect(card.image).toEqual(img);
        expect(card.image).not.toBe(img); // copie
    });
});

// ---------------------------------------------------------------
// Tags — immutabilité
// ---------------------------------------------------------------

describe('Card — tags immutabilité', () => {
    it('retourne une copie profonde des tags', () => {
        const card = makeCard({ tags: { type: ['feature'] } });
        const tags1 = card.tags;
        tags1.type.push('bug');

        // La mutation externe ne doit pas affecter l'état interne
        expect(card.tags.type).toEqual(['feature']);
    });

    it('gère tags null/undefined → objet vide', () => {
        const card = makeCard({ tags: null });
        expect(card.tags).toEqual({});
    });

    it('gère tags undefined → objet vide', () => {
        const card = makeCard({ tags: undefined });
        expect(card.tags).toEqual({});
    });
});

// ---------------------------------------------------------------
// data — immutabilité
// ---------------------------------------------------------------

describe('Card — data', () => {
    it('retourne une copie de data', () => {
        const card = makeCard({ data: { count: 5 } });
        const d = card.data;
        d.count = 999;
        expect(card.data.count).toBe(5);
    });

    it('data est {} par défaut si null', () => {
        const card = makeCard({ data: null });
        expect(card.data).toEqual({});
    });
});

// ---------------------------------------------------------------
// update()
// ---------------------------------------------------------------

describe('Card — update', () => {
    it('met à jour titre et description', () => {
        const card = makeCard();
        card.update({ title: 'Nouveau', description: 'Desc2', tags: { type: ['bug'] } });

        expect(card.title).toBe('Nouveau');
        expect(card.description).toBe('Desc2');
        expect(card.tags).toEqual({ type: ['bug'] });
    });

    it('enregistre un historique "updated" avec le diff', () => {
        const card = makeCard();
        card.update({ title: 'Nouveau', description: 'Description', tags: { type: ['feature'], priority: ['high'] } });

        const entries = card.history;
        // created + updated
        expect(entries).toHaveLength(2);
        expect(entries[1].action).toBe('updated');
        expect(entries[1].changes.title).toEqual({ from: 'Ma carte', to: 'Nouveau' });
    });

    it("n'enregistre pas d'historique si rien ne change", () => {
        const card = makeCard();
        card.update({
            title: 'Ma carte',
            description: 'Description',
            tags: { type: ['feature'], priority: ['high'] },
        });

        expect(card.history).toHaveLength(1); // Juste "created"
    });

    it("détecte un changement d'assignee", () => {
        const card = makeCard({ assignee: null });
        card.update({
            title: 'Ma carte',
            description: 'Description',
            tags: { type: ['feature'], priority: ['high'] },
            assignee: 'user-1',
        });

        const last = card.history[card.history.length - 1];
        expect(last.action).toBe('updated');
        expect(last.changes.assignee).toEqual({ from: null, to: 'user-1' });
    });

    it('détecte un changement de tags', () => {
        const card = makeCard({ tags: { type: ['feature'] } });
        card.update({
            title: 'Ma carte',
            description: 'Description',
            tags: { type: ['bug'] },
        });

        const last = card.history[card.history.length - 1];
        expect(last.changes.tags).toBeDefined();
        expect(last.changes.tags.to).toEqual({ type: ['bug'] });
    });
});

// ---------------------------------------------------------------
// updateData()
// ---------------------------------------------------------------

describe('Card — updateData', () => {
    it('merge les données existantes', () => {
        const card = makeCard({ data: { count: 5 } });
        card.updateData({ label: 'test' });
        expect(card.data).toEqual({ count: 5, label: 'test' });
    });

    it('écrase une clé existante', () => {
        const card = makeCard({ data: { count: 5 } });
        card.updateData({ count: 10 });
        expect(card.data.count).toBe(10);
    });
});

// ---------------------------------------------------------------
// image setter
// ---------------------------------------------------------------

describe('Card — image', () => {
    it('set image stocke une copie', () => {
        const card = makeCard();
        const img = { id: 'img-2' };
        card.image = img;

        expect(card.image).toEqual({ id: 'img-2' });
        expect(card.image).not.toBe(img);
    });

    it('set image null', () => {
        const card = makeCard({ image: { id: 'img-1' } });
        card.image = null;
        expect(card.image).toBeNull();
        expect(card.imageId).toBeNull();
    });

    it("imageId retourne l'id de l'image", () => {
        const card = makeCard({ image: { id: 'img-1' } });
        expect(card.imageId).toBe('img-1');
    });
});

// ---------------------------------------------------------------
// recordMove / recordReorder
// ---------------------------------------------------------------

describe('Card — déplacements', () => {
    it('recordMove ajoute une entrée "moved"', () => {
        const card = makeCard();
        card.recordMove('Todo', 'Done', 'user-1');

        const last = card.history[card.history.length - 1];
        expect(last.action).toBe('moved');
        expect(last.changes.column).toEqual({ from: 'Todo', to: 'Done' });
    });

    it('recordReorder ajoute une entrée "reordered"', () => {
        const card = makeCard();
        card.recordReorder('Todo', 0, 2, 'user-1');

        const last = card.history[card.history.length - 1];
        expect(last.action).toBe('reordered');
        // Les positions sont 1-indexed dans l'historique
        expect(last.changes.position).toEqual({ from: 1, to: 3 });
    });
});

// ---------------------------------------------------------------
// Comments
// ---------------------------------------------------------------

describe('Card — commentaires', () => {
    it('addComment ajoute un commentaire et un historique', () => {
        const card = makeCard();
        const comment = new Comment({ text: 'Super', authorId: 'user-1' });
        card.addComment(comment);

        expect(card.comments).toHaveLength(1);
        expect(card.comments[0].text).toBe('Super');

        const last = card.history[card.history.length - 1];
        expect(last.action).toBe('commented');
    });

    it("updateComment modifie le texte et enregistre l'historique", () => {
        const card = makeCard();
        const comment = new Comment({ id: 'c-1', text: 'Ancien' });
        card.addComment(comment);
        card.updateComment('c-1', 'Nouveau', 'user-1');

        expect(card.comments[0].text).toBe('Nouveau');

        const last = card.history[card.history.length - 1];
        expect(last.action).toBe('comment_edited');
        expect(last.changes.comment).toEqual({ from: 'Ancien', to: 'Nouveau' });
    });
});

// ---------------------------------------------------------------
// toJSON — round-trip
// ---------------------------------------------------------------

describe('Card — toJSON', () => {
    it('sérialise et peut reconstruire une carte', () => {
        const card = makeCard({
            assignee: 'user-1',
            author: 'user-2',
            image: { id: 'img-1' },
            data: { count: 5 },
        });
        const json = card.toJSON();
        const card2 = new Card(json);

        expect(card2.id).toBe(card.id);
        expect(card2.title).toBe(card.title);
        expect(card2.description).toBe(card.description);
        expect(card2.tags).toEqual(card.tags);
        expect(card2.assignee).toBe(card.assignee);
        expect(card2.author).toBe(card.author);
        expect(card2.type).toBe(card.type);
        expect(card2.data).toEqual(card.data);
        expect(card2.imageId).toBe(card.imageId);
    });
});
