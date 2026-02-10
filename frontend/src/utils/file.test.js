/**
 * Tests unitaires — file.js (utilitaires fichier).
 *
 * Ces deux fonctions sont utilisées partout où on affiche des fichiers
 * (FileAttachmentPlugin, CommentsPanel). On vérifie que chaque catégorie
 * MIME produit la bonne icône et que le fallback fonctionne pour les cas
 * edge (null, type inconnu). Pour formatFileSize on teste les bornes
 * de chaque unité (B → KB → MB → GB).
 */
import { describe, it, expect } from 'vitest';
import { getFileIcon, formatFileSize } from './file.js';

// ---------------------------------------------------------------
// getFileIcon — chaque branche MIME doit retourner l'emoji attendu
// ---------------------------------------------------------------

describe('getFileIcon', () => {
    it('retourne 📄 pour application/pdf', () => {
        expect(getFileIcon('application/pdf')).toBe('\u{1F4C4}');
    });

    it('retourne 🖼️ pour les images', () => {
        expect(getFileIcon('image/png')).toBe('\u{1F5BC}\uFE0F');
        expect(getFileIcon('image/jpeg')).toBe('\u{1F5BC}\uFE0F');
        expect(getFileIcon('image/gif')).toBe('\u{1F5BC}\uFE0F');
        expect(getFileIcon('image/webp')).toBe('\u{1F5BC}\uFE0F');
    });

    it('retourne 🎬 pour les vidéos', () => {
        expect(getFileIcon('video/mp4')).toBe('\u{1F3AC}');
        expect(getFileIcon('video/webm')).toBe('\u{1F3AC}');
    });

    it('retourne 🎵 pour les audios', () => {
        expect(getFileIcon('audio/mpeg')).toBe('\u{1F3B5}');
        expect(getFileIcon('audio/ogg')).toBe('\u{1F3B5}');
    });

    it('retourne 📝 pour les textes', () => {
        expect(getFileIcon('text/plain')).toBe('\u{1F4DD}');
        expect(getFileIcon('text/html')).toBe('\u{1F4DD}');
        expect(getFileIcon('text/css')).toBe('\u{1F4DD}');
    });

    it('retourne 📊 pour les tableurs', () => {
        expect(getFileIcon('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('\u{1F4CA}');
        expect(getFileIcon('application/vnd.ms-excel')).toBe('\u{1F4CA}');
    });

    it('retourne 📽️ pour les présentations', () => {
        expect(getFileIcon('application/vnd.ms-powerpoint')).toBe('\u{1F4FD}\uFE0F');
        expect(getFileIcon('application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe(
            '\u{1F4FD}\uFE0F',
        );
    });

    it('retourne 📃 pour les documents word', () => {
        expect(getFileIcon('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(
            '\u{1F4C3}',
        );
        expect(getFileIcon('application/msword')).toBe('\u{1F4C3}');
    });

    it('retourne 📦 pour les archives', () => {
        expect(getFileIcon('application/zip')).toBe('\u{1F4E6}');
        expect(getFileIcon('application/x-rar-compressed')).toBe('\u{1F4E6}');
        expect(getFileIcon('application/gzip')).toBe('\u{1F4E6}');
    });

    it('retourne 📎 pour un type inconnu', () => {
        expect(getFileIcon('application/octet-stream')).toBe('\u{1F4CE}');
        expect(getFileIcon('unknown/type')).toBe('\u{1F4CE}');
    });

    it('retourne 📎 pour null ou undefined', () => {
        expect(getFileIcon(null)).toBe('\u{1F4CE}');
        expect(getFileIcon(undefined)).toBe('\u{1F4CE}');
        expect(getFileIcon('')).toBe('\u{1F4CE}');
    });
});

// ---------------------------------------------------------------
// formatFileSize — vérifie le choix d'unité et l'arrondi à chaque palier
// ---------------------------------------------------------------

describe('formatFileSize', () => {
    it('affiche 0 B pour zéro', () => {
        expect(formatFileSize(0)).toBe('0 B');
    });

    it('affiche en bytes pour les petites tailles', () => {
        expect(formatFileSize(512)).toBe('512 B');
        expect(formatFileSize(1)).toBe('1 B');
    });

    it('affiche en KB', () => {
        expect(formatFileSize(1024)).toBe('1.0 KB');
        expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('affiche en MB', () => {
        expect(formatFileSize(1048576)).toBe('1.0 MB');
        expect(formatFileSize(2621440)).toBe('2.5 MB');
    });

    it('affiche en GB', () => {
        expect(formatFileSize(1073741824)).toBe('1.0 GB');
    });
});
