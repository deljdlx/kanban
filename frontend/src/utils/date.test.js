/**
 * Tests unitaires — date.js (utilitaires de formatage de dates).
 *
 * Stratégie : les fonctions locale-dépendantes (formatDate, formatTime, etc.)
 * utilisent toLocaleDateString('fr-FR'). Le formatage exact varie selon
 * l'implémentation ICU de l'environnement, donc on vérifie la structure
 * (contient l'année, contient "à", contient ":") plutôt que la string exacte.
 *
 * Les fonctions indépendantes de la locale (formatDuration, now) et les
 * fonctions relatives (formatTimeAgo, formatRelativeDate) sont testées
 * avec des valeurs exactes car leur sortie est déterministe.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    formatDate,
    formatTime,
    formatDateTime,
    formatShortDateTime,
    formatRelativeDate,
    formatTimeAgo,
    formatDuration,
    now,
} from './date.js';

// ---------------------------------------------------------------
// formatDuration — padding MM:SS, utilisé par PomodoroPlugin
// ---------------------------------------------------------------

describe('formatDuration', () => {
    it('formate 0 secondes en 00:00', () => {
        expect(formatDuration(0)).toBe('00:00');
    });

    it('formate 90 secondes en 01:30', () => {
        expect(formatDuration(90)).toBe('01:30');
    });

    it('formate 25 minutes en 25:00', () => {
        expect(formatDuration(25 * 60)).toBe('25:00');
    });

    it('formate 5 secondes en 00:05 (padding)', () => {
        expect(formatDuration(5)).toBe('00:05');
    });

    it('formate 599 secondes en 09:59', () => {
        expect(formatDuration(599)).toBe('09:59');
    });
});

// ---------------------------------------------------------------
// now — wrapper ISO, vérifie la validité et la fraîcheur
// ---------------------------------------------------------------

describe('now', () => {
    it('retourne une date ISO 8601 valide', () => {
        const result = now();
        expect(new Date(result).toISOString()).toBe(result);
    });

    it('retourne une date proche de Date.now()', () => {
        const before = Date.now();
        const result = new Date(now()).getTime();
        const after = Date.now();
        expect(result).toBeGreaterThanOrEqual(before);
        expect(result).toBeLessThanOrEqual(after);
    });
});

// ---------------------------------------------------------------
// formatDate — locale-dépendant, on vérifie juste la structure
// ---------------------------------------------------------------

describe('formatDate', () => {
    it('retourne une string non vide', () => {
        const result = formatDate('2025-06-15T10:30:00.000Z');
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
    });

    it("contient l'année", () => {
        const result = formatDate('2025-06-15T10:30:00.000Z');
        expect(result).toContain('2025');
    });
});

// ---------------------------------------------------------------
// formatTime
// ---------------------------------------------------------------

describe('formatTime', () => {
    it('retourne une string avec un séparateur heure:minute', () => {
        const result = formatTime('2025-06-15T14:30:00.000Z');
        expect(result).toBeTruthy();
        // Le format fr-FR utilise ":" comme séparateur
        expect(result).toContain(':');
    });
});

// ---------------------------------------------------------------
// formatDateTime
// ---------------------------------------------------------------

describe('formatDateTime', () => {
    it('contient le mot "à" (séparateur fr-FR date/heure)', () => {
        const result = formatDateTime('2025-06-15T14:30:00.000Z');
        expect(result).toContain('à');
    });

    it("contient l'année et un séparateur heure", () => {
        const result = formatDateTime('2025-06-15T14:30:00.000Z');
        expect(result).toContain('2025');
        expect(result).toContain(':');
    });
});

// ---------------------------------------------------------------
// formatShortDateTime
// ---------------------------------------------------------------

describe('formatShortDateTime', () => {
    it('retourne une string non vide', () => {
        const result = formatShortDateTime('2025-06-15T14:30:00.000Z');
        expect(result).toBeTruthy();
    });
});

// ---------------------------------------------------------------
// formatTimeAgo — chaque palier temporel (<60s, <60m, <24h, >=24h)
// ---------------------------------------------------------------

describe('formatTimeAgo', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('retourne "à l\'instant" pour < 60s', () => {
        const recent = new Date(Date.now() - 10 * 1000).toISOString();
        expect(formatTimeAgo(recent)).toBe("à l'instant");
    });

    it('retourne "il y a X min" pour < 60 min', () => {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        expect(formatTimeAgo(fiveMinAgo)).toBe('il y a 5 min');
    });

    it('retourne "il y a X h" pour < 24h', () => {
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
        expect(formatTimeAgo(threeHoursAgo)).toBe('il y a 3 h');
    });

    it('retourne "il y a X j" pour >= 24h', () => {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
        expect(formatTimeAgo(twoDaysAgo)).toBe('il y a 2 j');
    });
});

// ---------------------------------------------------------------
// formatRelativeDate — logique conditionnelle : aujourd'hui, hier, <7j, >=7j
// ---------------------------------------------------------------

describe('formatRelativeDate', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('retourne "Aujourd\'hui à HH:MM" pour aujourd\'hui', () => {
        const recent = new Date(Date.now() - 60 * 1000).toISOString();
        const result = formatRelativeDate(recent);
        expect(result).toMatch(/^Aujourd'hui à \d{2}:\d{2}$/);
    });

    it('retourne "Hier" pour hier', () => {
        const yesterday = new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString();
        const result = formatRelativeDate(yesterday);
        expect(result).toBe('Hier');
    });

    it('retourne "Il y a X jours" pour 2-6 jours', () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const result = formatRelativeDate(threeDaysAgo);
        expect(result).toBe('Il y a 3 jours');
    });

    it('retourne une date formatée pour >= 7 jours', () => {
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const result = formatRelativeDate(twoWeeksAgo);
        // Ne doit plus être un format relatif
        expect(result).not.toContain('Il y a');
        expect(result).not.toContain("Aujourd'hui");
        expect(result).toBeTruthy();
    });
});
