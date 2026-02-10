/**
 * Tests unitaires — color.js (utilitaires couleur).
 *
 * hexToRgb est le coeur du calcul couleur (bitwise sur un entier 24 bits).
 * On teste les extremes (noir, blanc), les canaux isolés (rouge/vert/bleu)
 * et une couleur arbitraire pour vérifier le calcul intermédiaire.
 * hexToRgba est un wrapper simple mais on vérifie les bornes d'alpha.
 */
import { describe, it, expect } from 'vitest';
import { hexToRgb, hexToRgba } from './color.js';

// ---------------------------------------------------------------
// hexToRgb — extraction des canaux R, G, B depuis un hex #rrggbb
// ---------------------------------------------------------------

describe('hexToRgb', () => {
    it('convertit #000000 en noir', () => {
        expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('convertit #ffffff en blanc', () => {
        expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('convertit #ff0000 en rouge pur', () => {
        expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('convertit #00ff00 en vert pur', () => {
        expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('convertit #0000ff en bleu pur', () => {
        expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('convertit une couleur arbitraire (#3a7bff)', () => {
        expect(hexToRgb('#3a7bff')).toEqual({ r: 58, g: 123, b: 255 });
    });

    it('gère les majuscules (#FF8800)', () => {
        expect(hexToRgb('#FF8800')).toEqual({ r: 255, g: 136, b: 0 });
    });
});

// ---------------------------------------------------------------
// hexToRgba — vérifie le format de sortie "rgba(r, g, b, alpha)"
// ---------------------------------------------------------------

describe('hexToRgba', () => {
    it('génère une string rgba avec alpha', () => {
        expect(hexToRgba('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('alpha 0 = transparent', () => {
        expect(hexToRgba('#000000', 0)).toBe('rgba(0, 0, 0, 0)');
    });

    it('alpha 1 = opaque', () => {
        expect(hexToRgba('#3a7bff', 1)).toBe('rgba(58, 123, 255, 1)');
    });

    it('alpha décimal', () => {
        expect(hexToRgba('#ffffff', 0.2)).toBe('rgba(255, 255, 255, 0.2)');
    });
});
