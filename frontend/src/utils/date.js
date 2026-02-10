/**
 * date.js — Utilitaires de formatage de dates.
 *
 * Centralise tout le formatage de dates pour l'affichage (locale fr-FR).
 * Les fonctions prennent une string ISO 8601, sauf formatDuration (secondes).
 *
 * Ne concerne PAS les timestamps de persistance (new Date().toISOString())
 * qui restent dans les models/services/storage.
 */

/** Locale utilisée pour tous les formatages de dates. */
const LOCALE = 'fr-FR';

/**
 * Formate une date en format lisible court.
 *
 * @param {string} isoString - Date au format ISO 8601
 * @returns {string} Ex: "5 févr. 2025"
 */
export function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString(LOCALE, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

/**
 * Formate l'heure seule.
 *
 * @param {string} isoString - Date au format ISO 8601
 * @returns {string} Ex: "14:30"
 */
export function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString(LOCALE, {
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Formate une date complète avec heure.
 *
 * @param {string} isoString - Date au format ISO 8601
 * @returns {string} Ex: "5 févr. 2025 à 14:30"
 */
export function formatDateTime(isoString) {
    const date = new Date(isoString);
    const datePart = date.toLocaleDateString(LOCALE, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
    const timePart = date.toLocaleTimeString(LOCALE, {
        hour: '2-digit',
        minute: '2-digit',
    });
    return `${datePart} à ${timePart}`;
}

/**
 * Formate une date courte sans année, avec heure.
 * Utile pour les timestamps dans les listes (notes, images).
 *
 * @param {string} isoString - Date au format ISO 8601
 * @returns {string} Ex: "5 févr. 14:30"
 */
export function formatShortDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString(LOCALE, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Formate une date relative par rapport à maintenant.
 * Adapté pour les listes de boards (HomeView).
 *
 * Logique :
 *   - Aujourd'hui → "Aujourd'hui à 14:30"
 *   - Hier        → "Hier"
 *   - < 7 jours   → "Il y a 3 jours"
 *   - Plus vieux  → "5 févr." (+ année si différente)
 *
 * @param {string} isoString - Date au format ISO 8601
 * @returns {string}
 */
export function formatRelativeDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        const time = date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
        return `Aujourd'hui à ${time}`;
    } else if (diffDays === 1) {
        return 'Hier';
    } else if (diffDays < 7) {
        return `Il y a ${diffDays} jours`;
    } else {
        return date.toLocaleDateString(LOCALE, {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
    }
}

/**
 * Formate un temps écoulé très court (style "il y a X min").
 * Adapté pour les timestamps sur les cartes (DemoPlugin).
 *
 * Logique :
 *   - < 60s   → "à l'instant"
 *   - < 60min → "il y a X min"
 *   - < 24h   → "il y a X h"
 *   - >= 24h  → "il y a X j"
 *
 * @param {string} isoString - Date au format ISO 8601
 * @returns {string} Ex: "il y a 5 min"
 */
export function formatTimeAgo(isoString) {
    const now = Date.now();
    const then = new Date(isoString).getTime();
    const diffSeconds = Math.floor((now - then) / 1000);

    if (diffSeconds < 60) return "à l'instant";

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `il y a ${diffMinutes} min`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `il y a ${diffHours} h`;

    const diffDays = Math.floor(diffHours / 24);
    return `il y a ${diffDays} j`;
}

/**
 * Formate une durée en secondes au format "MM:SS".
 * Utilisé par PomodoroPlugin pour afficher le temps restant.
 *
 * @param {number} seconds - Nombre de secondes
 * @returns {string} Ex: "25:00"
 */
export function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Retourne la date courante au format ISO 8601.
 *
 * @returns {string} Ex: "2025-02-05T14:30:00.000Z"
 */
export function now() {
    return new Date().toISOString();
}
