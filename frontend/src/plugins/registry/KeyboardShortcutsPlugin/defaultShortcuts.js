/**
 * defaultShortcuts.js — Définition déclarative des raccourcis clavier par défaut.
 *
 * Chaque raccourci est un objet avec :
 *   - id         : identifiant unique (clé dans la Map)
 *   - label      : nom affiché dans le panneau de réglages
 *   - defaultKey : touche par défaut (format normalisé : "alt+n", "escape", etc.)
 *   - action     : fonction exécutée quand le raccourci est activé
 *   - guard      : (optionnel) condition pour activer le raccourci (retourne boolean)
 *
 * Les actions sont autonomes (imports directs, accès DOM).
 * Pour ajouter un raccourci, ajouter un objet au tableau et c'est tout.
 */
import Application from '../../../Application.js';
import Router from '../../../services/Router.js';
import BoardService from '../../../services/BoardService.js';
import FilterStore from '../../../services/FilterStore.js';
import ModalAddCard from '../../../views/ModalAddCard.js';
import ModalBoardSettings from '../../../views/ModalBoardSettings.js';

// =========================================================
// Helpers
// =========================================================

/**
 * Ferme la modale/overlay la plus récente en cliquant son bouton close.
 * Pas de couplage avec BaseModal — on passe par le DOM.
 *
 * @returns {boolean} `true` si une modale a été fermée
 */
function closeTopModal() {
    const overlays = document.querySelectorAll('.modal-overlay, .card-detail-overlay');
    if (overlays.length === 0) return false;

    const topmost = overlays[overlays.length - 1];
    const closeBtn = topmost.querySelector('.modal-close-btn, .card-detail-close');
    if (closeBtn) closeBtn.click();
    return true;
}

/**
 * Vérifie si un board est actif.
 *
 * @returns {boolean}
 */
function hasActiveBoard() {
    return !!Application.instance?.currentBoard;
}

/**
 * Vérifie si une modale est déjà ouverte.
 *
 * @returns {boolean}
 */
function hasOpenModal() {
    return document.querySelectorAll('.modal-overlay, .card-detail-overlay').length > 0;
}

// =========================================================
// Raccourcis par défaut
// =========================================================

/** @type {Array<{id: string, label: string, defaultKey: string, action: () => void, guard?: () => boolean}>} */
export const DEFAULT_SHORTCUTS = [
    {
        id: 'closeModal',
        label: 'Fermer la modale',
        defaultKey: 'escape',
        action: () => closeTopModal(),
        guard: () => {
            // Skip si la palette de commandes est ouverte
            if (document.querySelector('.cp-overlay--visible')) return false;
            // Skip si aucune modale n'est présente
            const overlays = document.querySelectorAll('.modal-overlay, .card-detail-overlay');
            return overlays.length > 0;
        },
    },
    {
        id: 'newCard',
        label: 'Nouvelle carte',
        defaultKey: 'alt+n',
        action: () => {
            const board = Application.instance?.currentBoard;
            if (!board) return;
            const modal = new ModalAddCard(
                (cardData) => {
                    if (cardData.columnId) {
                        BoardService.addCard(cardData.columnId, cardData);
                    }
                },
                { columns: board.columns },
            );
            modal.open();
        },
        guard: () => hasActiveBoard() && !hasOpenModal(),
    },
    {
        id: 'goHome',
        label: 'Retour accueil',
        defaultKey: 'alt+h',
        action: () => Router.navigate('/'),
    },
    {
        id: 'boardSettings',
        label: 'Paramètres du board',
        defaultKey: 'alt+,',
        action: () => {
            const board = Application.instance?.currentBoard;
            if (!board) return;
            const modal = new ModalBoardSettings(board);
            modal.open();
        },
        guard: () => hasActiveBoard() && !hasOpenModal(),
    },
    {
        id: 'resetFilters',
        label: 'Réinitialiser filtres',
        defaultKey: 'alt+r',
        action: () => FilterStore.reset(),
        guard: () => hasActiveBoard(),
    },
];
